<script setup lang="ts">
// 工具调用卡片 — 对照 desktop/src/ui/cards.tsx ToolCard
import { ref, computed } from "vue"

const props = defineProps<{
  name: string
  args?: string
  result?: string
  ok?: boolean
  durationMs?: number
}>()

const open = ref(false)
const running = computed(() => props.result === undefined)
const tone = computed(() => {
  if (running.value) return "default"
  return props.ok === false ? "danger" : "success"
})

const statusIcon = computed(() => {
  if (running.value) return "⏳"
  return props.ok === false ? "✗" : "✓"
})
</script>

<template>
  <div class="card" :data-tone="tone" data-compact>
    <button class="card-head" @click="open = !open">
      <span class="ico">🔧</span>
      <span class="kind">tool</span>
      <span class="name">{{ name }}</span>
      <span class="grow" />
      <span class="meta">
        <span :class="['status-icon', running ? 'spin' : '']">{{ statusIcon }}</span>
        <span v-if="!running && durationMs !== undefined" class="meta-dur">{{ durationMs }} ms</span>
      </span>
      <span class="chev" :class="{ flipped: !open }">▾</span>
    </button>
    <div v-show="open" class="card-body">
      <div class="tool-call">
        <div v-if="args" class="row">
          <span class="k">args</span>
          <span class="v"><span class="str">{{ args.length > 600 ? args.slice(0, 600) + '…' : args }}</span></span>
        </div>
        <div v-if="result !== undefined" class="row">
          <span class="k">{{ ok === false ? 'error' : 'result' }}</span>
          <span class="v"><span :class="ok === false ? 'num' : 'str'">{{ result.length > 1200 ? result.slice(0, 1200) + '…' : result }}</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  margin: 8px 0;
  background: var(--el-bg-color);
}
.card[data-tone="success"] { border-left: 3px solid var(--el-color-success); }
.card[data-tone="danger"] { border-left: 3px solid var(--el-color-danger); }
.card[data-tone="default"] { border-left: 3px solid var(--el-border-color); }
.card[data-compact] .card-head { padding: 6px 12px; }

.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  cursor: pointer;
  user-select: none;
  background: var(--el-fill-color);
  font-size: 12px;
}
.card-head:hover { background: var(--el-fill-color-light); }

.ico { font-size: 14px; width: 16px; text-align: center; }
.kind { font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
.name { font-weight: 500; font-size: 12px; font-family: ui-monospace, monospace; }
.grow { flex: 1; }

.meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--el-text-color-secondary); }
.status-icon { font-size: 12px; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.meta-dur { font-family: ui-monospace, monospace; }

.chev { font-size: 10px; color: var(--el-text-color-placeholder); margin-left: 4px; }

.card-body { padding: 8px 14px; }
.tool-call .row { display: flex; gap: 8px; padding: 3px 0; font-size: 12px; align-items: flex-start; }
.tool-call .k { font-weight: 600; color: var(--el-text-color-secondary); min-width: 40px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; padding-top: 2px; }
.tool-call .v { flex: 1; min-width: 0; }
.tool-call .str { font-family: ui-monospace, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
.tool-call .num { font-family: ui-monospace, monospace; font-size: 12px; color: var(--el-color-danger); white-space: pre-wrap; word-break: break-word; }
</style>
