<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue"
import { useSessionStore } from "../stores/session"
import { useSettingsStore } from "../stores/settings"
import type { EditMode } from "../stores/settings"
import ModeSwitch from "./ModeSwitch.vue"

const session = useSessionStore()
const settings = useSettingsStore()

function setEditMode(mode: EditMode) {
  settings.settings.editMode = mode
  session.sendCommand({ cmd: "settings_save", editMode: mode } as any)
}

// ─── 文本输入 ───
const inputText = ref("")
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// ─── 耗时计时器（源码 useElapsed）───
const elapsedMs = ref(0)
let elapsedTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  elapsedTimer = setInterval(() => {
    if (session.busy) elapsedMs.value += 100
    else elapsedMs.value = 0
  }, 100)
})
onUnmounted(() => {
  if (elapsedTimer) clearInterval(elapsedTimer)
})
const elapsedText = computed(() => {
  const totalSec = elapsedMs.value / 1000
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  return m > 0 ? `${m}m${s}s` : `${s}s`
})

// ─── 模型预设（源码 model-pill + ModelMenu）───
type PresetName = "auto" | "flash" | "pro"
const PRESETS: { k: PresetName; label: string; badge: string; desc: string }[] = [
  { k: "auto", label: "auto (flash → pro)", badge: "AUTO", desc: "根据上下文智能选择" },
  { k: "flash", label: "deepseek-v4-flash", badge: "FLASH", desc: "快速响应" },
  { k: "pro", label: "deepseek-v4-pro", badge: "PRO", desc: "深度推理" },
]
const currentPresetInfo = computed(() =>
  PRESETS.find((p) => p.k === (settings.settings.preset || "auto")),
)
function setPreset(preset: PresetName) {
  session.sendCommand({ cmd: "settings_save", preset } as any)
}
const presetMenuOpen = ref(false)

// ─── 发送 / 排队 / 中止 ───
function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  if (session.busy) {
    session.queueSend(text)
    inputText.value = ""
    return
  }
  session.addUserMessage(text)
  session.sendCommand({ cmd: "user_input", text })
  inputText.value = ""
  closePopup()
}

function abortTurn() {
  session.abort()
}

function flushQueue() {
  const q = [...session.queuedSends]
  session.queuedSends.splice(0, q.length)
  for (const text of q) {
    session.addUserMessage(text)
    session.sendCommand({ cmd: "user_input", text })
  }
}

// ─── ═══════════════════════════════════════
// 弹出菜单 (slash / at) — 对照源码 Popup
// ═══════════════════════════════════════════

const nonceRef = ref(0)

type PopupKind = "slash" | "at" | null
const popup = ref<PopupKind>(null)
const popupQuery = ref("")
const activeIdx = ref(0)
const popupListRef = ref<HTMLDivElement | null>(null)

// ─── 斜杠命令 / （源码 slashCommands）───
interface SlashCmd {
  cmd: string
  desc: string
  run: () => void
  kb?: string
}
const slashCommands: SlashCmd[] = [
  { cmd: "/new", desc: "新建会话", run: () => { session.sendCommand({ cmd: "new_chat" }); session.clearMessages() }, kb: "⌘N" },
  { cmd: "/clear", desc: "清屏", run: () => session.clearMessages() },
  { cmd: "/abort", desc: "中止输出", run: () => abortTurn(), kb: "ESC" },
  { cmd: "/model", desc: "切换模型", run: () => { } },
  { cmd: "/retry", desc: "重试", run: () => session.sendCommand({ cmd: "retry" }) },
  { cmd: "/compact", desc: "压缩历史", run: () => session.sendCommand({ cmd: "compact_history" }) },
]
const slashItems = computed(() => {
  const q = popupQuery.value.toLowerCase()
  if (!q) return slashCommands
  return slashCommands.filter((c) => c.cmd.toLowerCase().includes(q))
})

// ─── @-mention 文件（源码 MentionItem）───
interface MentionItem {
  name: string
  kind: "file" | "dir"
  desc?: string
}
const atItems = computed<MentionItem[]>(() => {
  if (!session.mentionResults || session.mentionResults.nonce !== nonceRef.value) return []
  const base: MentionItem[] = session.mentionResults.results.map((path) => ({
    name: path,
    kind: (path.endsWith("/") || path.endsWith("\\")) ? "dir" : "file",
    desc: path,
  }))
  // ".." 父目录（源码 parentOfAtQuery）
  if (popupQuery.value) {
    base.unshift({ name: "..", kind: "dir", desc: `↑ ${popupQuery.value}` })
  }
  return base
})

