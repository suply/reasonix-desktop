<script setup lang="ts">
// 推理过程卡片（可折叠）
import { ref } from "vue"

const props = defineProps<{
  text: string
}>()

const expanded = ref(false)
const lines = props.text.split("\n")
const preview = lines.length > 3 ? lines.slice(0, 3).join("\n") + "..." : props.text
</script>

<template>
  <div class="reasoning-card">
    <button class="reasoning-toggle" @click="expanded = !expanded">
      <span class="toggle-icon">{{ expanded ? "▼" : "▶" }}</span>
      <span>推理过程</span>
      <span class="reasoning-count">{{ lines.length }} 行</span>
    </button>
    <div v-show="expanded" class="reasoning-content">
      <pre>{{ text }}</pre>
    </div>
    <div v-show="!expanded" class="reasoning-preview">
      <pre>{{ preview }}</pre>
    </div>
  </div>
</template>

<style scoped>
.reasoning-card {
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-7);
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
}

.reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-warning);
}

.reasoning-toggle:hover {
  background: var(--el-color-warning-light-8);
}

.toggle-icon {
  font-size: 10px;
}

.reasoning-count {
  margin-left: auto;
  font-weight: 400;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.reasoning-content pre,
.reasoning-preview pre {
  padding: 8px 12px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.reasoning-preview pre {
  opacity: 0.6;
}
</style>
