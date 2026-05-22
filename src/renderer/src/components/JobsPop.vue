<script setup lang="ts">
/** 后台任务弹窗 — 对照 desktop/src/ui/jobs-pop.tsx */
import { Icons } from "./icons"
import { ref, computed, watch, onUnmounted } from "vue"
import { useAppStore } from "../stores/app"
import { useSessionStore } from "../stores/session"

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ "update:open": [value: boolean] }>()

const appState = useAppStore()
const session = useSessionStore()

// 展开状态（按 jobId）
const expandedIds = ref<Set<number>>(new Set())
const tick = ref(0)
// tick 驱动模板重新渲染以更新运行中计时器
let timer: ReturnType<typeof setInterval> | null = null

watch(
  () => props.open,
  (v) => {
    if (v) {
      session.sendCommand({ cmd: "jobs_list" })
      timer = setInterval(() => tick.value++, 600)
    } else {
      if (timer) clearInterval(timer)
      timer = null
    }
  },
)

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ESC 关闭
watch(
  () => props.open,
  (v) => {
    if (!v) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); emit("update:open", false) }
    }
    window.addEventListener("keydown", onKey)
    const unwatch = watch(() => props.open, (open) => { if (!open) { window.removeEventListener("keydown", onKey); unwatch() } })
  },
)

