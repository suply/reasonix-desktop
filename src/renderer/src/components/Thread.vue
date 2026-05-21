<script setup lang="ts">
// 对话线程 — 对照 desktop/src/ui/thread.tsx
import { useSessionStore, type ChatMessage } from "../stores/session"
import Markdown from "./Markdown.vue"
import ToolCard from "./cards/ToolCard.vue"
import ShellCard from "./cards/ShellCard.vue"
import ReasoningCard from "./cards/ReasoningCard.vue"
import { ElMessage } from "element-plus"

const session = useSessionStore()

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

// 从 tool args JSON 中提取 command 字段
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
  <div class="thread" v-if="session.messages.length > 0">
    <template v-for="(msg, idx) in session.messages" :key="idx">
      <div v-if="msg.kind === 'user'" class="msg msg-user">
        <div class="msg-label">
          <span class="msg-author">You</span>
        </div>
        <div class="msg-content"><Markdown :content="msg.text" /></div>
        <button class="msg-copy" @click="copyText(msg.text)" title="复制">📋</button>
      </div>

      <div v-else-if="isAssistant(msg)" class="msg msg-assistant">
        <div class="msg-label">
          <span class="msg-author">Assistant</span>
          <span v-if="msg.pending" class="msg-pending">思考中...</span>
        </div>
        <div class="assistant-segments">
          <template v-for="(seg, si) in msg.segments" :key="si">
            <ReasoningCard v-if="seg.kind === 'reasoning'" :text="seg.text" />
            <div v-else-if="seg.kind === 'text'" class="msg-content"><Markdown :content="seg.text" /></div>
            <ShellCard
              v-else-if="seg.kind === 'tool' && isShellTool(seg.name)"
              :command="extractCommand(seg.args) || seg.name"
              :output="seg.result"
              :state="getShellState(seg)"
              :duration-ms="seg.durationMs"
            />
            <ToolCard
              v-else-if="seg.kind === 'tool'"
              :name="seg.name"
              :args="seg.args"
              :result="seg.result"
              :ok="seg.ok"
              :duration-ms="seg.durationMs"
            />
          </template>
        </div>
        <div v-if="!msg.pending" class="msg-actions">
          <button class="msg-copy" @click="copyText(msg.segments.filter(s => s.kind === 'text').map(s => s.text).join('\n'))" title="复制回复">📋</button>
        </div>
      </div>

      <div v-else-if="msg.kind === 'status'" class="msg msg-status">
        <div class="msg-status-text">{{ msg.text }}</div>
      </div>

      <div v-else-if="msg.kind === 'error'" class="msg msg-error">
        <div class="msg-error-text">{{ msg.message }}</div>
      </div>
    </template>
  </div>

  <div class="thread-empty" v-else>
    <div class="empty-text">开始对话...</div>
  </div>
</template>

<style scoped>
.thread { flex: 1; overflow-y: auto; padding: 16px; }
.thread-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--el-text-color-placeholder); }

.msg { margin-bottom: 20px; line-height: 1.6; position: relative; }
.msg-label { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.msg-author { font-size: 12px; font-weight: 600; color: var(--el-text-color-secondary); }
.msg-pending { font-size: 11px; font-style: italic; color: var(--el-color-warning); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.msg-content { font-size: 14px; word-break: break-word; }
.assistant-segments > :deep(*) { margin: 4px 0; }

.msg-copy {
  position: absolute; top: 0; right: 0;
  opacity: 0; border: none; background: none; cursor: pointer;
  font-size: 14px; padding: 4px 6px; border-radius: 4px;
  transition: opacity 0.15s;
}
.msg:hover .msg-copy { opacity: 0.5; }
.msg .msg-copy:hover { opacity: 1; background: var(--el-fill-color-light); }
.msg-actions { display: flex; gap: 6px; margin-top: 4px; }

.msg-status-text { font-size: 13px; font-style: italic; color: var(--el-text-color-secondary); text-align: center; padding: 8px; }
.msg-error-text { font-size: 13px; color: var(--el-color-danger); background: var(--el-color-danger-light-9); border-radius: 6px; padding: 8px 12px; }
</style>
