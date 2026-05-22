<script setup lang="ts">
/**
 * 对话线程 — 对照 desktop/src/ui/thread.tsx + useAutoScroll.ts
 */
import { useSessionStore, type ChatMessage } from "../stores/session"
import Markdown from "./Markdown.vue"
import ToolCard from "./cards/ToolCard.vue"
import ShellCard from "./cards/ShellCard.vue"
import ReasoningCard from "./cards/ReasoningCard.vue"
import {
  PlanBanner,
  ActivePlanTaskCard,
  PlanApprovalCard,
  CheckpointApprovalCard,
  RevisionApprovalCard,
  ConfirmApprovalCard,
  PathAccessApprovalCard,
  ChoiceApprovalCard,
} from "./cards/approval/index"
import ActivityHeatmap from "./ActivityHeatmap.vue"
import { Icons } from "./icons"
import { ElMessage } from "element-plus"
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue"

const session = useSessionStore()

/* ═══ 自动滚动 & 跳到底部按钮（对照 src/ui/useAutoScroll.ts） ═══ */

/** 可滚动容器 */
const threadRef = ref<HTMLElement | null>(null)
/** 内容容器 — ResizeObserver 监听对象 */
const threadInnerRef = ref<HTMLElement | null>(null)

const PIN_THRESHOLD = 80
const showJumpButton = ref(false)
let isPinned = true
let rafTimer = 0
let ro: ResizeObserver | null = null

function isAtBottom(): boolean {
  const el = threadRef.value
  if (!el) return true
  return el.scrollTop + el.clientHeight >= el.scrollHeight - PIN_THRESHOLD
}

function refreshJumpButton() {
  const el = threadRef.value
  if (!el) return
  showJumpButton.value = !isPinned && el.scrollHeight > el.clientHeight + PIN_THRESHOLD
}

function scrollToBottom(smooth = true) {
  const el = threadRef.value
  if (!el) return
  isPinned = true
  showJumpButton.value = false
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" })
}

/** 用户手势检测 — 取消 pin */
function onUserGesture() {
  if (rafTimer) cancelAnimationFrame(rafTimer)
  rafTimer = requestAnimationFrame(() => {
    rafTimer = 0
    isPinned = isAtBottom()
    refreshJumpButton()
  })
}

/** 内容变化时自动保持底部对齐 */
function onContentResize() {
  if (rafTimer) cancelAnimationFrame(rafTimer)
  rafTimer = requestAnimationFrame(() => {
    rafTimer = 0
    const el = threadRef.value
    if (!el) return
    if (isPinned) {
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" })
    } else {
      refreshJumpButton()
    }
  })
}

onMounted(() => {
  const el = threadRef.value
  if (!el) return

  // 用户手势监听
  el.addEventListener("wheel", onUserGesture, { passive: true })
  el.addEventListener("touchmove", onUserGesture, { passive: true })
  el.addEventListener("keydown", onUserGesture)
  el.addEventListener("pointerdown", onUserGesture)

  // ResizeObserver — 内容高度变化时跟随
  const inner = threadInnerRef.value
  if (inner) {
    ro = new ResizeObserver(onContentResize)
    ro.observe(inner)
  }

  // 初始滚动到底部
  nextTick(() => {
    isPinned = true
    showJumpButton.value = false
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" })
  })
})

onUnmounted(() => {
  const el = threadRef.value
  if (el) {
    el.removeEventListener("wheel", onUserGesture)
    el.removeEventListener("touchmove", onUserGesture)
    el.removeEventListener("keydown", onUserGesture)
    el.removeEventListener("pointerdown", onUserGesture)
  }
  if (rafTimer) cancelAnimationFrame(rafTimer)
  if (ro) ro.disconnect()
})

/** busy 状态变化时重新 pin 到底部 */
watch(() => session.busy, () => {
  nextTick(() => scrollToBottom(true))
})

/* ═══ 消息导航 ═══ */

const userMessages = computed(() =>
  session.messages.filter((m) => m.kind === "user")
)

