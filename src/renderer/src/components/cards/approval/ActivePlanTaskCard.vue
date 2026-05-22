<script setup lang="ts">
import { computed } from "vue"
import { Icons } from "../../icons"
import type { ActivePlan } from "../../../stores/session"

const props = defineProps<{ plan: ActivePlan }>()

const done = computed(() => props.plan.completedStepIds.length)
const total = computed(() => props.plan.steps.length)
const pct = computed(() => (total.value > 0 ? (done.value / total.value) * 100 : 0))
</script>

<template>
  <div class="task-card">
    <div class="th">
      <span class="ico" v-html="Icons.list()" />
      <div>
        <div class="tt">活动计划</div>
        <div v-if="plan.summary" class="ss">{{ plan.summary }}</div>
      </div>
      <span class="grow" />
      <span class="ss">{{ done }}/{{ total }}</span>
      <div class="meter"><span :style="{ width: pct + '%' }" /></div>
    </div>
    <div class="tb">
      <div
        v-for="(step, idx) in plan.steps"
        :key="step.id"
        class="task-step"
        :data-state="plan.completedStepIds.includes(step.id) ? 'done' : idx === plan.completedStepIds.length ? 'running' : 'queued'"
      >
        <span class="nx">step.{{ idx + 1 }}</span>
        <span class="st" />
        <div class="l">
          {{ step.title }}
          <div v-if="step.action" class="h">{{ step.action }}</div>
        </div>
        <span class="t">—</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  border: 1px solid var(--el-border-color); border-radius: 8px; overflow: hidden;
  margin: 8px 0; background: var(--el-bg-color);
}
.task-card .th {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: var(--el-fill-color);
}
.task-card .th .ico { font-size: 14px; }
.task-card .th .tt { font-weight: 600; font-size: 13px; }
.task-card .th .ss { font-size: 11px; color: var(--el-text-color-secondary); }
.task-card .th .grow { flex: 1; }
.task-card .meter { width: 40px; height: 4px; background: var(--el-border-color); border-radius: 2px; overflow: hidden; }
.task-card .meter span { display: block; height: 100%; background: var(--el-color-primary); border-radius: 2px; }
.task-card .tb { padding: 4px 14px 8px; }
.task-step {
  display: flex; align-items: flex-start; gap: 6px;
  padding: 6px 0; font-size: 12px; border-bottom: 1px solid var(--el-border-color-light);
}
.task-step:last-child { border-bottom: none; }
.task-step[data-state="done"] { opacity: 0.6; }
.task-step .nx { min-width: 48px; font-family: ui-monospace, monospace; font-size: 10px; color: var(--el-text-color-placeholder); padding-top: 1px; }
.task-step .st { width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
.task-step[data-state="done"] .st { background: var(--el-color-success); }
.task-step[data-state="running"] .st { background: var(--el-color-primary); animation: pulse 1.2s ease-in-out infinite; }
.task-step[data-state="queued"] .st { background: var(--el-border-color); }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.task-step .l { flex: 1; min-width: 0; }
.task-step .h { font-size: 10px; color: var(--el-text-color-secondary); margin-top: 1px; }
.task-step .t { color: var(--el-text-color-placeholder); white-space: nowrap; font-size: 10px; }
</style>
