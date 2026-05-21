import "element-plus/dist/index.css"
import "./assets/main.css"
import "element-plus/theme-chalk/dark/css-vars.css"

import { createApp } from "vue"
import { createPinia } from "pinia"
import ElementPlus from "element-plus"
import zhCn from "element-plus/es/locale/lang/zh-cn"
import en from "element-plus/es/locale/lang/en"
import { createI18n } from "vue-i18n"
import App from "./App.vue"

// i18n - 先加载简单实现，后续替换为完整翻译文件
const i18n = createI18n({
  locale: localStorage.getItem("reasonix.lang") || "zh-CN",
  fallbackLocale: "en",
  messages: {
    "zh-CN": {
      app: { name: "Reasonix" },
      thread: { you: "你", subagent: "子代理", copyMessage: "复制消息" },
      sidebarPanel: {
        sessionTitle: "{month}月{day}日 {hour}:{minute}",
        justNow: "刚刚",
        minutesAgo: "{n}分钟前",
        hoursAgo: "{n}小时前",
        daysAgo: "{n}天前",
        weeksAgo: "{n}周前",
      },
      editMode: {
        review: "审查",
        reviewHint: "每次编辑前确认",
        auto: "自动",
        autoHint: "自动应用编辑",
        yolo: "YOLO",
        yoloHint: "直接执行",
      },
      preset: {
        autoDesc: "自动选择",
        flashDesc: "快速模式",
        proDesc: "专业模式",
      },
    },
    en: {
      app: { name: "Reasonix" },
      thread: { you: "You", subagent: "subagent", copyMessage: "Copy message" },
      sidebarPanel: {
        sessionTitle: "{month}/{day} {hour}:{minute}",
        justNow: "Just now",
        minutesAgo: "{n}m ago",
        hoursAgo: "{n}h ago",
        daysAgo: "{n}d ago",
        weeksAgo: "{n}w ago",
      },
      editMode: {
        review: "Review",
        reviewHint: "Confirm before each edit",
        auto: "Auto",
        autoHint: "Apply edits automatically",
        yolo: "YOLO",
        yoloHint: "Execute directly",
      },
      preset: {
        autoDesc: "Auto select",
        flashDesc: "Fast mode",
        proDesc: "Pro mode",
      },
    },
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(ElementPlus, {
  locale: localStorage.getItem("reasonix.lang") === "en" ? en : zhCn,
})

app.mount("#app")
