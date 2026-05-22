<script setup lang="ts">
/**
 * Context 面板 — 对照 desktop/src/ui/context-panel.tsx
 */
import { ref, computed } from "vue"
import { useAppStore } from "../stores/app"
import { useSessionStore } from "../stores/session"
import { useSettingsStore } from "../stores/settings"

const appState = useAppStore()
const session = useSessionStore()
const settings = useSettingsStore()

type Tab = "files" | "tools" | "memory" | "rules"
const activeTab = ref<Tab>("files")

const CONTEXT_MAX_TOKENS = 1_000_000

/** 用量数据 */
const usage = computed(() => session.usageStats)
const reserved = computed(() => usage.value.reservedTokens)
const cachedHit = computed(() => Math.max(0, usage.value.cacheHitTokens - reserved.value))
const cacheMiss = computed(() => Math.max(0, usage.value.cacheMissTokens - Math.max(0, reserved.value - usage.value.cacheHitTokens)))
const reservedPct = computed(() => Math.min(100, (reserved.value / CONTEXT_MAX_TOKENS) * 100))
const usedPct = computed(() => Math.min(100, (cacheMiss.value / CONTEXT_MAX_TOKENS) * 100))
const cachedPct = computed(() => Math.min(100, (cachedHit.value / CONTEXT_MAX_TOKENS) * 100))
const freeTokens = computed(() => Math.max(0, CONTEXT_MAX_TOKENS - reserved.value - cacheMiss.value - cachedHit.value))
const totalUsed = computed(() => reserved.value + cacheMiss.value + cachedHit.value)

/** 文件树 */
interface TreeNode {
  kind: "dir" | "file"
  depth: number
  name: string
  key: string
  status?: "c" | "m"
}

const fileTree = computed(() => {
  const files = session.sessionFiles
  const sorted = [...files].sort((a, b) =>
    a.path.replace(/\\/g, "/").localeCompare(b.path.replace(/\\/g, "/")),
  )
  const out: TreeNode[] = []
  const seenDirs = new Set<string>()
  for (const f of sorted) {
    const parts = f.path.replace(/\\/g, "/").split("/").filter(Boolean)
    if (parts.length === 0) continue
    let prefix = ""
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]!
      prefix = prefix ? `${prefix}/${seg}` : seg
      if (!seenDirs.has(prefix)) {
        seenDirs.add(prefix)
        out.push({ kind: "dir", depth: i, name: seg, key: `d:${prefix}` })
      }
    }
    const leaf = parts[parts.length - 1]!
    out.push({
      kind: "file",
      depth: parts.length - 1,
      name: leaf,
      key: `f:${f.path}`,
      status: f.status,
    })
  }
  return out
})

/** 根据 editMode 生成审批规则 */
const approvalRules = computed(() => {
  const mode = settings.settings.editMode ?? "review"
  if (mode === "yolo") {
    return [{ p: "*", allow: true, desc: "自动执行所有操作" }]
  }
  if (mode === "auto") {
    return [
      { p: "read_file, list_directory, search_files, *", allow: true, desc: "只读工具自动批准" },
      { p: "run_command (allowlist)", allow: true, desc: "安全命令自动执行" },
      { p: "edit_file, write_file, run_command (other)", allow: false, desc: "写操作需用户批准" },
    ]
  }
  return [{ p: "*", allow: false, desc: "所有操作需用户手动批准" }]
})
</script>

