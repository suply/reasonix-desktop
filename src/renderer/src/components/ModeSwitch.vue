<script setup lang="ts">
// 编辑模式切换 — 对照 desktop/src/ui/composer.tsx ModeSwitch
import type { EditMode } from "../stores/settings"

defineProps<{
  mode: EditMode
}>()

const emit = defineEmits<{
  change: [mode: EditMode]
}>()

const MODES: { k: EditMode; label: string; hint: string }[] = [
  { k: "review", label: "手动", hint: "需要批准后再执行 — 安全模式" },
  { k: "auto", label: "自动", hint: "安全命令自动执行，风险命令需批准" },
  { k: "yolo", label: "信任", hint: "自动执行所有命令 — 高风险" },
]
</script>

<template>
  <div class="mode-switch" :data-mode="mode">
    <template v-for="(m, i) in MODES" :key="m.k">
      <span v-if="i > 0" class="sep">/</span>
      <button
        type="button"
        class="ms-seg"
        :data-on="mode === m.k"
        :data-k="m.k"
        @click="emit('change', m.k)"
        :title="m.hint"
      >
        <span>{{ m.label }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.mode-switch {
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
}
.sep {
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  line-height: 1;
  user-select: none;
  margin: 0 1px;
}

.ms-seg {
  padding: 1px 3px;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-text-color-placeholder);
  transition: color .12s, background .12s;
}
.ms-seg:hover {
  color: var(--el-text-color-primary);
}
.ms-seg[data-on="true"] {
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.ms-seg[data-k="yolo"]:hover,
.ms-seg[data-k="yolo"][data-on="true"] {
  color: var(--el-color-danger);
}
</style>