const items = computed(() =>
  popup.value === "slash" ? slashItems.value : popup.value === "at" ? atItems.value : [],
)

// 检测 draft 中的 / 和 @ 触发 popup
function handleChange(e: Event) {
  const el = e.target as HTMLTextAreaElement
  const v = el.value
  inputText.value = v
  closePopup()
  const trail = v.match(/(^|\s)([/@])([^\s]*)$/)
  if (trail) {
    const sigil = trail[2]
    const query = trail[3] ?? ""
    if (sigil === "/") {
      popup.value = "slash"
      popupQuery.value = query
      activeIdx.value = 0
    } else {
      popup.value = "at"
      popupQuery.value = query
      nonceRef.value = Date.now()
      activeIdx.value = 0
      session.sendCommand({ cmd: "mention_query", query, nonce: nonceRef.value })
    }
  }
}

function closePopup() {
  if (popup.value) {
    popup.value = null
    popupQuery.value = ""
    session.mentionResults = null
    session.mentionPreview = null
  }
}

function pickItem(idx: number) {
  const it = items.value[idx]
  if (!it || !popup.value) return
  if (popup.value === "slash") {
    const cmd = it as SlashCmd
    // 替换掉斜杠前缀，执行命令
    inputText.value = inputText.value.replace(/[/][^\s]*$/, "").trimEnd()
    cmd.run()
  } else {
    const mention = it as MentionItem
    if (mention.name === "..") {
      // 父目录
      const parent = popupQuery.value.replace(/[/\\][^/\\]*$/, "")
      inputText.value = inputText.value.replace(/[@][^\s]*$/, `@${parent}`)
      popupQuery.value = parent
      nonceRef.value = Date.now()
      session.sendCommand({ cmd: "mention_query", query: parent, nonce: nonceRef.value })
      return
    }
    // 选中文件
    inputText.value = inputText.value.replace(/[@][^\s]*$/, "").trimEnd()
    inputText.value = inputText.value ? `${inputText.value} @${mention.name} ` : `@${mention.name} `
    session.sendCommand({ cmd: "mention_picked", path: mention.name })
  }
  closePopup()
  textareaRef.value?.focus()
}

// 高亮预览
function hoverItem(idx: number) {
  activeIdx.value = idx
  if (popup.value === "at") {
    const it = atItems.value[idx]
    if (it && it.name !== "..") {
      session.sendCommand({ cmd: "mention_preview", path: it.name, nonce: nonceRef.value })
    }
  }
}

// popup 滚动
watch(activeIdx, () => {
  nextTick(() => {
    const el = popupListRef.value?.querySelector<HTMLElement>(`[data-active="true"]`)
    el?.scrollIntoView({ block: "nearest" })
  })
})

// 键盘导航
function onKeydown(e: KeyboardEvent) {
  if (popup.value && items.value.length > 0) {
    if (e.key === "ArrowDown") { e.preventDefault(); activeIdx.value = (activeIdx.value + 1) % items.value.length; return }
    if (e.key === "ArrowUp") { e.preventDefault(); activeIdx.value = (activeIdx.value - 1 + items.value.length) % items.value.length; return }
    if (e.key === "Escape") { e.preventDefault(); closePopup(); return }
    if (e.key === "Tab" && popup.value === "at") {
      const it = atItems.value[activeIdx.value]
      if (it && it.kind === "dir" && it.name !== "..") {
        e.preventDefault()
        const dirPath = it.name.replace(/\/+$/, "")
        inputText.value = inputText.value.replace(/[@][^\s]*$/, `@${dirPath}/`)
        popupQuery.value = `${dirPath}/`
        nonceRef.value = Date.now()
        session.sendCommand({ cmd: "mention_query", query: popupQuery.value, nonce: nonceRef.value })
        return
      }
    }
    if (e.key === "Enter") { e.preventDefault(); if (items.value.length > 0) { pickItem(activeIdx.value); return }; closePopup(); return }
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
  if (e.key === "Escape") {
    presetMenuOpen.value = false
  }
}

// ─── attach file (源码 attachFile) ───
async function attachFile(filter?: "image") {
  if (!window.api) return
  const result = await window.api.dialog.open({
    properties: ["openFile"],
    filters: filter === "image"
      ? [{ name: "图片", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }]
      : undefined,
    title: filter === "image" ? "选择图片" : "选择文件",
  })
  if (result.canceled || !result.filePaths[0]) return
  const picked = result.filePaths[0]
  const ws = settings.settings.workspaceDir
  const rel = ws && picked.startsWith(ws) ? picked.slice(ws.length).replace(/^[\\/]+/, "") : picked
  inputText.value = inputText.value.trimEnd()
  inputText.value = inputText.value ? `${inputText.value} @${rel} ` : `@${rel} `
  session.sendCommand({ cmd: "mention_picked", path: rel })
  textareaRef.value?.focus()
}

// ─── 手动打开 @mention ───
function openAtMention() {
  popup.value = "at"
  popupQuery.value = ""
  nonceRef.value = Date.now()
  session.sendCommand({ cmd: "mention_query", query: "", nonce: nonceRef.value })
}

// ─── 外部点击关闭 preset 菜单 ───
onMounted(() => document.addEventListener("click", onDocClick))
onUnmounted(() => document.removeEventListener("click", onDocClick))

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest(".preset-wrap")) presetMenuOpen.value = false
}

