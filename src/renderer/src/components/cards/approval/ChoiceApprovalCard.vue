<script setup lang="ts">
import { Icons } from "../../icons"
import { useSessionStore } from "../../../stores/session"
import type { PendingChoice } from "../../../stores/session"

defineProps<{ choice: PendingChoice }>()
const session = useSessionStore()
</script>

<template>
  <div class="approval" data-tone="info">
    <div class="ap-head">
      <span class="ap-ico" v-html="Icons.helpCircle()" />
      <div>
        <div class="ap-kind">选择</div>
        <div class="ap-title">{{ choice.question }}</div>
        <div class="ap-sub">请选择一个选项</div>
      </div>
    </div>
    <div class="ap-options">
      <button
        v-for="opt in choice.options"
        :key="opt.id"
        class="ap-option"
        @click="session.pickChoice(choice.id, opt.id)"
      >
        <div class="ap-option-title">{{ opt.title }}</div>
        <div v-if="opt.summary" class="ap-option-summary">{{ opt.summary }}</div>
      </button>
      <button v-if="choice.allowCustom" class="ap-option ap-option-custom" @click="session.cancelChoice(choice.id)">
        自定义输入...
      </button>
    </div>
    <div class="ap-foot">
      <button type="button" class="btn ghost" @click="session.cancelChoice(choice.id)">取消</button>
    </div>
  </div>
</template>

<style scoped>
.approval {
  border: 1px solid var(--el-border-color); border-radius: 8px; padding: 14px;
  margin: 8px 0; background: var(--el-bg-color);
  border-left: 3px solid var(--el-color-primary);
}
.ap-head { display: flex; gap: 10px; margin-bottom: 10px; }
.ap-ico { font-size: 18px; }
.ap-kind { font-size: 11px; font-weight: 600; color: var(--el-text-color-secondary); text-transform: uppercase; }
.ap-title { font-size: 14px; font-weight: 600; }
.ap-sub { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }

.ap-options { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.ap-option {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 8px 12px; border: 1px solid var(--el-border-color); border-radius: 6px;
  background: var(--el-bg-color); cursor: pointer;
  text-align: left; transition: border-color 0.15s; width: 100%;
}
.ap-option:hover { border-color: var(--el-color-primary); }
.ap-option-custom { border-style: dashed; color: var(--el-text-color-secondary); }
.ap-option-title { font-weight: 500; font-size: 13px; }
.ap-option-summary { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }

.ap-foot { display: flex; gap: 8px; margin-top: 10px; }

.btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid var(--el-border-color);
  background: var(--el-bg-color); cursor: pointer; font-size: 12px;
  color: var(--el-text-color-primary);
}
.btn.ghost { border-color: transparent; color: var(--el-text-color-secondary); }
.btn.ghost:hover { background: var(--el-fill-color-light); color: var(--el-text-color-primary); }
</style>
