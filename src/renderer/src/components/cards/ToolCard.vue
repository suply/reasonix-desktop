<script setup lang="ts">
// 工具调用卡片 — 对照 desktop/src/ui/cards.tsx ToolCard
import { ref, computed } from "vue"
import { Icons } from "../icons"

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
  if (running.value) return "spin"
  return props.ok === false ? "x" : "check"
})
</script>

<template>
  <div class="card" :data-tone="tone" data-compact>
    <button class="card-head" @click="open = !open">
      <span class="ico" v-html="Icons.wrench()" />
      <span class="kind">tool</span>
      <span class="name">{{ name }}</span>
      <span class="grow" />
      <span class="meta">
        <span v-if="running" class="spin" />
        <span v-else-if="statusIcon === 'check'" class="status-icon ok" v-html="Icons.check()" />
        <span v-else class="status-icon err" v-html="Icons.x()" />
        <span v-if="!running" class="meta-dur">{{ durationMs !== undefined ? durationMs + ' ms' : '0 ms' }}</span>
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
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  margin: 8px 0;
  background: var(--el-bg-color);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.card[data-compact] .card-head { padding: 6px 12px; }

.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  cursor: pointer;
  border: none;
  width: 100%;
  background: var(--el-fill-color);
  font-size: 12px;
  text-align: left;
  font: inherit;
  color: inherit;
}
.card-head:hover { background: var(--el-fill-color-light); }

.ico { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; }
.kind { font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
.name { font-weight: 500; font-size: 12px; font-family: ui-monospace, monospace; }
.grow { flex: 1; }

.meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--el-text-color-secondary); }
.spin {
  display: inline-block;
  width: 10px; height: 10px;
  border: 2px solid var(--el-border-color);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.status-icon { display: flex; }
.status-icon.ok { color: var(--el-color-success); }
.status-icon.err { color: var(--el-color-danger); }
@keyframes spin { to { transform: rotate(360deg); } }
.meta-dur { font-family: ui-monospace, monospace; font-size: 10px; color: var(--el-text-color-placeholder); white-space: nowrap; }

.chev { font-size: 10px; color: var(--el-text-color-placeholder); margin-left: 4px; }

.card-body { padding: 8px 14px; }
.tool-call .row { display: flex; gap: 8px; padding: 3px 0; font-size: 12px; align-items: flex-start; }
.tool-call .k { font-weight: 600; color: var(--el-text-color-secondary); min-width: 40px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; padding-top: 2px; }
.tool-call .v { flex: 1; min-width: 0; }
.tool-call .str { font-family: ui-monospace, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
.tool-call .num { font-family: ui-monospace, monospace; font-size: 12px; color: var(--el-color-danger); white-space: pre-wrap; word-break: break-word; }
</style>
