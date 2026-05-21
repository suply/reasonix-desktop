<script setup lang="ts">
// 关于弹窗
import { ElDialog } from "element-plus"
import { useSettingsStore } from "../stores/settings"

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
}>()

const settings = useSettingsStore()
</script>

<template>
  <ElDialog
    :model-value="visible"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    title="关于 Reasonix"
    width="400px"
    align-center
  >
    <div class="about-content">
      <div class="about-logo">Reasonix</div>
      <div class="about-desc">DeepSeek 原生智能体框架</div>
      <div class="about-version">版本: {{ settings.settings.version || "?" }}</div>
    </div>
  </ElDialog>
</template>

<style scoped>
.about-content {
  text-align: center;
  padding: 20px 0;
}
.about-logo {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}
.about-desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}
.about-version {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
