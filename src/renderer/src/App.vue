<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useThemeStore } from "./stores/theme"
import { useSessionStore } from "./stores/session"
import { useSettingsStore } from "./stores/settings"
import { useAppStore } from "./stores/app"
import Sidebar from "./components/Sidebar.vue"
import Thread from "./components/Thread.vue"
import Composer from "./components/Composer.vue"
import StatusBar from "./components/StatusBar.vue"
import CommandPalette, { type CommandItem } from "./components/CommandPalette.vue"
import JobsPop from "./components/JobsPop.vue"
import SettingsModal from "./components/Settings.vue"

const theme = useThemeStore()
const session = useSessionStore()
const settings = useSettingsStore()
const appState = useAppStore()

// 命令面板
const paletteOpen = ref(false)
// 任务弹窗
const jobsOpen = ref(false)
// 设置弹窗
const settingsOpen = ref(false)

// 构建命令列表
function buildCommands(): CommandItem[] {
  const list: CommandItem[] = [
    { id: "new-chat", group: "nav", label: "新建对话", hint: "开始一个新的对话会话", icon: "💬", shortcut: ["mod", "N"], run: () => session.sendCommand({ cmd: "new_chat" }) },
    { id: "focus-composer", group: "nav", label: "聚焦输入框", icon: "⌨️", shortcut: ["mod", "L"], run: () => { /* TODO */ } },
  ]

  list.push({ id: "pick-workspace", group: "workspace", label: "更改工作目录", icon: "📂", run: () => { /* TODO: 触发 workdir pop */ } })

  list.push({ id: "settings", group: "settings", label: "打开设置", icon: "⚙️", shortcut: ["mod", ","], run: () => { settingsOpen.value = true } })
  list.push({ id: "about", group: "settings", label: "关于 Reasonix", icon: "ℹ️", run: () => { /* TODO */ } })

  return list
}

const commands = buildCommands()

// Ctrl+K 快捷键
function onGlobalKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (mod && (e.key === "k" || e.key === "K")) {
    e.preventDefault()
    paletteOpen.value = !paletteOpen.value
  } else if (mod && (e.key === "j" || e.key === "J")) {
    e.preventDefault()
    jobsOpen.value = !jobsOpen.value
  } else if (mod && e.key === ",") {
    e.preventDefault()
    settingsOpen.value = !settingsOpen.value
  } else if (e.key === "Escape") {
    paletteOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener("keydown", onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeydown)
})

// 主题初始化
theme.initFromLocalStorage()

// RPC 事件
let cleanupFns: (() => void)[] = []

onMounted(async () => {
  if (!window.api) {
    console.warn("[renderer] window.api not available — preload not injected?")
    return
  }

  const unsubEvent = window.api.rpc.onEvent(({ data }) => {
    if (!data || !data.trim()) return
    try {
      const evt = JSON.parse(data)
      session.handleEvent(evt)
      appState.handleEvent(evt)
      settings.handleEvent(evt)
      theme.handleEvent(evt)
    } catch (err) {
      console.error("[renderer] bad event:", data, err)
    }
  })

  const unsubExit = window.api.rpc.onExit(({ code }) => {
    console.warn("[renderer] rpc exited with code", code)
    session.resetRpc()
  })

  cleanupFns = [unsubEvent, unsubExit]

  await session.spawnRpc()
})

onUnmounted(() => {
  cleanupFns.forEach((fn) => fn())
})
</script>

<template>
  <div
    class="app-layout"
    :data-theme="theme.theme"
    :data-theme-style="theme.themeStyle"
    :data-platform="theme.platform"
  >
    <Sidebar @open-settings="settingsOpen = true" />
    <div class="main-area">
      <Thread />
      <Composer />
    </div>
    <StatusBar @open-jobs="jobsOpen = true" />
  </div>

  <!-- 命令面板 -->
  <CommandPalette
    :open="paletteOpen"
    :commands="commands"
    @close="paletteOpen = false"
  />

  <!-- 任务弹窗 -->
  <JobsPop
    :open="jobsOpen"
    @update:open="(v: boolean) => jobsOpen = v"
  />

  <!-- 设置弹窗 -->
  <SettingsModal
    :visible="settingsOpen"
    @update:visible="(v: boolean) => settingsOpen = v"
  />
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
