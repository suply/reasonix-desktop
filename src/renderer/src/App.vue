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
import TopBar from "./components/TopBar.vue"
import CommandPalette, { type CommandItem } from "./components/CommandPalette.vue"
import JobsPop from "./components/JobsPop.vue"
import SettingsModal from "./components/Settings.vue"
import WorkdirPop from "./components/WorkdirPop.vue"

const theme = useThemeStore()
const session = useSessionStore()
const settings = useSettingsStore()
const appState = useAppStore()

const paletteOpen = ref(false)
const jobsOpen = ref(false)
const settingsOpen = ref(false)
const workdirOpen = ref(false)

function buildCommands(): CommandItem[] {
  return [
    { id: "new-chat", group: "nav", label: "新建对话", icon: "💬", shortcut: ["mod", "N"], run: () => session.sendCommand({ cmd: "new_chat" }) },
    { id: "settings", group: "settings", label: "打开设置", icon: "⚙️", shortcut: ["mod", ","], run: () => { settingsOpen.value = true } },
    { id: "jobs", group: "action", label: "后台任务", icon: "⚙️", shortcut: ["mod", "J"], run: () => { jobsOpen.value = true } },
  ]
}

const commands = buildCommands()

function onGlobalKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key === "k") { e.preventDefault(); paletteOpen.value = !paletteOpen.value }
  else if (mod && e.key === "j") { e.preventDefault(); jobsOpen.value = !jobsOpen.value }
  else if (mod && e.key === ",") { e.preventDefault(); settingsOpen.value = !settingsOpen.value }
  else if (e.key === "Escape") { paletteOpen.value = false }
}

onMounted(() => window.addEventListener("keydown", onGlobalKeydown))
onUnmounted(() => window.removeEventListener("keydown", onGlobalKeydown))

theme.initFromLocalStorage()

let cleanupFns: (() => void)[] = []

onMounted(async () => {
  if (!window.api) return
  const unsubEvent = window.api.rpc.onEvent(({ data }) => {
    if (!data || !data.trim()) return
    try {
      const evt = JSON.parse(data)
      session.handleEvent(evt)
      appState.handleEvent(evt)
      settings.handleEvent(evt)
      theme.handleEvent(evt)
    } catch (err) { console.error("[renderer] bad event:", data, err) }
  })
  const unsubExit = window.api.rpc.onExit(({ code }) => {
    console.warn("[renderer] rpc exited with code", code)
    session.resetRpc()
  })
  cleanupFns = [unsubEvent, unsubExit]
  await session.spawnRpc()
})

onUnmounted(() => cleanupFns.forEach((fn) => fn()))
</script>

<template>
  <div
    class="app-layout"
    :data-theme="theme.theme"
    :data-theme-style="theme.themeStyle"
    :data-platform="theme.platform"
  >
    <!-- 顶部栏全宽 -->
    <TopBar @pick-workspace="workdirOpen = true" />

    <!-- 主体区域 -->
    <div class="app-body">
      <Sidebar @open-settings="settingsOpen = true" @open-jobs="jobsOpen = true" />
      <div class="main-area">
        <Thread />
        <Composer />
      </div>
    </div>

    <StatusBar />
  </div>

  <CommandPalette :open="paletteOpen" :commands="commands" @close="paletteOpen = false" />
  <JobsPop :open="jobsOpen" @update:open="(v: boolean) => jobsOpen = v" />
  <SettingsModal :visible="settingsOpen" @update:visible="(v: boolean) => settingsOpen = v" />
  <WorkdirPop :visible="workdirOpen" @update:visible="(v: boolean) => workdirOpen = v" />
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
