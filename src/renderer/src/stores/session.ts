// 会话状态 — 移植自 desktop/src/App.tsx 的 reduce / applyIncoming
import { defineStore } from "pinia"
import { ref } from "vue"
import type { IncomingEvent, OutgoingCommand } from "../../../main/protocol"

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

export const useSessionStore = defineStore("session", () => {
  // ─── 状态 ───
  const messages = ref<ChatMessage[]>([])
  const activeTabId = ref("")
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
      case "user.message":
        messages.value.push({
          kind: "user",
          text: event.text,
          clientId: String(event.id),
          turn: event.turn,
        })
        break

      case "model.turn.started":
        messages.value.push({
          kind: "assistant",
          turn: event.turn,
          segments: [],
          pending: true,
        })
        break

      case "model.delta":
        // 追加到当前消息的最后一段
        const deltaMsg = messages.value[messages.value.length - 1]
        if (deltaMsg?.kind === "assistant" && deltaMsg.pending) {
          // channel → kind 映射: content → text, reasoning → reasoning, tool_args → tool_args
          const segKind = event.channel === "content" ? "text" : event.channel as "reasoning" | "tool_args"
          const lastSeg = deltaMsg.segments[deltaMsg.segments.length - 1]
          if (lastSeg?.kind === segKind && lastSeg.kind !== "tool_args") {
            // 同类型连续追加
            ;(lastSeg as any).text += event.text
          } else {
            // 新段
            const base = { kind: segKind, text: event.text } as any
            if (event.channel === "tool_args") {
              base.callId = ""
              base.name = ""
              base.args = ""
            }
            deltaMsg.segments.push(base)
          }
        }
        break

      case "model.final":
        // 调试日志
        console.log("[event] model.final", { contentLen: event.content?.length, hasReasoning: !!event.reasoningContent, turn: event.turn })
        // 标记完成，用 model.final 的完整内容替换/添加 text 段
        const finalMsg = messages.value[messages.value.length - 1]
        if (finalMsg?.kind === "assistant") {
          finalMsg.pending = false
          // 始终用 model.final.content 设置 text 段（替换可能不完整的 delta 流式内容）
          if (event.content) {
            const textIdx = finalMsg.segments.findIndex((s) => s.kind === "text")
            if (textIdx >= 0) {
              finalMsg.segments[textIdx] = { kind: "text", text: event.content }
            } else {
              finalMsg.segments.push({ kind: "text", text: event.content })
            }
          }
          // 同样处理 reasoningContent
          if (event.reasoningContent) {
            const reasonIdx = finalMsg.segments.findIndex((s) => s.kind === "reasoning")
            if (reasonIdx >= 0) {
              finalMsg.segments[reasonIdx] = { kind: "reasoning", text: event.reasoningContent }
            } else {
              finalMsg.segments.push({ kind: "reasoning", text: event.reasoningContent })
            }
          }
        }
        break

      case "tool.preparing":
        // 在最后一条 assistant 消息中添加 tool 占位
        const prepMsg = messages.value[messages.value.length - 1]
        if (prepMsg?.kind === "assistant" && prepMsg.pending) {
          prepMsg.segments.push({
            kind: "tool",
            callId: event.callId,
            name: event.name,
            args: "",
            startedAt: Date.now(),
          })
        }
        break

      case "tool.intent":
        // 更新 tool 参数
        const intentMsg = messages.value[messages.value.length - 1]
        if (intentMsg?.kind === "assistant") {
          const seg = intentMsg.segments.find(
            (s) => s.kind === "tool" && s.callId === event.callId,
          )
          if (seg && seg.kind === "tool") {
            seg.args = event.args
          }
        }
        break

      case "tool.result":
        const resultMsg = messages.value[messages.value.length - 1]
        if (resultMsg?.kind === "assistant") {
          const seg = resultMsg.segments.find(
            (s) => s.kind === "tool" && s.callId === event.callId,
          )
          if (seg && seg.kind === "tool") {
            seg.result = event.output
            seg.ok = event.ok
            if (seg.startedAt) {
              seg.durationMs = Date.now() - seg.startedAt
            }
          }
        }
        break

      case "status":
        messages.value.push({ kind: "status", text: event.text })
        break

      case "error":
        messages.value.push({ kind: "error", message: event.message })
        break
    }
  }

  return {
    messages,
    activeTabId,
    usageStats,
    rpcReady,
    spawnRpc,
    resetRpc,
    sendCommand,
    handleEvent,
  }
})
