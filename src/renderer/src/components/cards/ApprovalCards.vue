<script setup lang="ts">
// 审批卡片 — 计划/检查点/选择/确认/路径访问/修订
import { ElButton, ElMessageBox } from "element-plus"

const props = defineProps<{
  type: "plan" | "checkpoint" | "choice" | "confirm" | "path-access" | "revision"
  title?: string
  description?: string
  options?: { id: string; title: string; summary?: string }[]
  allowCustom?: boolean
  command?: string
  path?: string
  intent?: string
  plan?: string
  stepResult?: string
  notes?: string
  completed?: number
  total?: number
}>()

const emit = defineEmits<{
  approve: [feedback?: string]
  reject: [feedback?: string]
  cancel: []
  pick: [optionId: string]
  textInput: [text: string]
}>()

function getIcon(): string {
  switch (props.type) {
    case "plan": return "📋"
    case "checkpoint": return "✅"
    case "choice": return "❓"
    case "confirm": return "⚠️"
    case "path-access": return "🔒"
    case "revision": return "🔄"
  }
}

function getTitle(): string {
  switch (props.type) {
    case "plan": return "计划审批"
    case "checkpoint": return "检查点"
    case "choice": return "选择"
    case "confirm": return "确认执行"
    case "path-access": return "文件访问请求"
    case "revision": return "计划修订"
  }
}

async function handleChoice(optionId: string) {
  emit("pick", optionId)
}

function handleTextInput() {
  ElMessageBox.prompt("请输入：", "自定义输入")
    .then(({ value }) => emit("textInput", value))
    .catch(() => {})
}
</script>

<template>
  <div class="approval-card" :class="`approval-${type}`">
    <div class="approval-header">
      <span class="approval-icon">{{ getIcon() }}</span>
      <span class="approval-title">{{ title || getTitle() }}</span>
    </div>

    <div v-if="description" class="approval-description">{{ description }}</div>

    <!-- 计划内容 -->
    <pre v-if="plan" class="approval-plan">{{ plan }}</pre>

    <!-- 检查点 -->
    <div v-if="stepResult" class="approval-section">
      <div class="section-label">结果</div>
      <div class="section-body">{{ stepResult }}</div>
    </div>
    <div v-if="notes" class="approval-section">
      <div class="section-label">备注</div>
      <div class="section-body">{{ notes }}</div>
    </div>
    <div v-if="completed !== undefined && total !== undefined" class="approval-progress">
      进度: {{ completed }} / {{ total }}
    </div>

    <!-- 命令确认 -->
    <pre v-if="command" class="approval-command">{{ command }}</pre>

    <!-- 路径访问 -->
    <div v-if="path" class="approval-path">
      <div class="section-label">路径</div>
      <div class="section-body">{{ path }}</div>
      <div v-if="intent" class="section-label">意图</div>
      <div class="section-body">{{ intent }}</div>
    </div>

    <!-- 选项列表 -->
    <div v-if="options && options.length > 0" class="approval-options">
      <button
        v-for="opt in options"
        :key="opt.id"
        class="option-btn"
        @click="handleChoice(opt.id)"
      >
        <span class="option-title">{{ opt.title }}</span>
        <span v-if="opt.summary" class="option-summary">{{ opt.summary }}</span>
      </button>
      <button v-if="allowCustom" class="option-btn custom" @click="handleTextInput">
        自定义输入...
      </button>
    </div>

    <!-- 操作按钮 -->
    <div v-if="type === 'plan' || type === 'checkpoint' || type === 'confirm' || type === 'revision'" class="approval-actions">
      <el-button size="small" type="primary" @click="emit('approve')">批准</el-button>
      <el-button size="small" @click="emit('reject')">拒绝</el-button>
      <el-button size="small" @click="emit('cancel')">取消</el-button>
    </div>
  </div>
</template>

<style scoped>
.approval-card {
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 14px;
  margin: 8px 0;
}

.approval-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.approval-icon {
  font-size: 18px;
}

.approval-title {
  font-weight: 600;
  font-size: 14px;
}

.approval-description {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.approval-plan,
.approval-command {
  background: var(--el-bg-color);
  border-radius: 4px;
  padding: 10px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.approval-section {
  margin-bottom: 8px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.section-body {
  font-size: 13px;
}

.approval-progress {
  font-size: 12px;
  color: var(--el-color-primary);
  margin-bottom: 10px;
}

.approval-path {
  margin-bottom: 10px;
}

.approval-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.option-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s;
}

.option-btn:hover {
  border-color: var(--el-color-primary);
}

.option-btn.custom {
  border-style: dashed;
  color: var(--el-text-color-secondary);
}

.option-title {
  font-weight: 500;
  font-size: 13px;
}

.option-summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.approval-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
</style>
