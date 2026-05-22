// 全局应用状态
import { defineStore } from "pinia"
import { ref } from "vue"
import type { IncomingEvent, JobInfo, McpSpecInfo, SkillInfo, MemoryEntryInfo } from "../../../main/protocol"

export interface SessionInfo {
  name: string
  messageCount: number
  mtime: string
  summary?: string
}

export const useAppStore = defineStore("app", () => {
  const version = ref("")
  const sessions = ref<SessionInfo[]>([])
  const jobs = ref<JobInfo[]>([])
  const mcpSpecs = ref<McpSpecInfo[]>([])
  const mcpBridged = ref(false)
  const skills = ref<SkillInfo[]>([])
  const memory = ref<MemoryEntryInfo[]>([])

  function handleEvent(event: IncomingEvent) {
    switch (event.type) {
      case "$settings":
        version.value = event.version
        break
      case "$sessions":
        sessions.value = event.items
        break
      case "$jobs":
        jobs.value = event.items
        break
      case "$mcp_specs":
        mcpSpecs.value = event.specs
        mcpBridged.value = "bridged" in event ? (event as any).bridged : false
        break
      case "$skills":
        skills.value = event.items
        break
      case "$memory":
        memory.value = event.entries
        break
    }
  }

  return { version, sessions, jobs, mcpSpecs, mcpBridged, skills, memory, handleEvent }
})