// ─── 是否有内容 ───
const canSend = computed(() => inputText.value.trim().length > 0)

// ─── 焦点时检查 popup ───
function onFocus() {
  // 以 / 或 @ 开头时触发 popup
  const trail = inputText.value.match(/(^|\s)([/@])([^\s]*)$/)
  if (trail) {
    const sigil = trail[2]
    const query = trail[3] ?? ""
    if (sigil === "/") {
      popup.value = "slash"
      popupQuery.value = query
    } else {
      popup.value = "at"
      popupQuery.value = query
      nonceRef.value = Date.now()
      session.sendCommand({ cmd: "mention_query", query, nonce: nonceRef.value })
    }
  }
}
</script>

<template>
  <div class="composer-wrap">
    <!-- 排队 chip（源码 composer-queued） -->
    <div v-if="session.queuedSends.length > 0" class="composer-queued">
      <span class="composer-queued-label">{{ session.queuedSends.length }} 条排队</span>
      <span v-for="(text, i) in session.queuedSends" :key="i" class="composer-queue-chip" :title="text">
        <span class="text">{{ text }}</span>
        <span class="x" @click="session.dequeueSend(i)">✕</span>
      </span>
      <button class="queue-flush-btn" @click="flushQueue">发送</button>
    </div>

    <!-- hint 行 — 忙碌/空闲都显示 ModeSwitch -->
    <div class="hint-row">
      <template v-if="session.busy">
        <span class="composer-busy-status">
          <span class="composer-busy-pip" />
          <span class="composer-busy-label">Reasoning</span>
          <span class="composer-busy-time">{{ elapsedText }}</span>
        </span>
      </template>
      <span class="grow" />
      <ModeSwitch :mode="settings.settings.editMode" @change="setEditMode" />
    </div>

    <!-- 输入卡片（源码 composer） -->
    <div class="composer" :class="{ 'is-busy': session.busy }">
      <textarea ref="textareaRef" :value="inputText" placeholder="向 Agent 提问 / 安排任务, Enter 发送 , Shift + Enter换行"
        :disabled="!session.rpcReady" rows="2" @keydown="onKeydown" @input="handleChange" @focus="onFocus" />

      <!-- 底部栏（源码 composer-foot） -->
      <div class="composer-foot">
        <!-- 文件/图片/命令/提及 按钮（源码 cf-btn） -->
        <button type="button" class="cf-btn" title="插入文件" @click="attachFile()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button type="button" class="cf-btn" title="插入图片" @click="attachFile('image')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>
        <button type="button" class="cf-btn" title="命令"
          @click="() => { popup = 'slash'; popupQuery = ''; activeIdx = 0 }">
          <span class="cf-slash">/</span>
          <span class="cf-label">命令</span>
        </button>
        <button type="button" class="cf-btn" title="提及文件" @click="openAtMention()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
          </svg>
          <span class="cf-label">提及</span>
        </button>

        <span class="grow" />

        <!-- 模型预设（源码 model-pill） -->
        <div class="preset-wrap">
          <button type="button" class="model-pill" @click="presetMenuOpen = !presetMenuOpen" title="切换预设">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10h-10V2z" />
              <path d="M21.5 12H12V2.5" />
            </svg>
            <span>{{ settings.settings.model || 'deepseek-chat' }}</span>
            <span class="badge">{{ currentPresetInfo?.badge }}</span>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" />
            </svg>
          </button>
          <Transition name="fade">
            <div v-if="presetMenuOpen" class="popup preset-popup">
              <div class="ph"><span class="tok">M</span><span>切换预设</span></div>
              <div class="popup-list" @mouseleave="presetMenuOpen = false">
                <button v-for="p in PRESETS" :key="p.k" type="button" class="popup-item"
                  :data-active="settings.settings.preset === p.k" @click="setPreset(p.k); presetMenuOpen = false">
                  <span class="ico">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2a10 10 0 1 0 10 10h-10V2z" />
                      <path d="M21.5 12H12V2.5" />
                    </svg>
                  </span>
                  <div class="nm">
                    <span class="cmd">{{ p.label }}</span>
                    <div class="desc">{{ p.desc }}</div>
                  </div>
                  <span class="kb">{{ p.badge }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 发送/中止 -->
        <button v-if="session.busy" type="button" class="send-btn stop-btn" @click="abortTurn" title="中止">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
        <button v-else type="button" class="send-btn" :disabled="!canSend" @click="sendMessage" title="发送">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      <!-- 弹出菜单（slash / at，源码 Popup） -->
      <Transition name="fade">
        <div v-if="popup && items.length > 0" class="popup popup-menu" @mousedown.prevent>
          <div class="ph">
            <span class="tok">{{ popup === 'slash' ? '/' : '@' }}</span>
            <span>{{ popup === 'slash' ? '命令' : '提及文件' }}</span>
            <span class="grow" />
            <span class="popup-close" @click="closePopup">✕</span>
          </div>
          <div class="popup-list" ref="popupListRef">
            <div v-if="items.length === 0" class="popup-empty">无匹配结果</div>
            <div v-for="(it, i) in items" :key="i" class="popup-item" :data-active="i === activeIdx"
              @click="pickItem(i)" @mouseenter="hoverItem(i)">
              <span class="ico">
                <!-- slash 图标 -->
                <template v-if="popup === 'slash'">
                  <svg v-if="(it as SlashCmd).cmd === '/new'" width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <svg v-else-if="(it as SlashCmd).cmd === '/clear'" width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-.93 14.28A2 2 0 0 1 16.07 22H7.93a2 2 0 0 1-2-1.86L5 6" />
                  </svg>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2">
                    <path d="M14 11l-2 2m0 0l-2-2m2 2V7m0 11a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
                  </svg>
                </template>
                <!-- at 图标 -->
                <template v-else>
                  <svg v-if="(it as MentionItem).kind === 'dir'" width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </template>
              </span>
              <div class="nm">
                <template v-if="popup === 'slash'">
                  <span class="cmd">{{ (it as SlashCmd).cmd }}</span>
                  <span class="desc">{{ (it as SlashCmd).desc }}</span>
                </template>
                <template v-else>
                  <span>{{ (it as MentionItem).name }}</span>
                  <div v-if="(it as MentionItem).desc" class="desc">{{ (it as MentionItem).desc }}</div>
                </template>
              </div>
              <span v-if="popup === 'slash' && (it as SlashCmd).kb" class="kb">{{ (it as SlashCmd).kb }}</span>
            </div>
          </div>
          <div class="popup-foot">
            <span>↑↓ 选择</span>
            <span>↵ 确认</span>
            <span>ESC 关闭</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* ═══ 对照源码 desktop/src/styles.css ═══ */

.composer-wrap {
  padding: 12px 28px 18px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
  position: relative;
}

.composer-wrap::before {
  content: "";
  position: absolute;
  inset: -24px 0 auto 0;
  height: 24px;
  background: linear-gradient(to top, var(--el-bg-color), transparent);
  pointer-events: none;
}

/* ─── 排队 chip ─── */
.composer-queued {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 6px 6px;
  font-size: 14px;
}

.composer-queued-label {
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  font-size: 12px;
}

.composer-queue-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 240px;
  padding: 2px 4px 2px 8px;
  border: 1px dashed var(--el-border-color);
  border-radius: 999px;
  background: var(--el-fill-color-light);
  font-size: 12px;
}

