<script setup lang="ts">
import { Icons } from "../../icons"
import { useSessionStore } from "../../../stores/session"
import type { PendingRevision } from "../../../stores/session"

defineProps<{ revision: PendingRevision }>()
const session = useSessionStore()
</script>

<template>
  <div class="approval" data-tone="warn">
    <div class="ap-head">
      <span class="ap-ico" v-html="Icons.refreshCcw()" />
      <div>
        <div class="ap-kind">计划修改</div>
        <div class="ap-title">AI 建议修改计划</div>
        <div class="ap-sub">剩余 {{ revision.remainingSteps.length }} 个步骤</div>
      </div>
    </div>
    <div class="ap-body">
      <div style="margin-bottom: 8px">{{ revision.reason }}</div>
      <div v-if="revision.summary" style="font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 8px">
        {{ revision.summary }}
      </div>
      <ul style="margin: 0; padding-left: 18px">
        <li v-for="s in revision.remainingSteps" :key="s.id" style="font-size: 12px; margin-bottom: 2px">
          {{ s.title }}
          <span v-if="s.risk" :style="{
            marginLeft: 6, fontSize: 10,
            color: s.risk === 'high' ? 'var(--el-color-danger)'
              : s.risk === 'med' ? 'var(--el-color-warning)' : 'var(--el-text-color-secondary)'
          }">[{{ s.risk }}]</span>
        </li>
      </ul>
    </div>
    <div class="ap-foot">
      <button type="button" class="btn primary" @click="session.acceptRevision(revision.id)">接受修改</button>
      <button type="button" class="btn ghost" @click="session.rejectRevision(revision.id)">保留原计划</button>
      <span class="grow" />
      <span class="meta">修改方案</span>
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
.ap-sub { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.ap-body { margin-bottom: 8px; font-size: 13px; line-height: 1.6; }

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