const userMsgIndices = computed(() =>
  session.messages.reduce<number[]>((acc, m, i) => {
    if (m.kind === "user") acc.push(i)
    return acc
  }, [])
)

const msgRefs = ref<(HTMLElement | null)[]>([])

function scrollToUser(userIndex: number) {
  const msgIdx = userMsgIndices.value[userIndex]
  if (msgIdx === undefined) return
  const el = msgRefs.value[msgIdx]
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

function setMsgRef(el: HTMLElement | null, msgIdx: number) {
  if (el) msgRefs.value[msgIdx] = el
}

function isAssistant(msg: ChatMessage): msg is Extract<ChatMessage, { kind: "assistant" }> {
  return msg.kind === "assistant"
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => ElMessage.success("已复制"))
}

const SHELL_TOOLS = new Set(["run_command", "run_background", "shell", "execute"])
function isShellTool(name: string): boolean {
  return SHELL_TOOLS.has(name) || name.startsWith("run_")
}

function getShellState(seg: { ok?: boolean }): "await" | "running" | "done" | "failed" {
  if (seg.ok === undefined) return "running"
  return seg.ok ? "done" : "failed"
}

function extractCommand(args: string): string | undefined {
  try {
    const parsed = JSON.parse(args)
    return parsed.command || parsed.cmd || parsed.script
  } catch {
    return undefined
  }
}
</script>

<template>
  <div class="thread-wrap">
    <div class="thread" ref="threadRef">
      <div class="thread-inner" ref="threadInnerRef">
        <!-- ═══ 消息列表 ═══ -->
        <template v-if="session.messages.length > 0">
          <template v-for="(msg, idx) in session.messages" :key="idx">
            <div v-if="msg.kind === 'user'" :ref="(el) => setMsgRef(el as HTMLElement | null, idx)"
              class="msg msg-user">
              <div class="body">
                <div class="msg-text">
                  <Markdown :content="msg.text" />
                </div>
              </div>
            </div>

            <div v-else-if="isAssistant(msg)" class="msg msg-assistant">
              <div class="body">
                <span v-if="msg.pending" class="pending-label" style="margin-bottom:4px;display:block">思考中...</span>
                <template v-for="(seg, si) in msg.segments" :key="si">
                  <ReasoningCard v-if="seg.kind === 'reasoning'" :text="seg.text"
                    :streaming="msg.pending && si === msg.segments.length - 1" :default-open="si === 0" />
                  <div v-else-if="seg.kind === 'text'" class="msg-text">
                    <Markdown :content="seg.text" />
                  </div>
                  <ShellCard v-else-if="seg.kind === 'tool' && isShellTool(seg.name)"
                    :command="extractCommand(seg.args) || seg.name" :output="seg.result" :state="getShellState(seg)"
                    :duration-ms="seg.durationMs" />
                  <ToolCard v-else-if="seg.kind === 'tool'" :name="seg.name" :args="seg.args" :result="seg.result"
                    :ok="seg.ok" :duration-ms="seg.durationMs" />
                </template>
                <div v-if="msg.segments.some(s => s.kind === 'text' && s.text.trim())" class="msg-actions">
                  <button class="copy-btn"
                    @click="copyText(msg.segments.filter(s => s.kind === 'text').map(s => s.text).join('\n'))"
                    title="复制回复" v-html="Icons.clipboard()" />
                </div>
              </div>
            </div>

            <div v-else-if="msg.kind === 'status'" class="msg msg-status">
              <div class="msg-status-text">{{ msg.text }}</div>
            </div>

            <div v-else-if="msg.kind === 'error'" class="msg msg-error">
              <div class="msg-error-text">{{ msg.message }}</div>
            </div>
          </template>
        </template>

        <!-- ═══ 空状态 ═══ -->
        <div v-if="session.messages.length === 0 && !session.activePlan" class="thread-empty">
          <ActivityHeatmap />
        </div>

        <!-- ═══ 审批工作流卡片 ═══ -->
        <PlanBanner v-if="session.activePlan && session.activePlan.steps.length > 0" :plan="session.activePlan"
          @dismiss="session.sendCommand({ cmd: 'new_chat' }); session.clearMessages()" />
        <ActivePlanTaskCard v-if="session.activePlan && session.activePlan.steps.length > 0"
          :plan="session.activePlan" />
        <PlanApprovalCard v-if="session.pendingPlan" :plan="session.pendingPlan" />
        <CheckpointApprovalCard v-if="session.pendingCheckpoint" :cp="session.pendingCheckpoint" />
        <RevisionApprovalCard v-if="session.pendingRevision" :revision="session.pendingRevision" />
        <ChoiceApprovalCard v-if="session.pendingChoice" :choice="session.pendingChoice" />
        <PathAccessApprovalCard v-if="session.pendingPathAccess" :access="session.pendingPathAccess" />
        <ConfirmApprovalCard v-for="c in session.pendingConfirms" :key="c.id" :confirm="c" />
      </div>

      <!-- ═══ 跳到底部按钮 ═══ -->
      <button v-if="showJumpButton" class="thread-jump-bottom" @click="scrollToBottom(true)" title="回到底部">
        <span v-html="Icons.chev()" />
      </button>
    </div>

    <!-- 消息导航点 -->
    <div class="msg-nav">
      <el-tooltip v-for="(u, i) in userMessages" :key="i" :content="u.text" placement="right" :show-after="200">
        <div class="msg-dot" @click="scrollToUser(i)">
          <span class="dot" />
        </div>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
