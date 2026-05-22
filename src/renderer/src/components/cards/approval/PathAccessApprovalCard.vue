<script setup lang="ts">
import { Icons } from "../../icons"
import { useSessionStore } from "../../../stores/session"
import type { PendingPathAccess } from "../../../stores/session"

defineProps<{ access: PendingPathAccess }>()
const session = useSessionStore()
</script>

<template>
  <div class="approval" data-tone="danger">
    <div class="ap-head">
      <span class="ap-ico" v-html="Icons.folder()" />
      <div>
        <div class="ap-kind">路径访问</div>
        <div class="ap-title">{{ access.intent === 'write' ? '写文件请求' : '读文件请求' }}（沙箱外）</div>
      </div>
    </div>
    <div class="ap-path">
      <div class="ap-path-label">工具</div>
      <div class="ap-path-value">{{ access.toolName }}</div>
      <div class="ap-path-label">路径</div>
      <div class="ap-path-value">{{ access.path }}</div>
      <div class="ap-path-label">操作</div>
      <div class="ap-path-value">{{ access.intent === 'write' ? '写入' : '读取' }}</div>
      <div style="margin-top: 6px; font-size: 11px; color: var(--el-text-color-placeholder)">
        工作区: {{ access.sandboxRoot }}
      </div>
    </div>
    <div class="ap-foot">
      <button type="button" class="btn primary" @click="session.approvePathAccess(access.id)">
        {{ access.intent === 'write' ? '允许写入' : '允许读取' }}
      </button>
      <button type="button" class="btn ghost" @click="session.rejectPathAccess(access.id)">拒绝</button>
      <button type="button" class="btn ghost" @click="session.alwaysAllowPathAccess(access.id, access.allowPrefix)">
        始终允许
      </button>
      <span class="grow" />
      <span class="meta">{{ access.intent }}</span>
    </div>
  </div>
</template>

<style scoped>
.approval {
  border: 1px solid var(--el-border-color); border-radius: 8px; padding: 14px;
  margin: 8px 0; background: var(--el-bg-color);
  border-left: 3px solid var(--el-color-danger);
}
.ap-head { display: flex; gap: 10px; margin-bottom: 10px; }
.ap-ico { font-size: 18px; }
.ap-kind { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; }
.ap-title { font-size: 14px; font-weight: 600; }

.ap-path { margin-bottom: 10px; }
.ap-path-label { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
.ap-path-value { font-size: 13px; font-family: ui-monospace, monospace; word-break: break-all; }

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
