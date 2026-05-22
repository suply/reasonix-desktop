<script setup lang="ts">
import { Icons } from "../../icons"
import { useSessionStore } from "../../../stores/session"
import type { PendingConfirm } from "../../../stores/session"

defineProps<{ confirm: PendingConfirm }>()
const session = useSessionStore()
</script>

<template>
  <div class="approval" data-tone="warn">
    <div class="ap-head">
      <span class="ap-ico" v-html="Icons.terminal()" />
      <div>
        <div class="ap-kind">Shell 确认</div>
        <div class="ap-title">{{ confirm.kind === 'run_background' ? '后台命令等待执行' : '命令等待执行' }}</div>
      </div>
    </div>
    <pre class="ap-code">$ {{ confirm.command }}</pre>
    <div class="ap-foot">
      <button type="button" class="btn primary" @click="session.approveConfirm(confirm.id)">执行</button>
      <button type="button" class="btn ghost" @click="session.rejectConfirm(confirm.id)">拒绝</button>
      <button type="button" class="btn ghost"
        @click="session.alwaysAllowConfirm(confirm.id, confirm.command.match(/^\S+/)?.[0] ?? confirm.command)">
        始终允许
      </button>
      <span class="grow" />
      <span class="meta">{{ confirm.kind === 'run_background' ? '后台' : '前台' }}</span>
    </div>
  </div>
</template>

<style scoped>
.approval {
  border: 1px solid var(--el-border-color); border-radius: 8px; padding: 14px;
  margin: 8px 0; background: var(--el-bg-color);
  border-left: 3px solid var(--el-color-warning);
}
.ap-head { display: flex; gap: 10px; margin-bottom: 10px; }
.ap-ico { font-size: 18px; }
.ap-kind { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; }
.ap-title { font-size: 14px; font-weight: 600; }

.ap-code {
  background: var(--el-fill-color); border-radius: 6px; padding: 10px;
  font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word;
  margin-bottom: 10px; max-height: 200px; overflow-y: auto;
}

.ap-foot { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
.ap-foot .grow { flex: 1; }
.ap-foot .meta { font-size: 11px; color: var(--el-text-color-placeholder); }

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
