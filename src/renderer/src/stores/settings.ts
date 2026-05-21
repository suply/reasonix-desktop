// 设置状态
import { defineStore } from "pinia"
import { ref } from "vue"
import type { IncomingEvent } from "../../../main/protocol"

export type EditMode = "review" | "auto" | "yolo"
export type PresetName = "auto" | "flash" | "pro"

export interface Settings {
  reasoningEffort: "high" | "max"
  editMode: EditMode
  budgetUsd: number | null
  baseUrl?: string
  apiKeyPrefix?: string
  workspaceDir: string
  recentWorkspaces: string[]
  model: string
  preset: PresetName
  editor?: string
  version: string
}

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref<Settings>({
    reasoningEffort: "high",
    editMode: "review",
    budgetUsd: null,
    workspaceDir: "",
    recentWorkspaces: [],
    model: "deepseek-chat",
    preset: "auto",
    version: "",
  })

  function handleEvent(event: IncomingEvent) {
    if (event.type === "$settings") {
      settings.value = {
        reasoningEffort: event.reasoningEffort,
        editMode: event.editMode,
        budgetUsd: event.budgetUsd,
        baseUrl: event.baseUrl,
        apiKeyPrefix: event.apiKeyPrefix,
        workspaceDir: event.workspaceDir,
        recentWorkspaces: event.recentWorkspaces,
        model: event.model,
        preset: event.preset,
        editor: event.editor,
        version: event.version,
      }
    }
  }

  return { settings, handleEvent }
})
