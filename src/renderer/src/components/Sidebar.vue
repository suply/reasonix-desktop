<script setup lang="ts">
import { ref } from "vue"
import { useAppStore } from "../stores/app"
import { useSettingsStore } from "../stores/settings"
import WorkdirPop from "./WorkdirPop.vue"

const appState = useAppStore()
const settings = useSettingsStore()
const showWorkdir = ref(false)

function truncatePath(p: string, max = 40): string {
  if (p.length <= max) return p
  return "..." + p.slice(-(max - 3))
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">Reasonix</div>
    </div>

    <!-- 工作目录 -->
    <div class="sidebar-section">
      <div class="section-label">工作目录</div>
      <button class="workdir-btn" @click="showWorkdir = true" :title="settings.settings.workspaceDir || '点击设置'">
        <span class="workdir-path">{{ truncatePath(settings.settings.workspaceDir) || "未设置" }}</span>
      </button>
    </div>

    <div class="session-list">
      <div class="session-item" v-for="s in appState.sessions" :key="s.name">
        <span class="session-name">{{ s.summary || s.name }}</span>
      </div>
    </div>

    <div class="sidebar-footer">
      <span class="version">v{{ settings.settings.version }}</span>
      <button class="settings-btn" @click="$emit('openSettings')">设置</button>
    </div>
  </aside>

  <WorkdirPop v-model:visible="showWorkdir" />
</template>

<style scoped>
.sidebar {
  width: 240px;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.logo {
  font-weight: 700;
  font-size: 16px;
}

.sidebar-section {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.workdir-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: border-color 0.2s;
}

.workdir-btn:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.workdir-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.session-item:hover {
  background: var(--el-color-primary-light-9);
}

.sidebar-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.settings-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.settings-btn:hover {
  color: var(--el-color-primary);
}
</style>
