<script setup lang="ts">
import { useSessionStore } from "../stores/session"
import { useAppStore } from "../stores/app"

const emit = defineEmits<{
  openJobs: []
}>()

const session = useSessionStore()
const appState = useAppStore()
</script>

<template>
  <div class="statusbar">
    <span class="statusbar-item">{{ session.messages.length }} 条消息</span>
    <span class="grow" />
    <button class="statusbar-btn" @click="emit('openJobs')" :title="`后台任务 (${appState.jobs.length})`">
      ⚙️ {{ appState.jobs.length }}
    </button>
  </div>
</template>

<style scoped>
.statusbar {
  height: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color-page);
  border-top: 1px solid var(--el-border-color-light);
}

.statusbar-item {
  margin-right: 16px;
}

.grow { flex: 1; }

.statusbar-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
}

.statusbar-btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}
</style>
