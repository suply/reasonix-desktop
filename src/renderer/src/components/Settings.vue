<script setup lang="ts">
// 设置面板 — 4 页：通用 / 模型 / MCP / Skills
import { ref } from "vue"
import { ElDialog, ElMenu, ElMenuItem, ElInput, ElTag, ElButton, ElMessage } from "element-plus"
import { useSettingsStore } from "../stores/settings"
import { useAppStore } from "../stores/app"
import { useSessionStore } from "../stores/session"

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
}>()

const settings = useSettingsStore()
const appState = useAppStore()
const session = useSessionStore()
const activePage = ref("general")

// API Key 输入
const apiKeyDraft = ref("")

// MCP 添加
const mcpDraft = ref("")

function addMcp() {
  const spec = mcpDraft.value.trim()
  if (!spec) return
  session.sendCommand({ cmd: "mcp_specs_add", spec })
  mcpDraft.value = ""
}

function removeMcp(spec: string) {
  session.sendCommand({ cmd: "mcp_specs_remove", spec })
}

// 保存设置
function savePatch(patch: Record<string, unknown>) {
  session.sendCommand({ cmd: "settings_save", ...patch } as any)
  ElMessage.success("设置已保存")
}

// 保存 API Key
function saveApiKey() {
  const key = apiKeyDraft.value.trim()
  if (!key) return
  session.sendCommand({ cmd: "setup_save_key", key })
  apiKeyDraft.value = ""
  ElMessage.success("API Key 已保存")
}

const pages = [
  { id: "general", label: "通用" },
  { id: "models", label: "模型" },
  { id: "mcp", label: "MCP" },
  { id: "skills", label: "技能" },
]
</script>

