<script setup lang="ts">
// 推理过程卡片 — 对照 desktop/src/ui/cards.tsx ReasoningCard
import { ref } from "vue"

defineProps<{
  text: string
  tokens?: number
  elapsed?: string
  model?: string
}>()

const open = ref(false)

function formatPara(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<span class="hl">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
}
</script>

<template>
  <div class="card" data-tone="violet" data-compact>
    <button class="card-head" @click="open = !open">
      <span class="ico">🧠</span>
      <span class="kind">reasoning</span>
      <span class="name">推理过程</span>
      <span class="grow" />
      <span class="meta">
        <span v-if="elapsed || tokens">
          {{ elapsed ?? '' }}{{ elapsed && tokens ? ' · ' : '' }}{{ tokens ? `${tokens.toLocaleString()} t` : '' }}
        </span>
        <span class="status-dot done" />
      </span>
      <span class="chev" :class="{ flipped: !open }">▾</span>
    </button>
    <div v-show="open" class="card-body">
      <div class="reason">
        <div class="stream">
          <p v-for="(para, i) in text.split(/\n\n+/)" :key="i" v-html="formatPara(para)" />
        </div>
        <div v-if="model || tokens !== undefined" class="meta-row">
          <span v-if="model"><span class="k">模型</span> {{ model }}</span>
          <span v-if="tokens !== undefined"><span class="k">token</span> {{ tokens.toLocaleString() }}</span>
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
.card[data-tone="violet"] { border-left: 3px solid #a78bfa; }
.card[data-compact] .card-head { padding: 6px 12px; }

.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  cursor: pointer;
  border: none;
  background: var(--el-fill-color);
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
}
.card-head:hover { background: var(--el-fill-color-light); }

.ico { font-size: 14px; width: 16px; text-align: center; }
.kind { font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
.name { font-weight: 500; font-size: 12px; color: var(--el-text-color-secondary); }
.grow { flex: 1; }

.meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--el-text-color-secondary); }

.status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
}
.status-dot.done { background: var(--el-color-success); }

.chev {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
  margin-left: 4px;
  transition: transform 0.15s;
}
.chev.flipped { transform: rotate(-90deg); }

.card-body { padding: 8px 14px; }

.reason .stream p {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
.reason :deep(.hl) {
  background: var(--el-color-primary-light-9);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
}

.meta-row {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-light);
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}
.meta-row .k { color: var(--el-text-color-secondary); }
</style>
