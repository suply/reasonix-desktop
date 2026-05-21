<script setup lang="ts">
// 审批卡片 — 对照 desktop/src/ui/extra-cards.tsx + thread.tsx
// 支持: PlanApprovalCard / CheckpointApprovalCard / ChoiceApprovalCard /
//       ConfirmApprovalCard / PathAccessApprovalCard / RevisionApprovalCard
import { ElButton } from "element-plus"

defineProps<{
  kind: string
  tone?: "ok" | "warn" | "danger" | "info" | "brand" | "ghost"
  title: string
  sub?: string
  body?: string
  preview?: string
  meta?: string
  command?: string
  path?: string
  intent?: string
  options?: { id: string; title: string; summary?: string }[]
  allowCustom?: boolean
  stepResult?: string
  notes?: string
  completed?: number
  total?: number
}>()

const emit = defineEmits<{
  primary: []
  secondary: []
  tertiary: []
  pick: [optionId: string]
  textInput: []
}>()
</script>

<template>
  <div class="approval" :data-tone="tone ?? 'info'">
    <!-- 头部 -->
    <div class="ap-head">
      <span class="ap-ico">🛡️</span>
      <div>
        <div class="ap-kind">{{ kind }}</div>
        <div class="ap-title">{{ title }}</div>
        <div v-if="sub" class="ap-sub">{{ sub }}</div>
      </div>
    </div>

    <!-- 预览区（命令/路径等） -->
    <div v-if="preview" class="ap-preview">{{ preview }}</div>

    <!-- 命令 -->
    <pre v-if="command" class="ap-code">{{ command }}</pre>

    <!-- 路径+意图 -->
    <div v-if="path" class="ap-path">
      <div class="ap-path-label">路径</div>
      <div class="ap-path-value">{{ path }}</div>
      <div v-if="intent" class="ap-path-label">意图</div>
      <div class="ap-path-value">{{ intent }}</div>
    </div>

    <!-- 检查点结果 -->
    <div v-if="stepResult" class="ap-body">
      <div class="ap-body-label">结果</div>
      <div class="ap-body-text">{{ stepResult }}</div>
    </div>
    <div v-if="notes" class="ap-body">
      <div class="ap-body-label">备注</div>
      <div class="ap-body-text">{{ notes }}</div>
    </div>
    <div v-if="completed !== undefined && total !== undefined" class="ap-progress">
      步骤 {{ completed }} / {{ total }}
    </div>

    <!-- 选项列表 -->
    <div v-if="options && options.length > 0" class="ap-options">
      <button
        v-for="opt in options"
        :key="opt.id"
        class="ap-option"
        @click="emit('pick', opt.id)"
      >
        <div class="ap-option-title">{{ opt.title }}</div>
        <div v-if="opt.summary" class="ap-option-summary">{{ opt.summary }}</div>
      </button>
      <button v-if="allowCustom" class="ap-option ap-option-custom" @click="emit('textInput')">
        自定义输入...
      </button>
    </div>

    <!-- 底部按钮 -->
    <div class="ap-foot">
      <ElButton size="small" type="primary" @click="emit('primary')">批准</ElButton>
      <ElButton size="small" @click="emit('secondary')">拒绝</ElButton>
      <ElButton size="small" @click="emit('tertiary')">取消</ElButton>
    </div>
  </div>
</template>

<style scoped>
.approval {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 14px;
  margin: 8px 0;
  background: var(--el-bg-color);
}
.approval[data-tone="warn"] { border-left: 3px solid var(--el-color-warning); }
.approval[data-tone="danger"] { border-left: 3px solid var(--el-color-danger); }
.approval[data-tone="info"] { border-left: 3px solid var(--el-color-primary); }
.approval[data-tone="brand"] { border-left: 3px solid #a78bfa; }
.approval[data-tone="ok"] { border-left: 3px solid var(--el-color-success); }
.approval[data-tone="ghost"] { border-left: 3px solid var(--el-border-color); }

.ap-head { display: flex; gap: 10px; margin-bottom: 10px; }
.ap-ico { font-size: 18px; }
.ap-kind { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.ap-title { font-size: 14px; font-weight: 600; margin-top: 2px; }
.ap-sub { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }

.ap-preview {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 10px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  margin-bottom: 10px;
  line-height: 1.5;
}

.ap-code {
  background: var(--el-fill-color);
  border-radius: 6px;
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

.ap-path { margin-bottom: 10px; }
.ap-path-label { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
.ap-path-value { font-size: 13px; font-family: ui-monospace, monospace; word-break: break-all; }

.ap-body { margin-bottom: 8px; }
.ap-body-label { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.ap-body-text { font-size: 13px; line-height: 1.5; }
.ap-progress { font-size: 12px; color: var(--el-color-primary); margin-bottom: 10px; }

.ap-options { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.ap-option {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color); border-radius: 6px;
  background: var(--el-bg-color); cursor: pointer;
  text-align: left; transition: border-color 0.15s;
}
.ap-option:hover { border-color: var(--el-color-primary); }
.ap-option-custom { border-style: dashed; color: var(--el-text-color-secondary); }
.ap-option-title { font-weight: 500; font-size: 13px; }
.ap-option-summary { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }

.ap-foot { display: flex; gap: 8px; margin-top: 10px; }
</style>