<template>
  <ElDialog
    :model-value="visible"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    title="设置"
    width="680px"
    align-center
    top="5vh"
  >
    <div class="settings-layout">
      <ElMenu
        :default-active="activePage"
        class="settings-menu"
        @select="(index: string) => activePage = index"
      >
        <ElMenuItem v-for="p in pages" :key="p.id" :index="p.id">
          {{ p.label }}
        </ElMenuItem>
      </ElMenu>

      <div class="settings-content">
        <!-- ═══ 通用 ═══ -->
        <div v-if="activePage === 'general'" class="settings-page">

          <!-- 行为 -->
          <section class="section">
            <div class="stitle">行为</div>

            <div class="setting-row">
              <div class="l">
                <div class="n">推理强度</div>
                <div class="h">控制推理努力程度。max 更慢但结果更好。</div>
              </div>
              <div class="seg-ctrl">
                <button
                  :class="{ on: settings.settings.reasoningEffort === 'high' }"
                  @click="savePatch({ reasoningEffort: 'high' })"
                >high</button>
                <button
                  :class="{ on: settings.settings.reasoningEffort === 'max' }"
                  @click="savePatch({ reasoningEffort: 'max' })"
                >max</button>
              </div>
            </div>

            <div class="setting-row">
              <div class="l">
                <div class="n">审核模式</div>
                <div class="h">文件编辑审核方式。</div>
              </div>
              <div class="seg-ctrl">
                <button
                  :class="{ on: settings.settings.editMode === 'review' }"
                  @click="savePatch({ editMode: 'review' })"
                >手动</button>
                <button
                  :class="{ on: settings.settings.editMode === 'auto' }"
                  @click="savePatch({ editMode: 'auto' })"
                >自动</button>
                <button
                  :class="{ on: settings.settings.editMode === 'yolo' }"
                  @click="savePatch({ editMode: 'yolo' })"
                >全信任</button>
              </div>
            </div>
          </section>

          <!-- DeepSeek API -->
          <section class="section">
            <div class="stitle">DeepSeek API</div>

            <div class="setting-row">
              <div class="l">
                <div class="n">API Key</div>
                <div class="h">
                  {{ settings.settings.apiKeyPrefix
                    ? `已设置 (${settings.settings.apiKeyPrefix}…)`
                    : '未设置' }}
                </div>
              </div>
              <div style="display: flex; gap: 6px;">
                <ElInput
                  v-model="apiKeyDraft"
                  type="password"
                  placeholder="sk-…"
                  style="width: 200px"
                  size="small"
                  show-password
                />
                <ElButton size="small" type="primary" :disabled="!apiKeyDraft.trim()" @click="saveApiKey">
                  保存
                </ElButton>
              </div>
            </div>

            <div class="setting-row">
              <div class="l">
                <div class="n">API 地址</div>
                <div class="h">自定义端点，留空使用默认。</div>
              </div>
              <ElInput
                :model-value="settings.settings.baseUrl"
                placeholder="https://api.deepseek.com"
                style="width: 280px"
                size="small"
                @update:model-value="(v: string) => savePatch({ baseUrl: v || undefined })"
              />
            </div>
          </section>
        </div>

        <!-- ═══ 模型 ═══ -->
        <div v-if="activePage === 'models'" class="settings-page">
          <section class="section">
            <div class="stitle">预设</div>
            <div class="preset-grid">
              <button
                v-for="p in ([
                  { id: 'auto', label: 'auto (flash → pro)', badge: 'AUTO', desc: '根据上下文智能选择。flash 优先在低消耗时使用，pro 在复杂场景自动升级。' },
                  { id: 'flash', label: 'deepseek-v4-flash', badge: 'FLASH', desc: '快速响应模式，低延迟低成本，适合日常编码和简单问题。' },
                  { id: 'pro', label: 'deepseek-v4-pro', badge: 'PRO', desc: '专业模式，更强的推理能力，适合复杂架构和深度分析。' },
                ] as const)"
                :key="p.id"
                class="preset-card"
                :class="{ active: settings.settings.preset === p.id }"
                @click="savePatch({ preset: p.id })"
              >
                <div class="preset-head">
                  <span class="preset-badge">{{ p.badge }}</span>
                  <span class="preset-name">{{ p.label }}</span>
                </div>
                <div class="preset-desc">{{ p.desc }}</div>
              </button>
            </div>
          </section>

          <section class="section">
            <div class="stitle">当前配置</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-key">模型</span>
                <span class="info-val">{{ settings.settings.model }}</span>
              </div>
              <div class="info-item">
                <span class="info-key">预设</span>
                <span class="info-val">{{ settings.settings.preset }}</span>
              </div>
              <div class="info-item">
                <span class="info-key">费用上限</span>
                <span class="info-val">{{ settings.settings.budgetUsd ?? '无限制' }} USD</span>
              </div>
            </div>
          </section>
        </div>

        <!-- ═══ MCP ═══ -->
        <div v-if="activePage === 'mcp'" class="settings-page">
          <section class="section">
            <div class="stitle">MCP 服务器</div>

            <div class="mcp-add-row">
              <ElInput
                v-model="mcpDraft"
                placeholder="name=command args 或 name=http://localhost:port/mcp"
                size="small"
                @keydown.enter="addMcp"
              />
              <ElButton size="small" type="primary" @click="addMcp">添加</ElButton>
            </div>

            <div v-if="appState.mcpSpecs.length === 0" class="empty-state">
              暂无 MCP 服务器配置
            </div>

            <div v-for="spec in appState.mcpSpecs" :key="spec.raw" class="mcp-card">
              <div class="mcp-head">
                <span class="mcp-name">{{ spec.name || '未命名' }}</span>
                <ElTag
                  size="small"
                  :type="spec.status === 'connected' ? 'success' : spec.status === 'failed' ? 'danger' : 'info'"
                >
                  {{ spec.status }}
                </ElTag>
                <span class="mcp-transport">{{ spec.transport }}</span>
              </div>
              <div class="mcp-summary">{{ spec.summary }}</div>
              <div class="mcp-actions">
                <span v-if="spec.toolCount !== undefined" class="mcp-tools">
                  {{ spec.toolCount }} 个工具
                </span>
                <ElButton size="small" text type="danger" @click="removeMcp(spec.raw)">删除</ElButton>
              </div>
            </div>
          </section>
        </div>

        <!-- ═══ Skills ═══ -->
        <div v-if="activePage === 'skills'" class="settings-page">
          <section class="section">
            <div class="stitle">已加载技能（{{ appState.skills.length }}）</div>

            <div v-if="appState.skills.length === 0" class="empty-state">
              暂无可用技能
            </div>

            <div v-for="skill in appState.skills" :key="`${skill.scope}:${skill.name}`" class="skill-card">
              <div class="skill-head">
                <span class="skill-name">{{ skill.name }}</span>
                <ElTag size="small">{{ skill.scope }}</ElTag>
                <ElTag v-if="skill.runAs" size="small" type="warning">{{ skill.runAs }}</ElTag>
              </div>
              <div class="skill-desc">{{ skill.description }}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<style scoped>
