<script setup lang="ts">
// Shell 命令执行卡片 — 对照 desktop/src/ui/cards.tsx ShellCard
import { computed } from "vue"

const props = defineProps<{
  command: string
  output?: string
  state: "await" | "running" | "done" | "failed"
  durationMs?: number
  onApprove?: () => void
  onReject?: () => void
  onAlwaysAllow?: () => void
}>()

const emit = defineEmits<{
  approve: []
  reject: []
  alwaysAllow: []
}>()

const tone = computed(() => {
  if (props.state === "failed") return "danger"
  if (props.state === "done") return "success"
  return "warning"
})

const statusIcon = computed(() => {
  switch (props.state) {
    case "await": return "●"
    case "running": return "⏳"
    case "done": return "✓"
    case "failed": return "✗"
  }
})

// 高亮输出中的 ✓/✗/error 行
function highlightLine(ln: string): string {
  const trimmed = ln.trim()
  if (trimmed.startsWith("✓")) return `<span class="ok">${ln}</span>`
  if (trimmed.startsWith("✗") || /error/i.test(trimmed)) return `<span class="err">${ln}</span>`
  return ln
}
</script>

<template>
  <div class="card" :data-tone="tone" data-compact>
    <div class="card-head">
      <span class="ico">💻</span>
      <span class="kind">shell</span>
      <span class="name">shell</span>
      <span class="grow" />
      <span class="meta">
        <span :class="['status-icon', state === 'running' ? 'spin' : '']">{{ statusIcon }}</span>
        <span v-if="(state === 'done' || state === 'failed') && durationMs" class="meta-dur">
          {{ (durationMs / 1000).toFixed(2) }}s
        </span>
      </span>
      <span class="chev">▾</span>
    </div>
    <div class="card-body">
      <div class="shell">
        <div class="cmd-line">
          <span class="prompt">$</span>
          <span class="cmd-text">{{ command }}</span>
        </div>
        <pre v-if="output" class="output">
          <div v-for="(ln, i) in output.split('\n')" :key="i" v-html="highlightLine(ln)" />
        </pre>
      </div>
    </div>

    <!-- 待审批 -->
    <div v-if="state === 'await'" class="approve-row">
      <div class="why">
        <b>等待执行</b> — 是否允许执行此命令？
      </div>
      <div class="actions">
        <button v-if="onAlwaysAllow" class="btn ghost" @click="emit('alwaysAllow')">始终允许</button>
        <button v-if="onReject" class="btn" @click="emit('reject')">拒绝</button>
        <button class="btn primary" @click="emit('approve')">运行</button>
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
.card[data-tone="warning"] { border-left: 3px solid var(--el-color-warning); }
.card[data-compact] .card-head { padding: 6px 12px; }

.card-head {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; cursor: pointer; user-select: none;
  background: var(--el-fill-color); font-size: 12px;
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

.shell .cmd-line {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; background: var(--el-fill-color-light); border-radius: 4px;
  font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.5;
}
.prompt { color: var(--el-color-success); font-weight: 700; }
.cmd-text { color: var(--el-text-color-primary); }

.output {
  margin-top: 6px; padding: 6px 8px;
  font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.5;
  background: var(--el-bg-color-page); border-radius: 4px;
  max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;
}
.output :deep(.ok) { color: var(--el-color-success); }
.output :deep(.err) { color: var(--el-color-danger); }

.approve-row {
  padding: 8px 14px; border-top: 1px solid var(--el-border-color-light);
  background: var(--el-color-warning-light-9);
}
.why { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 6px; line-height: 1.4; }
.actions { display: flex; gap: 6px; justify-content: flex-end; }
.actions .btn {
  padding: 4px 10px; border-radius: 4px; border: 1px solid var(--el-border-color);
  background: var(--el-bg-color); cursor: pointer; font-size: 12px;
}
.actions .btn:hover { background: var(--el-fill-color-light); }
.actions .btn.primary { background: var(--el-color-primary); color: #fff; border-color: var(--el-color-primary); }
.actions .btn.primary:hover { opacity: 0.9; }
.actions .btn.ghost { border: none; color: var(--el-text-color-secondary); }
.actions .btn.ghost:hover { color: var(--el-text-color-primary); }
</style>