const running = computed(() => appState.jobs.filter((j) => j.running))
const exited = computed(() => appState.jobs.filter((j) => !j.running))

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}m${r}s`
}

function liveElapsed(startedAt: number, running: boolean): number {
  return (running ? Date.now() : startedAt) - startedAt
}

function toggleExpand(id: number) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function stopJob(id: number) {
  session.sendCommand({ cmd: "jobs_stop", jobId: id })
}

function stopAll() {
  session.sendCommand({ cmd: "jobs_stop_all" })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="jobs-mask" @click="emit('update:open', false)">
      <!-- tick 隐藏引用以驱动运行中计时器更新 -->
      <span style="display:none">{{ tick }}</span>
      <div class="jobs-pop" @click.stop>
        <!-- 头部 -->
        <div class="jobs-head">
          <span class="ico" v-html="Icons.cpu()" />
          <div>
            <div class="tt">后台任务</div>
            <div class="ss">
              <span class="b ok">{{ running.length }}</span> 运行中 ·
              <span class="b mut">{{ exited.length }}</span> 已退出
            </div>
          </div>
          <span class="grow" />
          <button v-if="running.length > 0" type="button" class="btn danger sm" @click="stopAll" title="停止所有任务">
            <span v-html="Icons.stop()" /> 全部停止
          </button>
        </div>

        <!-- 列表 -->
        <div class="jobs-body">
          <div v-if="appState.jobs.length === 0" class="jobs-empty">没有后台任务</div>

          <template v-else>
            <!-- 运行中 -->
            <div v-if="running.length > 0" class="jobs-grp">运行中</div>
            <div v-for="job in running" :key="job.id" class="job-row" data-status="running">
              <div class="jr-main" @click="toggleExpand(job.id)">
                <span class="jr-state"><span class="spin" /></span>
                <span class="jr-kind" v-html="Icons.terminal()" /><span class="jr-kind-label">shell</span>
                <div class="jr-body">
                  <div class="nm" :title="job.command">{{ job.command }}</div>
                  <div class="sub">
                    <span class="ses">{{ job.sessionLabel }}</span>
                    <span v-if="job.spawnError" class="rk">· {{ job.spawnError }}</span>
                  </div>
                </div>
                <div class="jr-time">{{ formatElapsed(liveElapsed(job.startedAt, true)) }}</div>
                <div class="jr-act">
                  <button type="button" class="btn danger sm" title="停止" @click.stop="stopJob(job.id)">
                    <span v-html="Icons.stop()" /> 停止
                  </button>
                </div>
              </div>
              <div v-if="expandedIds.has(job.id)" class="jr-detail">
                <div class="kv-grid">
                  <div><span class="k">job_id</span><span class="v">{{ job.id }}</span></div>
                  <div><span class="k">pid</span><span class="v">{{ job.pid ?? "—" }}</span></div>
                  <div><span class="k">elapsed</span><span class="v">{{ formatElapsed(liveElapsed(job.startedAt, true)) }}</span></div>
                </div>
                <pre v-if="job.outputTail" class="jr-log">{{ job.outputTail }}</pre>
              </div>
            </div>

            <!-- 已退出 -->
            <div v-if="exited.length > 0" class="jobs-grp">已退出</div>
            <div v-for="job in exited" :key="job.id" class="job-row" data-status="exited">
              <div class="jr-main" @click="toggleExpand(job.id)">
                <span class="jr-state" v-html="Icons.history()" />
                <span class="jr-kind" v-html="Icons.terminal()" /><span class="jr-kind-label">shell</span>
                <div class="jr-body">
                  <div class="nm" :title="job.command">{{ job.command }}</div>
                  <div class="sub">
                    <span class="ses">{{ job.sessionLabel }}</span>
                    <span v-if="job.exitCode !== null && job.exitCode !== 0" class="rk">· exit {{ job.exitCode }}</span>
                  </div>
                </div>
                <div class="jr-time">{{ formatElapsed(liveElapsed(job.startedAt, false)) }}</div>
                <div class="jr-act">
                  <span class="jr-exit" :title="`exit ${job.exitCode ?? '—'}`">
                    {{ job.exitCode === 0 ? "ok" : `exit ${job.exitCode ?? "?"}` }}
                  </span>
                </div>
              </div>
              <div v-if="expandedIds.has(job.id)" class="jr-detail">
                <div class="kv-grid">
                  <div><span class="k">job_id</span><span class="v">{{ job.id }}</span></div>
                  <div><span class="k">pid</span><span class="v">{{ job.pid ?? "—" }}</span></div>
                  <div><span class="k">elapsed</span><span class="v">{{ formatElapsed(liveElapsed(job.startedAt, false)) }}</span></div>
                </div>
                <pre v-if="job.outputTail" class="jr-log">{{ job.outputTail }}</pre>
              </div>
            </div>
          </template>
        </div>

        <!-- 底部 -->
        <div class="jobs-foot">
          <span v-html="Icons.zap()" />
          <span>运行中 <span class="v">{{ running.length }}</span></span>
          <span>·</span>
          <span>已退出 <span class="v">{{ exited.length }}</span></span>
          <span class="grow" />
          <span>Ctrl+J 切换 · ESC 关闭</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.jobs-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.jobs-pop {
  width: 640px;
  max-width: 90vw;
  max-height: 70vh;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── 头部 ─── */
.jobs-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.ico { display: flex; align-items: center; justify-content: center; font-size: 18px; }
.tt { font-weight: 600; font-size: 14px; }
.ss { font-size: 12px; color: var(--el-text-color-secondary); }
.ss .b.ok { color: var(--el-color-success); font-weight: 600; }
.ss .b.mut { color: var(--el-text-color-secondary); font-weight: 600; }

.grow { flex: 1; }

/* ─── 通用按钮 ─── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  padding: 4px 10px;
  transition: background .1s;
}
.btn.sm { padding: 2px 8px; font-size: 11px; }
.btn.danger { border-color: var(--el-color-danger); color: var(--el-color-danger); }
.btn.danger:hover { background: var(--el-color-danger-light-9); }

/* ─── 列表 ─── */
.jobs-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.jobs-empty { padding: 40px 16px; text-align: center; color: var(--el-text-color-placeholder); }
.jobs-grp {
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ─── 行 ─── */
.job-row {
  border-bottom: 1px solid var(--el-border-color-light);
}
.jr-main {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.1s;
}
.jr-main:hover { background: var(--el-fill-color-light); }

.jr-state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  font-size: 12px;
  flex-shrink: 0;
}
.jr-state .spin {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--el-border-color);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.jr-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}
.jr-kind-label {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.jr-body { flex: 1; min-width: 0; }
.nm {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub { font-size: 11px; color: var(--el-text-color-secondary); }
.sub .ses { }
.sub .rk { color: var(--el-color-danger); }

.jr-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.jr-act { min-width: 56px; text-align: right; }
.jr-exit {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, monospace;
}

/* ─── 详情 ─── */
.jr-detail {
  padding: 0 16px 10px;
  margin-left: 56px;
}
.kv-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.kv-grid .k { display: block; font-size: 10px; color: var(--el-text-color-placeholder); text-transform: uppercase; }
.kv-grid .v { font-size: 12px; font-family: ui-monospace, monospace; }
.jr-log {
  background: var(--el-fill-color);
  border-radius: 4px;
  padding: 8px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.4;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ─── 底部 ─── */
.jobs-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-top: 1px solid var(--el-border-color-light);
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}
.jobs-foot .v { color: var(--el-text-color-secondary); font-weight: 600; }
</style>
