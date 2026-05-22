<script setup lang="ts">
import { Icons } from "../../icons"
import { useSessionStore } from "../../../stores/session"
import type { PendingCheckpoint } from "../../../stores/session"

defineProps<{ cp: PendingCheckpoint }>()
const session = useSessionStore()
</script>

<template>
  <div class="approval" data-tone="brand">
    <div class="ap-head">
      <span class="ap-ico" v-html="Icons.mapPin()" />
      <div>
        <div class="ap-kind">检查点</div>
        <div class="ap-title">{{ cp.title ?? `步骤进度 ${cp.completed}/${cp.total}` }}</div>
        <div class="ap-sub">已完成 {{ cp.completed }} / {{ cp.total }}</div>
      </div>
    </div>
    <div class="ap-body">
      <div style="white-space: pre-wrap">{{ cp.result }}</div>
      <div v-if="cp.notes" style="margin-top: 8px; font-size: 12px; color: var(--el-text-color-secondary)">
        {{ cp.notes }}
      </div>
    </div>
    <div class="ap-foot">
      <button type="button" class="btn primary" @click="session.continueCheckpoint(cp.id)">继续</button>
      <button type="button" class="btn ghost" @click="session.stopCheckpoint(cp.id)">停止</button>
      <button type="button" class="btn ghost" @click="session.reviseCheckpoint(cp.id)">修改</button>
      <span class="grow" />
      <span class="meta">checkpoint · {{ cp.stepId }}</span>
    </div>
  </div>
</template>

<style scoped>
.approval {
  border: 1px solid var(--el-border-color); border-radius: 8px; padding: 14px;
  margin: 8px 0; background: var(--el-bg-color);
  border-left: 3px solid #a78bfa;
}
.ap-head { display: flex; gap: 10px; margin-bottom: 10px; }
.ap-ico { font-size: 18px; }
.ap-kind { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.ap-title { font-size: 14px; font-weight: 600; }
.ap-sub { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.ap-body { margin-bottom: 8px; font-size: 13px; line-height: 1.6; }

.ap-foot { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
.ap-foot .grow { flex: 1; }
.ap-foot .meta { font-size: 11px; color: var(--el-text-color-placeholder); font-family: ui-monospace, monospace; }

.btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid var(--el-border-color);
  background: var(--el-bg-color); cursor: pointer; font-size: 12px;
  color: var(--el-text-color-primary);
}
.btn.primary { background: var(--el-color-primary); color: #fff; border-color: var(--el-color-primary); }
.btn.primary:hover { opacity: 0.9; }
.btn.ghost { border-color: transparent; color: var(--el-text-color-secondary); }
.btn.ghost:hover { background: var(--el-fill-color-light); color: var(--el-text-color-primary); }
</style>
