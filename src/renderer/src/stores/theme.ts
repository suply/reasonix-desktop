// 主题状态 — 移植自 desktop/src/theme.ts
import { defineStore } from "pinia"
import { ref, watch } from "vue"

export type Theme = "dark" | "light"
export type ThemeStyle = "graphite" | "sandstone" | "porcelain" | "midnight"
export type FontScale = "small" | "medium" | "large"
export type FontFamily = "sans" | "system" | "serif" | "custom"

export const THEME_STYLES: ThemeStyle[] = [
  "graphite",
  "sandstone",
  "porcelain",
  "midnight",
]

export const FONT_SCALE_ZOOM: Record<FontScale, number> = {
  small: 0.875,
  medium: 1.0,
  large: 1.125,
}

export const FONT_FAMILY_STACK: Record<FontFamily, string> = {
  sans: '"Geist", system-ui, sans-serif',
  system: '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  custom: '"Geist", system-ui, sans-serif',
}

function detectPlatform(): string {
  const ua = navigator.userAgent
  if (/Mac|macOS/i.test(ua)) return "macos"
  if (/Windows/i.test(ua)) return "windows"
  return "default"
}

export const useThemeStore = defineStore("theme", () => {
  const theme = ref<Theme>("dark")
  const themeStyle = ref<ThemeStyle>("graphite")
  const fontScale = ref<FontScale>("medium")
  const fontFamily = ref<FontFamily>("sans")
  const customFontFamily = ref("")
  const platform = ref(detectPlatform())

  // 从 localStorage 恢复
  function initFromLocalStorage() {
    const stored = localStorage.getItem("reasonix.theme")
    if (stored === "dark" || stored === "light") {
      theme.value = stored
    }
    const storedStyle = localStorage.getItem("reasonix.themeStyle")
    if (THEME_STYLES.includes(storedStyle as ThemeStyle)) {
      themeStyle.value = storedStyle as ThemeStyle
    }
    const storedFont = localStorage.getItem("reasonix.fontScale")
    if (storedFont === "small" || storedFont === "medium" || storedFont === "large") {
      fontScale.value = storedFont
    }
    const storedFamily = localStorage.getItem("reasonix.fontFamily")
    if (storedFamily === "sans" || storedFamily === "system" || storedFamily === "serif" || storedFamily === "custom") {
      fontFamily.value = storedFamily
    }
    customFontFamily.value = localStorage.getItem("reasonix.customFontFamily") || ""

    applyTheme()
  }

  // 应用到 DOM
  function applyTheme() {
    document.documentElement.dataset.theme = theme.value
    document.documentElement.dataset.themeStyle = themeStyle.value
    document.documentElement.dataset.platform = platform.value
    document.body.dataset.platform = platform.value

    // Element Plus 暗色模式
    if (theme.value === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    // 字号
    document.documentElement.style.setProperty("zoom", String(FONT_SCALE_ZOOM[fontScale.value]))

    // 字体
    const custom = customFontFamily.value.trim()
    const stack = fontFamily.value === "custom" && custom
      ? custom
      : FONT_FAMILY_STACK[fontFamily.value] ?? FONT_FAMILY_STACK.sans
    document.documentElement.style.setProperty("--font-sans", stack)
  }

  // 持久化
  watch(theme, (v) => localStorage.setItem("reasonix.theme", v))
  watch(themeStyle, (v) => localStorage.setItem("reasonix.themeStyle", v))
  watch(fontScale, (v) => localStorage.setItem("reasonix.fontScale", v))
  watch(fontFamily, (v) => localStorage.setItem("reasonix.fontFamily", v))
  watch(customFontFamily, (v) => localStorage.setItem("reasonix.customFontFamily", v))

  // 监听主题变更自动应用
  watch([theme, themeStyle, fontScale, fontFamily, customFontFamily], () => applyTheme())

  // 处理来自主进程的事件
  function handleEvent(_event: unknown) {
    // 主题相关事件暂不处理
  }

  return {
    theme,
    themeStyle,
    fontScale,
    fontFamily,
    customFontFamily,
    platform,
    initFromLocalStorage,
    applyTheme,
    handleEvent,
  }
})
