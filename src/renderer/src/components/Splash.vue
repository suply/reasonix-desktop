<script setup lang="ts">
// 启动欢迎屏 — 快速开始选项
import { ElButton } from "element-plus"

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
  newChat: []
  openFile: []
}>()
</script>

<template>
  <div v-if="visible" class="splash-overlay" @click="emit('update:visible', false)">
    <div class="splash-card" @click.stop>
      <div class="splash-logo">Reasonix</div>
      <p class="splash-subtitle">DeepSeek 原生智能体框架</p>

      <div class="splash-actions">
        <ElButton type="primary" size="large" @click="emit('newChat')">
          开始新对话
        </ElButton>
      </div>

      <p class="splash-footer">
        Reasonix Desktop · Electron 移植版
      </p>
    </div>
  </div>
</template>

<style scoped>
.splash-overlay {
  position: fixed;
  inset: 0;
  background: var(--el-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.splash-card {
  text-align: center;
  max-width: 400px;
  padding: 40px;
}

.splash-logo {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 8px;
}

.splash-subtitle {
  font-size: 16px;
  color: var(--el-text-color-secondary);
  margin-bottom: 32px;
}

.splash-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.splash-footer {
  margin-top: 48px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
