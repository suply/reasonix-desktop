<script setup lang="ts">
// 顶部栏 — 工作目录显示 + 切换 + 新增
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from "element-plus"
import { useSettingsStore } from "../stores/settings"
import { useSessionStore } from "../stores/session"

const emit = defineEmits<{
  pickWorkspace: []
}>()

const settings = useSettingsStore()
const session = useSessionStore()

function selectWorkspace(dir: string) {
  session.sendCommand({ cmd: "settings_save", workspaceDir: dir })
}

function truncatePath(p: string, max = 50): string {
  if (!p) return "未设置"
  if (p.length <= max) return p
  return "…" + p.slice(-(max - 1))
}
</script>

<template>
  <div class="topbar">
    <div class="topbar-left">
      <span class="topbar-label">工作目录</span>
      <span class="topbar-path">{{ truncatePath(settings.settings.workspaceDir) }}</span>
    </div>

    <div class="topbar-right">
      <div class="workspace-split">
        <button class="split-left" @click="emit('pickWorkspace')">+ 新增工作区</button>
        <ElDropdown
          v-if="settings.settings.recentWorkspaces.length > 0"
          @command="selectWorkspace"
        >
          <button class="split-right">▾</button>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem
                v-for="dir in settings.settings.recentWorkspaces"
                :key="dir"
                :command="dir"
              >
                {{ dir }}
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  min-height: 36px;
  padding: 0 12px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
  font-size: 12px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.topbar-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.topbar-path {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  color: inherit;
  font: inherit;
  max-width: 400px;
}

.topbar-dropdown-btn:hover {
  background: var(--el-fill-color-light);
}

.topbar-arrow {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
}

.workspace-split {
  display: flex;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.split-left {
  border: none;
  background: var(--el-fill-color);
  cursor: pointer;
  font-size: 12px;
  padding: 3px 10px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.split-left:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.split-right {
  border: none;
  border-left: 1px solid var(--el-border-color);
  background: var(--el-fill-color);
  cursor: pointer;
  font-size: 10px;
  padding: 3px 8px;
  color: var(--el-text-color-placeholder);
}

.split-right:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
