<script setup lang="ts">
import { useAppStore } from "../stores/app"
import { useSettingsStore } from "../stores/settings"
import { useSessionStore } from "../stores/session"

const session = useSessionStore()

defineEmits<{
  openSettings: []
  openJobs: []
}>()

const appState = useAppStore()
const settings = useSettingsStore()
</script>

<template>
  <aside class="sidebar">
    <!-- 新建对话 -->
    <button class="new-chat-btn" @click="session.sendCommand({ cmd: 'new_chat' })">
      + 新建对话
    </button>

    <div class="session-list">
      <div class="session-item" v-for="s in appState.sessions" :key="s.name">
        <span class="session-name">{{ s.summary || s.name }}</span>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="footer-btn" @click="$emit('openJobs')" :title="`后台任务 (${appState.jobs.length})`">
        ⚙️ {{ appState.jobs.length }}
      </button>
      <button class="footer-btn" @click="$emit('openSettings')">设置</button>
      <span class="version">v{{ settings.settings.version }}</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  min-width: 200px;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
}

.new-chat-btn {
  display: block;
  width: calc(100% - 16px);
  margin: 8px;
  padding: 6px 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  transition: border-color 0.15s, color 0.15s;
}
.new-chat-btn:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item:hover {
  background: var(--el-color-primary-light-9);
}

.sidebar-footer {
  padding: 6px 12px;
  border-top: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.footer-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 3px;
}

.footer-btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.version {
  margin-left: auto;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}
</style>
