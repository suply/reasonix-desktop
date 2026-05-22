<script setup lang="ts">
import { computed } from "vue"
import { Icons } from "../../icons"
import type { ActivePlan } from "../../../stores/session"

const props = defineProps<{ plan: ActivePlan }>()
defineEmits<{ dismiss: [] }>()

const total = computed(() => Math.max(props.plan.steps.length, 1))
const done = computed(() => props.plan.completedStepIds.length)
const pct = computed(() => (done.value / total.value) * 100)
const current = computed(() =>
  props.plan.steps.find((s) => !props.plan.completedStepIds.includes(s.id)),
)
</script>

<template>
  <div class="plan-banner">
    <span class="ico" v-html="Icons.list()" />
    <div class="body">
      <div class="t">
        计划执行中 — 步骤 {{ Math.min(done + 1, total) }} / {{ total }}
        <template v-if="current"> — {{ current.title }}</template>
      </div>
      <div class="s">{{ plan.plan }}</div>
    </div>
    <div class="prog">
      <div class="meter-mini">
        <span :style="{ width: pct + '%' }" />
      </div>
      <button type="button" @click="$emit('dismiss')">收起</button>
    </div>
  </div>
</template>

<style scoped>
.plan-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; margin: 8px 0;
  border: 1px solid var(--el-border-color); border-radius: 8px;
  background: var(--el-color-primary-light-9);
  font-size: 13px;
}
.plan-banner .ico { font-size: 16px; }
.plan-banner .body { flex: 1; min-width: 0; }
.plan-banner .t { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plan-banner .s { font-size: 11px; color: var(--el-text-color-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plan-banner .prog { display: flex; align-items: center; gap: 8px; }
.meter-mini { width: 60px; height: 4px; background: var(--el-fill-color); border-radius: 2px; overflow: hidden; }
.meter-mini span { display: block; height: 100%; background: var(--el-color-primary); border-radius: 2px; transition: width .3s; }
.plan-banner button { border: none; background: transparent; cursor: pointer; font-size: 11px; color: var(--el-text-color-secondary); white-space: nowrap; }
.plan-banner button:hover { color: var(--el-text-color-primary); }
</style>
