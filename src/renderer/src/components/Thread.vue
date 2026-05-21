<script setup lang="ts">
import { useSessionStore, type ChatMessage } from "../stores/session"
import Markdown from "./Markdown.vue"
import ToolCard from "./cards/ToolCard.vue"
import ReasoningCard from "./cards/ReasoningCard.vue"

const session = useSessionStore()

function isAssistant(msg: ChatMessage): msg is Extract<ChatMessage, { kind: "assistant" }> {
  return msg.kind === "assistant"
}
</script>

<template>
  <div class="thread" v-if="session.messages.length > 0">
    <div
      v-for="(msg, idx) in session.messages"
      :key="idx"
      class="msg"
      :class="[`msg-${msg.kind}`]"
    >
      <!-- 用户消息 -->
      <template v-if="msg.kind === 'user'">
        <div class="msg-label">
          <span class="msg-author">You</span>
        </div>
        <div class="msg-body">
          <Markdown :content="msg.text" />
        </div>
      </template>

      <!-- 助手消息 -->
      <template v-else-if="isAssistant(msg)">
        <div class="msg-label">
          <span class="msg-author">Assistant</span>
          <span v-if="msg.pending" class="msg-pending">思考中...</span>
        </div>
        <div class="assistant-segments">
          <template v-for="(seg, si) in msg.segments" :key="si">
            <!-- 推理过程 -->
            <ReasoningCard v-if="seg.kind === 'reasoning'" :text="seg.text" />

            <!-- 文本回复 -->
            <div v-else-if="seg.kind === 'text'" class="msg-body">
              <Markdown :content="seg.text" />
            </div>

            <!-- 工具调用 -->
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
      </template>

      <!-- 状态消息 -->
      <div v-else-if="msg.kind === 'status'" class="msg-status-text">
        {{ msg.text }}
      </div>

      <!-- 错误消息 -->
      <div v-else-if="msg.kind === 'error'" class="msg-error-text">
        {{ msg.message }}
      </div>
    </div>
  </div>

  <!-- 空状态 -->
  <div class="thread-empty" v-else>
    <div class="empty-text">开始对话...</div>
  </div>
</template>

<style scoped>
.thread {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.thread-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.msg {
  margin-bottom: 20px;
  line-height: 1.6;
}

.msg-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.msg-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.msg-pending {
  font-size: 11px;
  font-style: italic;
  color: var(--el-color-warning);
}

.msg-body {
  font-size: 14px;
  word-break: break-word;
}

.assistant-segments > :deep(*) {
  margin: 4px 0;
}

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