<template>
  <aside class="ctx-panel">
    <!-- 标签栏 -->
    <div class="ctx-tabs">
      <div class="ctx-tab" :data-active="activeTab === 'files'" @click="activeTab = 'files'">文件</div>
      <div class="ctx-tab" :data-active="activeTab === 'tools'" @click="activeTab = 'tools'">工具</div>
      <div class="ctx-tab" :data-active="activeTab === 'memory'" @click="activeTab = 'memory'">记忆</div>
      <div class="ctx-tab" :data-active="activeTab === 'rules'" @click="activeTab = 'rules'">规则</div>
    </div>

    <div class="ctx-body">
      <!-- ═══ Token 用量 ═══ -->
      <div class="ctx-block">
        <div class="h">
          <span>上下文 tokens</span>
          <span class="right">{{ totalUsed.toLocaleString() }} / {{ CONTEXT_MAX_TOKENS.toLocaleString() }}</span>
        </div>
        <div class="meter">
          <span class="rsvd" :style="{ width: reservedPct + '%' }" />
          <span class="cached" :style="{ width: cachedPct + '%' }" />
          <span class="used" :style="{ width: usedPct + '%' }" />
        </div>
        <div class="legend">
          <span class="l">
            <span class="sw r" />系统 <span class="v">{{ reserved.toLocaleString() }}</span>
          </span>
          <span class="l">
            <span class="sw c" />缓存 <span class="v">{{ cachedHit.toLocaleString() }}</span>
          </span>
          <span class="l">
            <span class="sw u" />对话 <span class="v">{{ cacheMiss.toLocaleString() }}</span>
          </span>
          <span class="l">
            剩余 <span class="v">{{ freeTokens.toLocaleString() }}</span>
          </span>
        </div>
      </div>

      <!-- ═══ 文件标签 ═══ -->
      <div v-if="activeTab === 'files'" class="ctx-block">
        <div class="h">
          <span>会话文件</span>
          <span class="right">{{ session.sessionFiles.length === 0 ? '—' : session.sessionFiles.length + ' 个' }}</span>
        </div>
        <div v-if="session.sessionFiles.length === 0" class="ctx-empty">当前会话无文件</div>
        <div v-else class="tree">
          <div v-for="n in fileTree" :key="n.key">
            <!-- 目录 -->
            <div v-if="n.kind === 'dir'" class="node" :style="{ paddingLeft: 8 + n.depth * 14 + 'px' }" data-kind="dir">
              <span class="nm">{{ n.name }}/</span>
            </div>
            <!-- 文件 -->
            <div v-else class="node" :style="{ paddingLeft: 8 + n.depth * 14 + 'px' }"
              data-kind="file" :title="n.name">
              <span class="nm">{{ n.name }}</span>
              <span class="dot" :data-s="n.status" :title="n.status === 'm' ? '已修改' : '已读取'" />
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ 工具标签 ═══ -->
      <div v-if="activeTab === 'tools'" class="ctx-block">
        <div class="h">
          <span>MCP 工具</span>
          <span class="right">{{ appState.mcpSpecs.length === 0 ? '—' : appState.mcpBridged ? '全部就绪' : appState.mcpSpecs.filter(s => s.status === 'connected').length + '/' + appState.mcpSpecs.length }}</span>
        </div>
        <div v-if="appState.mcpSpecs.length === 0" class="ctx-empty">未配置 MCP</div>
        <div v-else>
          <div v-for="s in appState.mcpSpecs" :key="s.raw" class="mcp-row">
            <div class="body">
              <div class="n">{{ s.name ?? s.summary }}</div>
              <div class="m">{{ s.transport }}{{ s.statusReason ? ' · ' + s.statusReason : '' }}</div>
            </div>
            <span class="status" :data-s="s.status === 'connected' ? 'ok' : s.status === 'failed' || s.parseError ? 'off' : 'pending'" />
          </div>
        </div>
      </div>

      <!-- ═══ 记忆标签 ═══ -->
      <div v-if="activeTab === 'memory'" class="ctx-block">
        <div class="h">
          <span>记忆</span>
          <span class="right">{{ appState.memory.length === 0 ? '—' : appState.memory.length + ' 条' }}</span>
        </div>
        <div v-if="appState.memory.length === 0" class="ctx-empty">暂无记忆</div>
        <div v-else class="mem">
          <div v-for="m in appState.memory" :key="`${m.scope}/${m.name}`" class="mem-row"
            :title="m.description || m.name">
            <span class="scope" :data-s="m.scope">{{ m.scope === 'project' ? '项目' : '全局' }}</span>
            <span class="txt">{{ m.description || m.name }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ 规则标签 ═══ -->
      <div v-if="activeTab === 'rules'" class="ctx-block">
        <div class="h">
          <span>自动审批</span>
          <span class="right">{{ settings.settings.editMode || 'review' }}</span>
        </div>
        <div v-for="r in approvalRules" :key="r.p" class="rule">
          <div class="top">
            <span class="pat" :class="{ deny: !r.allow }">{{ r.p }}</span>
            <span class="sw" :class="{ deny: !r.allow }">{{ r.allow ? '允许' : '询问' }}</span>
          </div>
          <div class="desc">{{ r.desc }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.ctx-panel {
  width: 220px;
  min-width: 220px;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  border-left: 1px solid var(--el-border-color-light);
  font-size: 12px;
  overflow: hidden;
}

/* ─── 标签栏 ─── */
.ctx-tabs {
  display: flex;
  gap: 2px;
  padding: 4px 6px 0;
  border-bottom: 1px solid var(--el-border-color-light);
}
.ctx-tab {
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  border-bottom: 2px solid transparent;
  transition: color .12s, border-color .12s;
}
.ctx-tab:hover {
  color: var(--el-text-color-primary);
}
.ctx-tab[data-active="true"] {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

/* ─── 正文 ─── */
.ctx-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.ctx-block {
  padding: 0 10px 8px;
}

.ctx-block .h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 6px 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ctx-block .h .right {
  font-weight: 400;
  font-size: 10px;
  color: var(--el-text-color-placeholder);
  font-family: ui-monospace, monospace;
}

.ctx-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 11px;
}

/* ─── Token Meter ─── */
.meter {
  height: 4px;
  border-radius: 2px;
  background: var(--el-fill-color);
  display: flex;
  overflow: hidden;
  margin-bottom: 6px;
}
.meter .rsvd { background: var(--el-color-primary); }
.meter .cached { background: var(--el-color-success); }
.meter .used { background: var(--el-color-warning); }

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 10px;
  color: var(--el-text-color-secondary);
}
.legend .l { display: inline-flex; align-items: center; gap: 3px; }
.legend .sw { width: 6px; height: 6px; border-radius: 1px; flex-shrink: 0; }
.legend .sw.r { background: var(--el-color-primary); }
.legend .sw.c { background: var(--el-color-success); }
.legend .sw.u { background: var(--el-color-warning); }
.legend .v { color: var(--el-text-color-primary); font-variant-numeric: tabular-nums; }

/* ─── Files Tree ─── */
.tree .node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  font-size: 11px;
}
.tree .node[data-kind="dir"] .nm {
  color: var(--el-text-color-secondary);
}
.tree .node[data-kind="file"] .nm {
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree .node .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: auto;
}
.tree .node .dot[data-s="m"] { background: var(--el-color-warning); }
.tree .node .dot[data-s="c"] { background: var(--el-color-info); }

