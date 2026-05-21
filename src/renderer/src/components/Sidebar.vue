<script setup lang="ts">
import { ElMessageBox } from "element-plus"
import { useAppStore } from "../stores/app"
import { useSessionStore } from "../stores/session"

defineEmits<{
  openSettings: []
  openJobs: []
}>()

const appState = useAppStore()
const session = useSessionStore()

// 会话显示名
function prettyName(s: { name: string; summary?: string }): string {
  if (s.summary && s.summary.trim()) return s.summary.trim()
  const m = s.name.match(/^desktop-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?:-(\d+))?$/)
  if (m) {
    const [, , month, day, hh, mm, tab] = m
    return `${month}月${day}日 ${hh}:${mm}${tab && tab !== "1" ? ` · #${tab}` : ""}`
  }
  return s.name.replace(/^desktop-/, "").replace(/[-_]+/g, " ")
}

// 相对时间
function relativeTime(mtime: string): string {
  const ms = Date.now() - Date.parse(mtime)
  if (!Number.isFinite(ms)) return mtime
  const min = Math.floor(ms / 60000)
  if (min < 1) return "刚刚"
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}天前`
  return `${Math.floor(d / 7)}周前`
}

function loadSession(name: string) {
  session.sendCommand({ cmd: "session_load", name })
}

function deleteSession(name: string) {
  ElMessageBox.confirm(`确定删除会话 "${prettyName({ name })}" 吗？`, "删除会话", {
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    // 删除的是当前会话 → 清空聊天区
    if (name === session.currentSession) {
      session.clearMessages()
    }
    session.sendCommand({ cmd: "session_delete", name })
  }).catch(() => { })
}
</script>

<template>
  <aside class="sidebar">
    <div class="side-head">
      <button class="new-btn" @click="session.sendCommand({ cmd: 'new_chat' }); session.clearMessages()">
        <span class="new-icon">+</span>
        <span>新建对话</span>
      </button>
    </div>

    <!-- 会话列表 -->
    <div class="session-list">
      <div class="side-section">
        <div class="section-label">
          <span>最近会话</span>
          <span class="count">{{ appState.sessions.length }}</span>
        </div>

        <div v-if="appState.sessions.length === 0" class="empty-hint">暂无会话</div>

        <div v-for="s in appState.sessions" :key="s.name" class="session-item"
          :class="{ active: s.name === session.currentSession }" role="button" tabindex="0" :title="s.name"
          @click="loadSession(s.name)">
          <div class="body">
            <span class="title">{{ prettyName(s) }}</span>
            <span class="meta">
              <span>{{ s.messageCount }} 条消息</span>
              <span class="sep">·</span>
              <span>{{ relativeTime(s.mtime) }}</span>
            </span>
          </div>
          <button class="delete-btn" title="删除会话" @click.stop="deleteSession(s.name)">✕</button>
        </div>
      </div>
    </div>

    <div class="side-foot">
      <button class="foot-row" @click="$emit('openJobs')">
        <span class="ico">⚙️</span>
        <span>后台任务</span>
      </button>
      <button class="foot-row" @click="$emit('openSettings')">
        <span class="ico">⚙️</span>
        <span>设置</span>
      </button>
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

.side-head {
  padding: 8px;
}

.new-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: border-color 0.15s, color 0.15s;
}

.new-btn:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.new-icon {
  font-size: 14px;
  font-weight: 700;
}

.session-list {
  flex: 1;
  overflow-y: auto;
}

.side-section {
  padding: 4px 0;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.count {
  font-weight: 400;
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.empty-hint {
  padding: 12px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  font-family: ui-monospace, monospace;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.session-item:hover {
  background: var(--el-fill-color-light);
}

.session-item.active {
  background: var(--el-color-primary-light-9);
}

  .session-item.active {
}

.body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.title {
  display: block;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.meta {
  display: block;
  font-size: 10px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sep {
  margin: 0 4px;
}

.delete-btn {
  opacity: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--el-text-color-placeholder);
  padding: 2px;
  border-radius: 3px;
  transition: opacity 0.15s;
}

.session-item:hover .delete-btn {
  opacity: 0.5;
}

.delete-btn:hover {
  opacity: 1 !important;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.side-foot {
  padding: 4px;
  border-top: 1px solid var(--el-border-color-light);
}

.foot-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: left;
}

.foot-row:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.ico {
  font-size: 13px;
  width: 16px;
  text-align: center;
}
</style>
