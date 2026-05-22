// 会话状态 — 移植自 desktop/src/App.tsx 的 reduce / applyIncoming
import { defineStore } from "pinia"
import { ref } from "vue"
import type {
  IncomingEvent,
  OutgoingCommand,
  PlanStep,
} from "../../../main/protocol"

// ChatMessage 类型定义（来自 desktop/src/App.tsx）
export type AssistantSegment =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "tool_args"; text: string }
  | { kind: "tool"; callId: string; name: string; args: string; result?: string; ok?: boolean; startedAt?: number; durationMs?: number }

export type ChatMessage =
  | { kind: "user"; text: string; clientId: string; turn: number }
  | { kind: "assistant"; turn: number; segments: AssistantSegment[]; pending: boolean }
  | { kind: "status"; text: string }
  | { kind: "error"; message: string }

export interface UsageStats {
  totalCostUsd: number
  totalPromptTokens: number
  totalCompletionTokens: number
  cacheHitTokens: number
  cacheMissTokens: number
  lastCallCacheHit: number | null
  lastCallCacheMiss: number | null
  reservedTokens: number
}

/** 当前会话中 agent 读取/修改过的文件 */
export type SessionFile = {
  path: string
  /** "c": 拉入上下文 (read_file). "m": 被修改 (edit_file / write_file / multi_edit). */
  status: "c" | "m"
}

// ─── 审批工作流类型 ───
export type PendingConfirm = {
  id: number
  kind: "run_command" | "run_background"
  command: string
}

export type PendingPathAccess = {
  id: number
  path: string
  intent: "read" | "write"
  toolName: string
  sandboxRoot: string
  allowPrefix: string
}

export type PendingChoice = {
  id: number
  question: string
  options: { id: string; title: string; summary?: string }[]
  allowCustom: boolean
}

export type PendingPlan = {
  id: number
  plan: string
  summary?: string
  steps?: PlanStep[]
}

export type ActivePlan = {
  plan: string
  summary?: string
  steps: PlanStep[]
  completedStepIds: string[]
  stepResults: Record<string, string>
}

export type PendingCheckpoint = {
  id: number
  stepId: string
  title?: string
  result: string
  notes?: string
  completed: number
  total: number
}

export type PendingRevision = {
  id: number
  reason: string
  remainingSteps: PlanStep[]
  summary?: string
}

