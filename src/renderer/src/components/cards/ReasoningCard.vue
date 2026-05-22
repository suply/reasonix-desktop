<script setup lang="ts">
// 推理过程卡片 — 对照 desktop/src/ui/cards.tsx ReasoningCard
import { Icons } from "../icons"
import { ref, computed } from "vue"

const props = defineProps<{
  text: string
  streaming?: boolean
  defaultOpen?: boolean
  tokens?: number
  elapsed?: string
  model?: string
}>()

const open = ref(props.streaming || props.defaultOpen || false)

/** 流式时始终展开；defaultOpen 首次展开后可折叠 */
const isOpen = computed(() => props.streaming ? true : open.value)

function toggle() {
  if (!props.streaming) open.value = !open.value
}

function formatPara(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<span class="hl">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
}
</script>

<template>
  <div class="card" data-tone="violet" data-compact>
    <button class="card-head" @click="toggle">
      <span class="ico">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V4" />
          <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3" />
        </svg>
      </span>
      <span class="kind">reasoning</span>
      <span class="name">思考</span>
      <span class="grow" />
      <span class="meta">
        <span v-if="elapsed || tokens">
          {{ elapsed ?? '' }}{{ elapsed && tokens ? ' · ' : '' }}{{ tokens ? `${tokens.toLocaleString()} t` : '' }}
        </span>
        <span v-if="streaming" class="spin-meta" />
        <span v-else class="status-icon ok" v-html="Icons.check()" />
      </span>
      <span class="chev" :class="{ flipped: !isOpen }">▾</span>
    </button>
    <div v-show="isOpen" class="card-body">
      <div class="reason">
        <div class="stream">
          <p v-for="(para, i) in text.split(/\n\n+/)" :key="i" v-html="formatPara(para)" />
        </div>
        <div v-if="model || tokens !== undefined" class="meta-row">
          <span v-if="model"><span class="k">模型</span> {{ model }}</span>
          <span v-if="tokens !== undefined"><span class="k">tokens</span> {{ tokens.toLocaleString() }}</span>
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
  background: var(--el-fill-color);
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
}
.card-head:hover { background: var(--el-fill-color-light); }

.ico { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; }
.kind { font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
.name { font-weight: 500; font-size: 12px; color: var(--el-text-color-secondary); }
.grow { flex: 1; }

.meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--el-text-color-secondary); }

.spin-meta {
  display: inline-block;
  width: 10px; height: 10px;
  border: 2px solid var(--el-border-color);
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.status-icon.ok {
  font-size: 12px;
  color: var(--el-color-success);
  font-weight: 700;
}

@keyframes spin { to { transform: rotate(360deg); } }

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