.composer-queue-chip .text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.composer-queue-chip .x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
}

.composer-queue-chip .x:hover {
  background: var(--el-border-color);
  color: var(--el-text-color-primary);
}

.queue-flush-btn {
  padding: 2px 10px;
  border-radius: 6px;
  border: 1px solid var(--el-color-primary);
  background: transparent;
  color: var(--el-color-primary);
  font-size: 12px;
  cursor: pointer;
}

.queue-flush-btn:hover {
  background: var(--el-color-primary-light-9);
}

/* ─── hint 行 ─── */
.hint-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.hint-row .grow {
  flex: 1;
}

.hint-row .hint-sep {
  width: 1px;
  height: 12px;
  background: var(--el-border-color);
  flex-shrink: 0;
}

.hint-row kbd {
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  font-family: inherit;
}

.hint-text {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
}

/* ─── 忙碌状态 ─── */
.composer-busy-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.composer-busy-pip {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-primary);
  animation: blink 1.2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes blink {

  0%,
  100% {
    opacity: 1
  }

  50% {
    opacity: .3
  }
}

.composer-busy-label {
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.composer-busy-time {
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  font-size: 12px;
}

/* ─── 输入卡片 ─── */
.composer {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 14px;
  overflow: visible;
  position: relative;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.composer:focus-within {
  border-color: var(--el-color-primary);
}

.composer.is-busy {
  opacity: 0.8;
}

.composer textarea {
  display: block;
  width: 100%;
  height: 100px;
  resize: none;
  overflow-y: auto;
  background: none;
  border: none;
  outline: none;
  padding: 12px 14px 6px;
  font-size: 14px;
  line-height: 1.55;
  font-family: inherit;
  color: var(--el-text-color-primary);
  scrollbar-width: thin;
}
.composer textarea::-webkit-scrollbar {
  width: 5px;
}
.composer textarea::-webkit-scrollbar-track {
  background: transparent;
}
.composer textarea::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.composer textarea::placeholder {
  color: var(--el-text-color-placeholder);
}

.composer textarea:disabled {
  cursor: not-allowed;
}

/* ─── 底部操作栏 ─── */
.composer-foot {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 8px;
}

.composer-foot .grow {
  flex: 1;
}

.cf-btn {
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.cf-btn:hover {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.cf-slash {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}
.cf-btn .cf-label {
  font-family: inherit;
  font-size: 12px;
}

/* ─── 模型预设按钮 ─── */
.preset-wrap {
  position: relative;
}

.model-pill {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
  color: var(--el-text-color-secondary);
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
}

.model-pill:hover {
  background: var(--el-fill-color-light);
}

.model-pill .badge {
  font-size: 11px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
}

/* ─── 预设弹出菜单 ─── */
.preset-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: 280px;
  z-index: 100;
}

/* ─── Popup 通用 ─── */
.popup {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, .2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.popup-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 420px;
  max-height: 320px;
  z-index: 100;
}

.popup .ph {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  gap: 8px;
}

.popup .ph .grow {
  flex: 1;
}

.popup .ph .tok {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
}

.popup-close {
  cursor: pointer;
  font-size: 12px;
  opacity: .5;
}

.popup-close:hover {
  opacity: 1;
}

.popup-list {
  max-height: 260px;
  overflow-y: auto;
}

.popup-empty {
  padding: 12px 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-family: ui-monospace, monospace;
  text-align: center;
}

.popup-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 13px;
  transition: background 0.1s;
}

.popup-item:hover,
.popup-item[data-active="true"] {
  background: var(--el-color-primary-light-9);
}

.popup-item .ico {
  display: inline-flex;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.popup-item .nm {
  flex: 1;
  min-width: 0;
}

.popup-item .cmd {
  display: block;
  font-weight: 500;
  font-size: 13px;
}

.popup-item .desc {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popup-item .kb {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  font-weight: 600;
  flex-shrink: 0;
}

.popup-foot {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  border-top: 1px solid var(--el-border-color-light);
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

/* ─── 编辑模式切换 ─── */
/* ─── 发送/中止 ─── */
.send-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: var(--el-color-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .12s;
  flex-shrink: 0;
}

.send-btn:hover {
  background: var(--el-color-primary-light-3);
}

.send-btn:disabled {
  background: var(--el-fill-color);
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}

.send-btn.stop-btn {
  background: var(--el-color-danger);
}

.send-btn.stop-btn:hover {
  background: var(--el-color-danger-light-3);
}

/* ─── 过渡 ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity .12s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
