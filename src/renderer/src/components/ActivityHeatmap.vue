<script setup lang="ts">
/**
 * 历史会话活动热力图 — 类似 GitHub 每日贡献图
 * 根据 sessions 数据的 mtime 统计每日活动（消息数）
 */
import { computed } from "vue"
import { useAppStore } from "../stores/app"

const appState = useAppStore()

// ─── 会话记录提取 ───

/** 按日期分组的消息数 */
const dayMap = computed(() => {
  const map = new Map<string, number>()
  for (const s of appState.sessions) {
    // 从 mtime 取日期部分
    const day = s.mtime?.slice(0, 10) // "YYYY-MM-DD"
    if (!day) continue
    map.set(day, (map.get(day) ?? 0) + s.messageCount)
  }
  return map
})

/** today at 00:00 UTC */
function todayUTC() {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

// ─── 网格数据 ───

const TOTAL_WEEKS = 17 // ~4 个月，类似 GitHub 但更短
const DAYS = 7

/** 返回 { day, count, level } 的扁平数组，每格一格 */
const cells = computed(() => {
  const end = todayUTC()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - TOTAL_WEEKS * DAYS + 1)
  // 对齐到周一
  const dayOfWeek = start.getUTCDay() // 0=Sun
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 偏移到周一
  start.setUTCDate(start.getUTCDate() - offset)

  const cells: { day: string; count: number; level: 0 | 1 | 2 | 3 | 4; date: Date }[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const yyyymmdd = cursor.toISOString().slice(0, 10)
    const count = dayMap.value.get(yyyymmdd) ?? 0
    const level = countToLevel(count)
    cells.push({ day: yyyymmdd, count, level, date: new Date(cursor) })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return cells
})

function countToLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count <= 3) return 1
  if (count <= 10) return 2
  if (count <= 30) return 3
  return 4
}

/** 月份标签 */
const monthLabels = computed(() => {
  const labels: { month: number; year: number; col: number }[] = []
  let prevMonth = -1
  const cellsArr = cells.value
  for (let ci = 0; ci < cellsArr.length; ci++) {
    const c = cellsArr[ci]
    if (!c) continue
    const m = c.date.getUTCMonth()
    if (m !== prevMonth) {
      labels.push({ month: m, year: c.date.getUTCFullYear(), col: Math.floor(ci / DAYS) })
      prevMonth = m
    }
  }
  return labels
})

const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"]

/** 将扁平 cells 按周分组（列） */
const weeks = computed(() => {
  const arr = cells.value
  const cols: typeof arr[] = []
  for (let i = 0; i < arr.length; i += DAYS) {
    cols.push(arr.slice(i, i + DAYS))
  }
  return cols
})

/** 总消息数 */
const totalMessages = computed(() => {
  let sum = 0
  for (const c of cells.value) sum += c.count
  return sum
})

/** 有活动的天数 */
const activeDays = computed(() => cells.value.filter((c) => c.count > 0).length)
</script>

<template>
  <div class="heatmap">
    <div class="heatmap-title">工作区活动</div>
    <div class="heatmap-subtitle">近 4 个月 · {{ totalMessages }} 条消息 · {{ activeDays }} 天活跃</div>

    <div class="heatmap-chart">
      <!-- 左侧星期标签 -->
      <div class="heatmap-day-labels">
        <div v-for="(name, i) in DAY_NAMES" :key="i" class="heatmap-day-label">{{ name }}</div>
      </div>

      <!-- 网格 -->
      <div class="heatmap-grid-wrap">
        <!-- 月份标签 -->
        <div class="heatmap-month-row">
          <div v-for="ml in monthLabels" :key="`${ml.year}-${ml.month}`" class="heatmap-month-label"
            :style="{ left: ml.col * 26 + 'px' }">
            {{ MONTH_NAMES[ml.month] }}
          </div>
        </div>

        <!-- 格子列 -->
        <div class="heatmap-grid">
          <div v-for="(col, ci) in weeks" :key="ci" class="heatmap-col">
            <div v-for="c in col" :key="c.day" class="heatmap-cell"
              :data-l="c.level" :title="`${c.day}: ${c.count} 条消息`" />
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="heatmap-legend">
      <span class="heatmap-legend-label">少</span>
      <span class="heatmap-legend-cell" data-l="0" />
      <span class="heatmap-legend-cell" data-l="1" />
      <span class="heatmap-legend-cell" data-l="2" />
      <span class="heatmap-legend-cell" data-l="3" />
      <span class="heatmap-legend-cell" data-l="4" />
      <span class="heatmap-legend-label">多</span>
    </div>
  </div>
</template>

<style scoped>
.heatmap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  color: var(--el-text-color-placeholder);
}

.heatmap-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.heatmap-subtitle {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 20px;
}

/* ─── 图表 ─── */
.heatmap-chart {
  display: flex;
  gap: 4px;
}

/* ─── 星期标签 ─── */
.heatmap-day-labels {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 18px;
}

.heatmap-day-label {
  height: 18px;
  font-size: 9px;
  color: var(--el-text-color-placeholder);
  line-height: 18px;
}

/* ─── 网格容器 ─── */
.heatmap-grid-wrap {
  display: flex;
  flex-direction: column;
}

/* ─── 月份标签行 ─── */
.heatmap-month-row {
  position: relative;
  margin-bottom: 4px;
  height: 14px;
}

.heatmap-month-label {
  position: absolute;
  font-size: 9px;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
  line-height: 14px;
}

/* ─── 格子列 ─── */
.heatmap-grid {
  display: flex;
  gap: 8px;
}

.heatmap-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ─── 格子 ─── */
.heatmap-cell {
  width: 18px;
  height: 18px;
  border-radius: 2px;
  background: var(--el-fill-color);
  transition: background 0.1s;
  cursor: default;
}

.heatmap-cell[data-l="1"] { background: var(--el-color-primary-light-9); }
.heatmap-cell[data-l="2"] { background: var(--el-color-primary-light-5); }
.heatmap-cell[data-l="3"] { background: var(--el-color-primary); }
.heatmap-cell[data-l="4"] { background: var(--el-color-primary-dark-2, var(--el-color-primary)); }

.heatmap-cell:hover {
  outline: 2px solid var(--el-text-color-placeholder);
  outline-offset: -1px;
}

/* ─── 图例 ─── */
.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 12px;
  font-size: 9px;
  color: var(--el-text-color-placeholder);
}

.heatmap-legend-cell {
  width: 18px;
  height: 18px;
  border-radius: 2px;
  background: var(--el-fill-color);
}

.heatmap-legend-cell[data-l="0"] { background: var(--el-fill-color); }
.heatmap-legend-cell[data-l="1"] { background: var(--el-color-primary-light-9); }
.heatmap-legend-cell[data-l="2"] { background: var(--el-color-primary-light-5); }
.heatmap-legend-cell[data-l="3"] { background: var(--el-color-primary); }
.heatmap-legend-cell[data-l="4"] { background: var(--el-color-primary-dark-2, var(--el-color-primary)); }

.heatmap-legend-label {
  margin: 0 2px;
}
</style>