export const useSessionStore = defineStore("session", () => {
  // ─── 状态 ───
  const messages = ref<ChatMessage[]>([])
  const activeTabId = ref("")
  const currentSession = ref("")
  const usageStats = ref<UsageStats>({
    totalCostUsd: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    lastCallCacheHit: null,
    lastCallCacheMiss: null,
    reservedTokens: 0,
  })

    // RPC 就绪状态
  const rpcReady = ref(false)
  // 重置 RPC 状态（子进程退出时）
  function resetRpc() {
    rpcReady.value = false
  }

  // ─── 启动 RPC ───
  async function spawnRpc() {
    if (!window.api) {
      console.warn("[renderer] window.api not available — preload not injected?")
      return
    }
    try {
      await window.api.rpc.spawn()
      rpcReady.value = true
      console.log("[renderer] RPC spawned")
      // 发送 desktop_resync 拉取初始状态
      await window.api.rpc.send(JSON.stringify({ cmd: "desktop_resync" }))
    } catch (err) {
      console.error("[renderer] RPC spawn failed:", err)
    }
  }

  // ─── 忙碌状态 ───
  const busy = ref(false)
  // ─── 排队消息（忙碌时输入暂存）───
  const queuedSends = ref<string[]>([])

  // ─── @-mention 状态 ───
  const mentionResults = ref<{ nonce: number; query: string; results: string[] } | null>(null)
  const mentionPreview = ref<{ nonce: number; path: string; head: string; totalLines: number } | null>(null)

  // ─── 审批工作流状态 ───
  const pendingConfirms = ref<PendingConfirm[]>([])
  const pendingPathAccess = ref<PendingPathAccess | null>(null)
  const pendingChoice = ref<PendingChoice | null>(null)
  const pendingPlan = ref<PendingPlan | null>(null)
  const pendingCheckpoint = ref<PendingCheckpoint | null>(null)
  const pendingRevision = ref<PendingRevision | null>(null)
  /** 当前正在执行的活动计划（非待审批，已批准后展示进度） */
  const activePlan = ref<ActivePlan | null>(null)

  /** 当前会话中 agent 读取/修改过的文件列表 */
  const sessionFiles = ref<SessionFile[]>([])

  // ─── 中止当前对话 ───
  function abort() {
    // 有审批待处理时发送 reject
    if (pendingPlan.value) {
      sendCommand({ cmd: "plan_response", id: pendingPlan.value.id, response: { type: "cancel", feedback: "用户中止" } })
      pendingPlan.value = null
    }
    if (pendingCheckpoint.value) {
      sendCommand({ cmd: "checkpoint_response", id: pendingCheckpoint.value.id, response: { type: "stop" } })
      pendingCheckpoint.value = null
    }
    if (pendingRevision.value) {
      sendCommand({ cmd: "revision_response", id: pendingRevision.value.id, response: { type: "rejected" } })
      pendingRevision.value = null
    }
    if (pendingChoice.value) {
      sendCommand({ cmd: "choice_response", id: pendingChoice.value.id, response: { type: "cancel" } })
      pendingChoice.value = null
    }
    if (pendingPathAccess.value) {
      sendCommand({ cmd: "confirm_response", id: pendingPathAccess.value.id, response: { type: "deny" } })
      pendingPathAccess.value = null
    }
    if (pendingConfirms.value.length > 0) {
      for (const c of pendingConfirms.value) {
        sendCommand({ cmd: "confirm_response", id: c.id, response: { type: "deny" } })
      }
      pendingConfirms.value = []
    }
    sendCommand({ cmd: "abort" })
  }

  // ─── Verdect 发送方法 ───
  /** 批准 shell 命令执行 */
  function approveConfirm(id: number) {
    sendCommand({ cmd: "confirm_response", id, response: { type: "run_once" } })
    pendingConfirms.value = pendingConfirms.value.filter((c) => c.id !== id)
  }
  /** 拒绝 shell 命令执行 */
  function rejectConfirm(id: number) {
    sendCommand({ cmd: "confirm_response", id, response: { type: "deny" } })
    pendingConfirms.value = pendingConfirms.value.filter((c) => c.id !== id)
  }
  /** 始终允许该前缀的 shell 命令 */
  function alwaysAllowConfirm(id: number, prefix: string) {
    sendCommand({ cmd: "confirm_response", id, response: { type: "always_allow", prefix } })
    pendingConfirms.value = pendingConfirms.value.filter((c) => c.id !== id)
  }

  /** 批准路径访问 */
  function approvePathAccess(id: number) {
    sendCommand({ cmd: "confirm_response", id, response: { type: "run_once" } })
    pendingPathAccess.value = null
  }
  /** 拒绝路径访问 */
  function rejectPathAccess(id: number) {
    sendCommand({ cmd: "confirm_response", id, response: { type: "deny" } })
    pendingPathAccess.value = null
  }
  /** 始终允许该前缀的路径访问 */
  function alwaysAllowPathAccess(id: number, prefix: string) {
    sendCommand({ cmd: "confirm_response", id, response: { type: "always_allow", prefix } })
    pendingPathAccess.value = null
  }

  /** 选择一个选项 */
  function pickChoice(id: number, optionId: string) {
    sendCommand({ cmd: "choice_response", id, response: { type: "pick", optionId } })
    pendingChoice.value = null
  }
  /** 取消选择 */
  function cancelChoice(id: number) {
    sendCommand({ cmd: "choice_response", id, response: { type: "cancel" } })
    pendingChoice.value = null
  }

  /** 批准计划 — 批准后转为活动计划 */
  function approvePlan(id: number, feedback?: string) {
    const plan = pendingPlan.value
    if (plan) {
      activePlan.value = {
        plan: plan.plan,
        summary: plan.summary,
        steps: plan.steps ?? [],
        completedStepIds: [],
        stepResults: {},
      }
    }
    sendCommand({ cmd: "plan_response", id, response: { type: "approve", feedback } })
    pendingPlan.value = null
  }
  /** 要求修改计划 */
  function refinePlan(id: number, feedback?: string) {
    sendCommand({ cmd: "plan_response", id, response: { type: "refine", feedback } })
    pendingPlan.value = null
  }
  /** 取消计划 */
  function cancelPlan(id: number, feedback?: string) {
    sendCommand({ cmd: "plan_response", id, response: { type: "cancel", feedback } })
    pendingPlan.value = null
  }

  /** 继续执行（检查点） */
  function continueCheckpoint(id: number) {
    sendCommand({ cmd: "checkpoint_response", id, response: { type: "continue" } })
    pendingCheckpoint.value = null
  }
  /** 修改（检查点） */
  function reviseCheckpoint(id: number, feedback?: string) {
    sendCommand({ cmd: "checkpoint_response", id, response: { type: "revise", feedback } })
    pendingCheckpoint.value = null
  }
  /** 停止（检查点） */
  function stopCheckpoint(id: number) {
    sendCommand({ cmd: "checkpoint_response", id, response: { type: "stop" } })
    pendingCheckpoint.value = null
  }

  /** 接受修改方案 */
  function acceptRevision(id: number) {
    sendCommand({ cmd: "revision_response", id, response: { type: "accepted" } })
    pendingRevision.value = null
  }
  /** 拒绝修改方案 */
  function rejectRevision(id: number) {
    sendCommand({ cmd: "revision_response", id, response: { type: "rejected" } })
    pendingRevision.value = null
  }

  // ─── SessionFiles 追踪 ───

  const READING_TOOLS = new Set(["read_file"])
  const MODIFYING_TOOLS = new Set(["edit_file", "write_file", "multi_edit"])

  function extractToolFiles(name: string, args: string): SessionFile[] {
    try {
      const parsed = JSON.parse(args) as { path?: unknown; edits?: unknown }
      if (READING_TOOLS.has(name) && typeof parsed?.path === "string") {
        return [{ path: parsed.path, status: "c" }]
      }
      if (MODIFYING_TOOLS.has(name)) {
        // multi_edit 可能在 edits 数组中有多个 path
        if (name === "multi_edit" && Array.isArray(parsed?.edits)) {
          return parsed.edits
            .filter((e: Record<string, unknown>) => typeof e.path === "string")
            .map((e: Record<string, unknown>) => ({ path: e.path as string, status: "m" as const }))
        }
        if (typeof parsed?.path === "string") {
          return [{ path: parsed.path, status: "m" }]
        }
      }
    } catch {
      // args 不是有效 JSON，跳过
    }
    return []
  }

  function mergeSessionFiles(existing: SessionFile[], adds: SessionFile[]): SessionFile[] {
    if (adds.length === 0) return existing
    const next = [...existing]
    const indexByPath = new Map<string, number>()
    next.forEach((f, i) => indexByPath.set(f.path, i))
    let changed = false
    for (const add of adds) {
      const idx = indexByPath.get(add.path)
      if (idx !== undefined) {
        // 已存在：如果新增是 "m" (修改)，升级状态
        if (add.status === "m" && next[idx]!.status === "c") {
          next[idx] = { ...next[idx]!, status: "m" }
          changed = true
        }
      } else {
        next.push(add)
        indexByPath.set(add.path, next.length - 1)
        changed = true
      }
    }
    return changed ? next : existing
  }

  // ─── 发送命令到主进程 ───
  function sendCommand(cmd: OutgoingCommand) {
    if (!rpcReady.value) {
      console.warn("[renderer] RPC not ready, ignoring:", cmd.cmd)
      return
    }
    const line = JSON.stringify({ tabId: activeTabId.value, ...cmd })
    window.api?.rpc.send(line).catch((err) => console.error(`${cmd.cmd} failed`, err))
  }

  // ─── 处理事件 ───
  function handleEvent(event: IncomingEvent) {
    switch (event.type) {
      case "$turn_complete":
        busy.value = false
        queuedSends.value = []
        break

      case "user.message":
        busy.value = true
        // 去重：乐观添加的 user 消息已经有了相同文本，跳过 CLI 回声
        const hasText = messages.value.some(
          (m) => m.kind === "user" && m.text === event.text,
        )
        if (!hasText) {
          messages.value.push({
            kind: "user",
            text: event.text,
            clientId: String(event.id),
            turn: event.turn,
          })
        }
        break

      case "model.turn.started":
        busy.value = true
        messages.value.push({
          kind: "assistant",
          turn: event.turn,
          segments: [],
          pending: true,
        })
        break

      case "model.delta":
        // 按 turn 匹配（同源码），仅处理 content / reasoning
        if (event.channel !== "content" && event.channel !== "reasoning") break
        const dIdx = messages.value.findIndex(
          (m) => m.kind === "assistant" && m.turn === event.turn
        )
        if (dIdx < 0) break
        const dMsg = messages.value[dIdx]
        if (dMsg.kind !== "assistant") break
        const dKind = event.channel === "content" ? "text" : "reasoning"
        const dLast = dMsg.segments[dMsg.segments.length - 1]
        if (dLast?.kind === dKind) {
          ;(dLast as any).text += event.text
        } else {
          dMsg.segments.push({ kind: dKind, text: event.text })
        }
        break

      case "model.final":
        // 按 turn 匹配（同源码），用完整内容替换流式 delta 可能不完整的片段
        const fIdx = messages.value.findIndex(
          (m) => m.kind === "assistant" && m.turn === event.turn
        )
        if (fIdx < 0) break
        const fMsg = messages.value[fIdx]
        if (fMsg.kind !== "assistant") break
        fMsg.pending = false
        if (event.content) {
          const textIdx = fMsg.segments.findIndex((s) => s.kind === "text")
          if (textIdx >= 0) {
            fMsg.segments[textIdx] = { kind: "text", text: event.content }
          } else {
            fMsg.segments.push({ kind: "text", text: event.content })
          }
        }
        if (event.reasoningContent) {
          const reasonIdx = fMsg.segments.findIndex((s) => s.kind === "reasoning")
          if (reasonIdx >= 0) {
            fMsg.segments[reasonIdx] = { kind: "reasoning", text: event.reasoningContent }
          } else {
            fMsg.segments.push({ kind: "reasoning", text: event.reasoningContent })
          }
        }
        break

      case "tool.preparing":
        const pIdx2 = messages.value.findIndex(
          (m) => m.kind === "assistant" && m.turn === event.turn
        )
        if (pIdx2 < 0) break
        const pMsg = messages.value[pIdx2]
        if (pMsg.kind !== "assistant") break
        if (pMsg.segments.some((s) => s.kind === "tool" && s.callId === event.callId)) break
        pMsg.segments.push({
          kind: "tool",
          callId: event.callId,
          name: event.name,
          args: "",
          startedAt: Date.now(),
        })
        break

      case "tool.intent":
        // 更新 tool 参数 + 追踪 session 文件
        const iIdx = messages.value.findIndex(
          (m) => m.kind === "assistant" && m.turn === event.turn
        )
        if (iIdx >= 0) {
          const iMsg = messages.value[iIdx]
          if (iMsg.kind === "assistant") {
            const seg = iMsg.segments.find(
              (s) => s.kind === "tool" && s.callId === event.callId,
            )
            if (seg?.kind === "tool") {
              seg.args = event.args
            }
          }
        }
        // 跟踪读取/修改的文件
        sessionFiles.value = mergeSessionFiles(
          sessionFiles.value,
          extractToolFiles(event.name, event.args),
        )
        break

      case "tool.result":
        // 遍历所有 assistant 消息匹配 callId（同源码：不限定 turn）
        for (const rMsg of messages.value) {
          if (rMsg.kind !== "assistant") continue
          const seg = rMsg.segments.find(
            (s) => s.kind === "tool" && s.callId === event.callId,
          )
          if (seg?.kind === "tool") {
            seg.result = event.output
            seg.ok = event.ok
            if (seg.startedAt) {
              seg.durationMs = Date.now() - seg.startedAt
            }
          }
        }
        break

      case "$session_loaded":
        busy.value = false
        currentSession.value = event.name
        clearApprovals()
        messages.value = []
        // 从加载的消息中重建 sessionFiles
        const loadedFiles: SessionFile[] = []
        for (const m of event.messages) {
          if (m.kind === "assistant") {
            for (const s of m.segments) {
              if (s.kind === "tool") {
                const adds = extractToolFiles(s.name, s.args)
                for (const a of adds) loadedFiles.push(a)
              }
            }
          }
        }
        sessionFiles.value = loadedFiles.reduce(
          (acc, f) => mergeSessionFiles(acc, [f]),
          [] as SessionFile[],
        )
        // 恢复用量
        if (event.carryover) {
          usageStats.value.totalCostUsd = event.carryover.totalCostUsd
          usageStats.value.cacheHitTokens = event.carryover.cacheHitTokens
          usageStats.value.cacheMissTokens = event.carryover.cacheMissTokens
        }
        for (const m of event.messages) {
          if (m.kind === "user") {
            messages.value.push({ kind: "user", text: m.text, clientId: "loaded", turn: 0 })
          } else if (m.kind === "assistant") {
            const segments = m.segments.map((s: any) => {
              if (s.kind === "tool") return { kind: "tool" as const, callId: s.callId || "", name: s.name || "", args: s.args || "", result: s.result, ok: s.ok, durationMs: s.durationMs }
              if (s.kind === "text" || s.kind === "reasoning") return { kind: s.kind, text: s.text }
              return { kind: "text" as const, text: "" }
            })
            messages.value.push({ kind: "assistant", turn: m.turn || 0, segments, pending: false })
          }
        }
        break

      case "$mention_results":
        mentionResults.value = { nonce: event.nonce, query: event.query, results: event.results }
        break

      case "$mention_preview":
        mentionPreview.value = { nonce: event.nonce, path: event.path, head: event.head, totalLines: event.totalLines }
        break

      // ═══ 审批工作流事件 ═══

      case "$confirm_required":
        pendingConfirms.value.push({
          id: event.id,
          kind: event.kind,
          command: event.command,
        })
        break

      case "$path_access_required":
        pendingPathAccess.value = {
          id: event.id,
          path: event.path,
          intent: event.intent,
          toolName: event.toolName,
          sandboxRoot: event.sandboxRoot,
          allowPrefix: event.allowPrefix,
        }
        break

      case "$choice_required":
        pendingChoice.value = {
          id: event.id,
          question: event.question,
          options: event.options,
          allowCustom: event.allowCustom,
        }
        break

      case "$plan_required":
        pendingPlan.value = {
          id: event.id,
          plan: event.plan,
          summary: event.summary,
          steps: (event.steps ?? []) as PlanStep[],
        }
        // 同时将 busy 置为 false 以允许用户在输入框操作
        busy.value = false
        break

      case "$checkpoint_required":
        pendingCheckpoint.value = {
          id: event.id,
          stepId: event.stepId,
          title: event.title,
          result: event.result,
          notes: event.notes,
          completed: event.completed,
          total: event.total,
        }
        break

      case "$revision_required":
        pendingRevision.value = {
          id: event.id,
          reason: event.reason,
          remainingSteps: event.remainingSteps,
          summary: event.summary,
        }
        break

      case "$step_completed": {
        // 更新活动计划的步骤完成状态
        const plan = activePlan.value
        if (plan) {
          if (!plan.completedStepIds.includes(event.stepId)) {
            plan.completedStepIds.push(event.stepId)
          }
          if (event.result) {
            plan.stepResults[event.stepId] = event.result
          }
        }
        break
      }

      case "$plan_cleared":
        activePlan.value = null
        break

      case "$ctx_breakdown":
        usageStats.value.reservedTokens = event.reservedTokens
        if (event.logTokens !== undefined) {
          // logTokens 更新时同时也反向推算 cacheHit/Miss — 简化处理
        }
        break

      case "status":
        // 原版忽略所有 status 事件，不展示
        break

      case "error":
        busy.value = false
        messages.value.push({ kind: "error", message: event.message })
        break
    }
  }

  // ─── 乐观添加用户消息（Composer 发送前调用）───
  // ─── 排队消息（忙碌时暂存）───
  function queueSend(text: string) {
    queuedSends.value.push(text)
  }

  function dequeueSend(index: number) {
    queuedSends.value.splice(index, 1)
  }

  function addUserMessage(text: string) {
    const turn = messages.value.reduce((max, m) => {
      if (m.kind === "user" || m.kind === "assistant") return Math.max(max, m.turn)
      return max
    }, 0) + 1
    messages.value.push({
      kind: "user",
      text,
      clientId: `c-${Date.now()}`,
      turn,
    })
  }

  // ─── 清空消息（新建对话/清屏）───
  function clearMessages() {
    messages.value = []
    currentSession.value = ""
    clearApprovals()
  }

  /** 清除所有审批状态 */
  function clearApprovals() {
    pendingConfirms.value = []
    pendingPathAccess.value = null
    pendingChoice.value = null
    pendingPlan.value = null
    pendingCheckpoint.value = null
    pendingRevision.value = null
  }

  return {
    // 消息
    messages,
    currentSession,
    activeTabId,
    usageStats,
    rpcReady,
    busy,
    queuedSends,
    mentionResults,
    mentionPreview,
    // 审批工作流
    pendingConfirms,
    pendingPathAccess,
    pendingChoice,
    pendingPlan,
    pendingCheckpoint,
    pendingRevision,
    activePlan,
    // 会话文件
    sessionFiles,
    // 生命周期
    spawnRpc,
    resetRpc,
    sendCommand,
    abort,
    handleEvent,
    clearMessages,
    addUserMessage,
    queueSend,
    dequeueSend,
    clearApprovals,
    // 审批 verdict
    approveConfirm,
    rejectConfirm,
    alwaysAllowConfirm,
    approvePathAccess,
    rejectPathAccess,
    alwaysAllowPathAccess,
    pickChoice,
    cancelChoice,
    approvePlan,
    refinePlan,
    cancelPlan,
    continueCheckpoint,
    reviseCheckpoint,
    stopCheckpoint,
    acceptRevision,
    rejectRevision,
  }
})
