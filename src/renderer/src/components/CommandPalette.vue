<script setup lang="ts">
// 命令面板 — Ctrl+K 全局快捷键
import { ref, computed, watch, nextTick } from "vue"

export type CommandGroup = "nav" | "action" | "workspace" | "settings"

export interface CommandItem {
  id: string
  label: string
  hint?: string
  icon: string  // emoji 作为简易图标
  shortcut?: string[]
  group: CommandGroup
  run: () => void
}

const props = defineProps<{
  open: boolean
  commands: CommandItem[]
}>()

const emit = defineEmits<{
  close: []
}>()

const query = ref("")
const activeIdx = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLDivElement | null>(null)

const GROUP_LABELS: Record<CommandGroup, string> = {
  nav: "导航",
  action: "操作",
  workspace: "工作区",
  settings: "设置",
}

const GROUP_ORDER: CommandGroup[] = ["nav", "action", "workspace", "settings"]

// 过滤
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.commands
  return props.commands.filter((c) =>
    [c.label, c.hint].filter(Boolean).join(" ").toLowerCase().includes(q),
  )
})

// 分组
const grouped = computed(() => {
  const byGroup = new Map<CommandGroup, CommandItem[]>()
  for (const c of filtered.value) {
    const arr = byGroup.get(c.group) ?? []
    arr.push(c)
    byGroup.set(c.group, arr)
  }
  return GROUP_ORDER
    .map((g) => ({ group: g, items: byGroup.get(g) ?? [] }))
    .filter((s) => s.items.length > 0)
})

// 打开时重置
watch(
  () => props.open,
  (v) => {
    if (v) {
      query.value = ""
      activeIdx.value = 0
      nextTick(() => inputRef.value?.focus())
    }
  },
)

// 选中项滚动可见
watch(activeIdx, () => {
  nextTick(() => {
    const el = listRef.value?.querySelector<HTMLElement>(`[data-idx="${activeIdx.value}"]`)
    el?.scrollIntoView({ block: "nearest" })
  })
})

function run(cmd: CommandItem) {
  cmd.run()
  emit("close")
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, filtered.value.length - 1)
  } else if (e.key === "ArrowUp") {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, 0)
  } else if (e.key === "Enter") {
    e.preventDefault()
    const cmd = filtered.value[activeIdx.value]
    if (cmd) run(cmd)
  } else if (e.key === "Escape") {
    emit("close")
  }
}

function shortcutText(keys: string[]): string {
  return keys.map((k) => (k === "mod" ? "⌘" : k === "esc" ? "ESC" : k)).join(" + ")
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cmdk-mask" @click.self="emit('close')">
      <div class="cmdk">
        <!-- 搜索栏 -->
        <div class="cmdk-head">
          <span class="search-icon">🔍</span>
          <input
            ref="inputRef"
            v-model="query"
            placeholder="搜索命令..."
            @keydown="onKeydown"
          />
          <span class="hint-key">ESC</span>
        </div>

        <!-- 命令列表 -->
        <div class="cmdk-body" ref="listRef">
          <div v-if="filtered.length === 0" class="cmdk-empty">
            没有匹配的命令
          </div>

          <div v-for="section in grouped" :key="section.group" class="cmdk-group">
            <div class="cmdk-gh">{{ GROUP_LABELS[section.group] }}</div>
            <div
              v-for="c in section.items"
              :key="c.id"
              :data-idx="filtered.indexOf(c)"
              class="cmdk-row"
              :class="{ active: filtered.indexOf(c) === activeIdx }"
              @mouseenter="activeIdx = filtered.indexOf(c)"
              @click="run(c)"
            >
              <span class="ic">{{ c.icon }}</span>
              <span class="label">{{ c.label }}</span>
              <span class="group-hint">{{ GROUP_LABELS[c.group] }}</span>
              <span v-if="c.shortcut" class="kb">{{ shortcutText(c.shortcut) }}</span>
            </div>
          </div>
        </div>

        <!-- 底部帮助 -->
        <div class="cmdk-foot">
          <span>↑↓ 移动</span>
          <span>↵ 执行</span>
          <span>ESC 关闭</span>
          <span class="count">{{ filtered.length }} 项</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cmdk-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  background: rgba(0, 0, 0, 0.4);
}

.cmdk {
  width: 520px;
  max-width: 90vw;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.cmdk-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.search-icon {
  font-size: 16px;
}

.cmdk-head input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.hint-key {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.cmdk-body {
  max-height: 350px;
  overflow-y: auto;
  padding: 8px 0;
}

.cmdk-group {
  padding: 4px 0;
}

.cmdk-gh {
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cmdk-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.1s;
}

.cmdk-row.active,
.cmdk-row:hover {
  background: var(--el-color-primary-light-9);
}

.cmdk-row .ic {
  width: 20px;
  text-align: center;
  font-size: 14px;
}

.cmdk-row .label {
  flex: 1;
}

.cmdk-row .group-hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-right: 8px;
}

.cmdk-row .kb {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, monospace;
}

.cmdk-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--el-text-color-placeholder);
}

.cmdk-foot {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  border-top: 1px solid var(--el-border-color-light);
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.cmdk-foot .count {
  margin-left: auto;
}
</style>