.settings-layout { display: flex; gap: 20px; min-height: 400px; }
.settings-menu { width: 100px; min-width: 100px; border-right: 1px solid var(--el-border-color-light); }
.settings-content { flex: 1; padding: 0 10px; overflow-y: auto; max-height: 65vh; }
.settings-page { padding: 0; }

.section { margin-bottom: 24px; }
.stitle {
  font-size: 13px; font-weight: 600; color: var(--el-text-color-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 12px; padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; gap: 16px;
}
.l { min-width: 0; flex: 1; overflow: hidden; }
.n { font-size: 14px; font-weight: 500; }
.h { font-size: 12px; color: var(--el-text-color-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.seg-ctrl {
  display: flex; border: 1px solid var(--el-border-color); border-radius: 6px; overflow: hidden;
}
.seg-ctrl button {
  padding: 4px 12px; border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--el-text-color-secondary); transition: all 0.15s;
}
.seg-ctrl button:not(:last-child) { border-right: 1px solid var(--el-border-color); }
.seg-ctrl button.on { background: var(--el-color-primary); color: #fff; }
.seg-ctrl button:hover:not(.on) { background: var(--el-color-primary-light-9); }

.preset-grid { display: flex; flex-direction: column; gap: 8px; }
.preset-card {
  padding: 12px 16px; border: 1px solid var(--el-border-color); border-radius: 8px;
  background: var(--el-bg-color); cursor: pointer; text-align: left; transition: border-color 0.15s;
}
.preset-card:hover { border-color: var(--el-color-primary); }
.preset-card.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.preset-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.preset-badge {
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;
  background: var(--el-color-primary); color: #fff;
}
.preset-name { font-size: 14px; font-weight: 500; }
.preset-desc { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; }

.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.info-item { padding: 10px; background: var(--el-fill-color-light); border-radius: 6px; }
.info-key { display: block; font-size: 10px; color: var(--el-text-color-placeholder); text-transform: uppercase; letter-spacing: 0.5px; }
.info-val { font-size: 13px; font-weight: 500; margin-top: 2px; }

.mcp-add-row { display: flex; gap: 8px; margin-bottom: 12px; }
.mcp-add-row .el-input { flex: 1; }
.mcp-card { padding: 10px 14px; border: 1px solid var(--el-border-color); border-radius: 6px; margin-bottom: 8px; }
.mcp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.mcp-name { font-weight: 600; font-size: 14px; flex: 1; }
.mcp-transport { font-size: 11px; color: var(--el-text-color-secondary); font-family: monospace; }
.mcp-summary { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 6px; }
.mcp-actions { display: flex; align-items: center; gap: 8px; }
.mcp-tools { font-size: 11px; color: var(--el-text-color-secondary); }

.skill-card { padding: 10px 14px; border: 1px solid var(--el-border-color); border-radius: 6px; margin-bottom: 8px; }
.skill-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.skill-name { font-weight: 600; font-size: 14px; flex: 1; }
.skill-desc { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; }

.empty-state { padding: 24px; text-align: center; color: var(--el-text-color-placeholder); font-size: 13px; background: var(--el-fill-color-light); border-radius: 6px; }
</style>
