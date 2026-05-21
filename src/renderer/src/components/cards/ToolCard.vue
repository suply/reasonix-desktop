<script setup lang="ts">
// 工具调用卡片
import { computed } from "vue"

const props = defineProps<{
  name: string
  args: string
  result?: string
  ok?: boolean
  durationMs?: number
}>()

const argsFormatted = computed(() => {
  try {
    return JSON.stringify(JSON.parse(props.args), null, 2)
  } catch {
    return props.args
  }
})

const statusColor = computed(() => {
  if (props.ok === undefined) return "var(--el-color-info)"
  return props.ok ? "var(--el-color-success)" : "var(--el-color-danger)"
})

const statusText = computed(() => {
  if (props.ok === undefined) return "运行中..."
  return props.ok ? "成功" : "失败"
})
</script>

<template>
  <div class="tool-card">
    <div class="tool-header">
      <span class="tool-name">{{ name }}</span>
      <span class="tool-status" :style="{ color: statusColor }">{{ statusText }}</span>
      <span v-if="durationMs" class="tool-duration">{{ durationMs }}ms</span>
    </div>

    <div class="tool-section">
      <div class="section-label">参数</div>
      <pre class="tool-args">{{ argsFormatted }}</pre>
    </div>

    <div v-if="result" class="tool-section">
      <div class="section-label">结果</div>
      <pre class="tool-result" :class="{ error: ok === false }">{{ result }}</pre>
    </div>
  </div>
</template>

<style scoped>
.tool-card {
  background: var(--el-fill-color);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 8px 0;
  font-size: 13px;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tool-name {
  font-weight: 600;
  font-family: ui-monospace, monospace;
}

.tool-status {
  font-size: 12px;
}

.tool-duration {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-left: auto;
}

.tool-section {
  margin-top: 6px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.tool-args,
.tool-result {
  background: var(--el-bg-color);
  border-radius: 4px;
  padding: 8px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.tool-result.error {
  color: var(--el-color-danger);
}
</style>
