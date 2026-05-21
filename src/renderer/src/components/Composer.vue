<script setup lang="ts">
import { ref } from "vue"
import { ElInput } from "element-plus"
import { useSessionStore } from "../stores/session"

const session = useSessionStore()
const inputText = ref("")

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  // 乐观更新：先加到本地，再发到 CLI（源码 App.tsx:1301-1302）
  session.addUserMessage(text)
  session.sendCommand({ cmd: "user_input", text })
  inputText.value = ""
}

function onKeydown(e: Event | KeyboardEvent) {
  const ke = e as KeyboardEvent
  if (ke.key === "Enter" && !ke.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="composer">
    <ElInput
      v-model="inputText"
      type="textarea"
      :rows="2"
      :autosize="{ minRows: 2, maxRows: 8 }"
      placeholder="输入消息..."
      :disabled="!session.rpcReady"
      @keydown="onKeydown"
    />
    <div class="composer-actions">
      <el-button type="primary" size="small" :disabled="!session.rpcReady" @click="sendMessage">发送</el-button>
    </div>
  </div>
</template>

<style scoped>
.composer {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.composer-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}
</style>
