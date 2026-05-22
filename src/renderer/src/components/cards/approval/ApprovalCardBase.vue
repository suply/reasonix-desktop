<script setup lang="ts">
// 通用审批卡片基底
import { Icons } from "../../icons"

defineProps<{
  kind: string
  tone?: "ok" | "warn" | "danger" | "info" | "brand" | "ghost"
  title: string
  sub?: string
  body?: string
  preview?: string
  meta?: string
  primaryLabel?: string
  secondaryLabel?: string
  tertiaryLabel?: string
}>()

defineEmits<{
  primary: []
  secondary: []
  tertiary: []
}>()
</script>

<template>
  <div class="approval" :data-tone="tone ?? 'info'">
    <div class="ap-head">
      <span class="ap-ico" v-html="Icons.shield()" />
      <div>
        <div class="ap-kind">{{ kind }}</div>
        <div class="ap-title">{{ title }}</div>
        <div v-if="sub" class="ap-sub">{{ sub }}</div>
      </div>
    </div>
    <!-- body 在前，preview 在后，与源码一致 -->
    <div v-if="body" class="ap-body">
      <div class="ap-body-text" style="white-space: pre-wrap">{{ body }}</div>
    </div>
    <div v-if="preview" class="ap-preview"><div style="white-space: pre-wrap">{{ preview }}</div></div>
    <slot />
    <div class="ap-foot">
      <button v-if="primaryLabel" type="button" class="btn primary" @click="$emit('primary')">
        {{ primaryLabel }}
      </button>
      <button v-if="secondaryLabel" type="button" class="btn ghost" @click="$emit('secondary')">
        {{ secondaryLabel }}
      </button>
      <button v-if="tertiaryLabel" type="button" class="btn ghost" @click="$emit('tertiary')">
        {{ tertiaryLabel }}
      </button>
      <span class="grow" />
      <span v-if="meta" class="meta">{{ meta }}</span>
    </div>
  </div>
</template>

<style scoped>
.approval {
  border: 1px solid var(--el-border-color); border-radius: 8px; padding: 14px;
  margin: 8px 0; background: var(--el-bg-color);
}
.approval[data-tone="warn"] { border-left: 3px solid var(--el-color-warning); }
.approval[data-tone="danger"] { border-left: 3px solid var(--el-color-danger); }
.approval[data-tone="info"] { border-left: 3px solid var(--el-color-primary); }
.approval[data-tone="brand"] { border-left: 3px solid #a78bfa; }
.approval[data-tone="ok"] { border-left: 3px solid var(--el-color-success); }
.approval[data-tone="ghost"] { border-left: 3px solid var(--el-border-color); }

.ap-head { display: flex; gap: 10px; margin-bottom: 10px; }
.ap-ico { font-size: 18px; line-height: 1.4; }
.ap-kind { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.ap-title { font-size: 14px; font-weight: 600; margin-top: 2px; }
.ap-sub { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.ap-preview { font-size: 13px; color: var(--el-text-color-secondary); padding: 10px; background: var(--el-fill-color-light); border-radius: 6px; margin-bottom: 10px; line-height: 1.5; }
.ap-body { margin-bottom: 8px; }
.ap-body-text { font-size: 13px; line-height: 1.6; }

.ap-foot { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
.ap-foot .grow { flex: 1; }
.ap-foot .meta { font-size: 11px; color: var(--el-text-color-placeholder); font-family: ui-monospace, monospace; }

.btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid var(--el-border-color);
  background: var(--el-bg-color); cursor: pointer; font-size: 12px; line-height: 1.4;
  color: var(--el-text-color-primary); transition: background .1s;
}
.btn:hover { background: var(--el-fill-color-light); }
.btn.primary { background: var(--el-color-primary); color: #fff; border-color: var(--el-color-primary); }
.btn.primary:hover { opacity: 0.9; }
.btn.ghost { border-color: transparent; color: var(--el-text-color-secondary); }
.btn.ghost:hover { background: var(--el-fill-color-light); color: var(--el-text-color-primary); }
</style>