.thread {
  flex: 1;
  overflow-y: auto;
  padding: 16px 70px 40px;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
  scroll-padding-bottom: 24px;
  position: relative;
}

.thread::-webkit-scrollbar {
  width: 6px;
}

.thread::-webkit-scrollbar-track {
  background: transparent;
}

.thread::-webkit-scrollbar-track-piece {
  background: transparent;
}

.thread::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.thread::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-placeholder);
}

.thread-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

/* ─── 跳到底部按钮 ─── */
.thread-jump-bottom {
  position: sticky;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
  color: var(--el-text-color-primary);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.15s, transform 0.15s;
  opacity: 0.9;
}

.thread-jump-bottom span {
  display: flex;
  align-items: center;
  justify-content: center;
}

.thread-jump-bottom:hover {
  opacity: 1;
  background: var(--el-fill-color);
  transform: translateX(-50%) scale(1.05);
}

/* ─── 通用消息 ─── */
.msg {
  margin-bottom: 20px;
  line-height: 1.6;
}

.body {
  min-width: 0;
}

.pending-label {
  font-size: 11px;
  font-style: italic;
  color: var(--el-color-warning);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

/* ─── 用户消息：靠右 ─── */
.msg-user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.msg-user .msg-text {
  background: var(--el-bg-color-overlay);
  border-radius: 12px;
  padding: 6px 14px;
  font-size: 14px;
  word-break: break-word;
}

.msg-user .msg-text :deep(p) {
  margin: 0.3em 0;
}

/* ─── 助手消息 ─── */
.msg-text {
  font-size: 14px;
  word-break: break-word;
}

.msg-assistant .msg-text {
  padding: 2px 0;
}

/* ─── 复制按钮 ─── */
.msg-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.msg:hover .msg-actions {
  opacity: 0.5;
}

.msg .msg-actions:hover {
  opacity: 1;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 6px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.copy-btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

/* ─── 消息导航点 ─── */
.thread-wrap {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.msg-nav {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  z-index: 10;
  pointer-events: none;
}

.msg-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  cursor: pointer;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  transition: background 0.12s;
}

.msg-dot:hover {
  background: var(--el-fill-color);
}

.dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-border-color);
  transition: background 0.15s, transform 0.15s;
  flex-shrink: 0;
}

.msg-dot:hover .dot {
  background: var(--el-color-primary);
  transform: scale(1.3);
}

/* ─── 状态 / 错误 ─── */
.msg-status-text {
  font-size: 13px;
  font-style: italic;
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 8px;
}

.msg-error-text {
  font-size: 13px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 6px;
  padding: 8px 12px;
}
</style>
