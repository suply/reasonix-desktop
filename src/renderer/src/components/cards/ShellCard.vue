<script setup lang="ts">
// Shell 命令执行卡片 — 对照 desktop/src/ui/cards.tsx ShellCard
import { ref, computed } from "vue"
import { Icons } from "../icons"

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

const open = ref(true)
const tone = computed(() => {
  if (props.state === "failed") return "danger"
  if (props.state === "done") return "success"
  return "warning"
})

// 状态图标类型："dot" | "spinner" | "check" | "x"
const statusType = computed(() => {
  switch (props.state) {
    case "await": return "dot"
    case "running": return "spinner"
    case "done": return "check"
    case "failed": return "x"
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
    <button class="card-head" @click="open = !open">
      <span class="ico" v-html="Icons.terminal()" />
      <span class="kind">shell</span>
      <span class="name">shell</span>
      <span class="grow" />
      <span class="meta">
        <span v-if="statusType === 'dot'" class="status-dot warn" />
        <span v-else-if="statusType === 'spinner'" class="spin-meta" />
        <span v-else-if="statusType === 'check'" class="status-icon ok" v-html="Icons.check()" />
        <span v-else class="status-icon err" v-html="Icons.x()" />
        <span v-if="state === 'done' || state === 'failed'" class="meta-dur">{{ durationMs !== undefined ? (durationMs / 1000).toFixed(2) + 's' : '0.00s' }}</span>
      </span>
      <span class="chev" :class="{ flipped: !open }">▾</span>
    </button>
    <div v-show="open" class="card-body">
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

    <!-- 待审批 — 原版：展开/折叠均可见 -->
    <div v-if="state === 'await' && onApprove" class="approve-row">
      <div class="why">
        <b>等待批准</b> — 执行此命令
      </div>
      <div class="actions">
        <button v-if="onAlwaysAllow" class="btn ghost" @click="emit('alwaysAllow')">始终允许</button>
        <button v-if="onReject" class="btn" @click="emit('reject')">拒绝 <span class="shortcut">⌘.</span></button>
        <button class="btn primary" @click="emit('approve')">运行 <span class="shortcut">⌘↵</span></button>
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
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; cursor: pointer;
  border: none;
  width: 100%;
  background: var(--el-fill-color); font-size: 12px;
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

.status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
}
.status-dot.warn { background: var(--el-color-warning); }

.spin-meta {
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
.chev { font-size: 10px; color: var(--el-text-color-placeholder); margin-left: 4px; transition: transform 0.15s; }
.chev.flipped { transform: rotate(-90deg); }

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
.actions .shortcut {
  font-size: 10px;
  opacity: 0.6;
  margin-left: 2px;
}
</style>