/* ─── MCP ─── */
.mcp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.mcp-row .body { flex: 1; min-width: 0; }
.mcp-row .n { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mcp-row .m { font-size: 10px; color: var(--el-text-color-placeholder); }
.mcp-row .status {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.mcp-row .status[data-s="ok"] { background: var(--el-color-success); }
.mcp-row .status[data-s="pending"] { background: var(--el-color-warning); }
.mcp-row .status[data-s="off"] { background: var(--el-color-danger); }

/* ─── Memory ─── */
.mem .mem-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 0;
  font-size: 11px;
}
.mem .scope {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}
.mem .scope[data-s="project"] { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
.mem .scope[data-s="global"] { background: var(--el-fill-color-light); color: var(--el-text-color-secondary); }
.mem .txt { line-height: 1.4; color: var(--el-text-color-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ─── Rules ─── */
.rule { padding: 4px 0; }
.rule .top { display: flex; align-items: center; gap: 6px; }
.rule .pat { font-family: ui-monospace, monospace; font-size: 10px; color: var(--el-color-primary); }
.rule .pat.deny { color: var(--el-color-danger); }
.rule .sw { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: var(--el-color-success-light-9); color: var(--el-color-success); margin-left: auto; }
.rule .sw.deny { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
.rule .desc { font-size: 10px; color: var(--el-text-color-placeholder); margin-top: 2px; }
</style>
