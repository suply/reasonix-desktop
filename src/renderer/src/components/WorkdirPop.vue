<script setup lang="ts">
// 工作目录选择弹窗
import { ref } from "vue"
import { ElDialog, ElButton, ElInput, ElMessage } from "element-plus"
import { useSettingsStore } from "../stores/settings"
import { useSessionStore } from "../stores/session"

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
}>()

const settings = useSettingsStore()
const session = useSessionStore()
const newDir = ref(settings.settings.workspaceDir || "")

// 打开系统目录选择器
async function pickDirectory() {
  if (!window.api) return
  const result = await window.api.dialog.open({
    properties: ["openDirectory"],
    title: "选择工作目录",
  })
  if (!result.canceled && result.filePaths.length > 0) {
    newDir.value = result.filePaths[0]!
  }
}

// 保存工作目录
function save() {
  const dir = newDir.value.trim()
  if (!dir) {
    ElMessage.warning("请输入有效路径")
    return
  }
  session.sendCommand({ cmd: "settings_save", workspaceDir: dir })
  emit("update:visible", false)
  ElMessage.success(`工作目录已更改为: ${dir}`)
}

// 打开时同步当前值
function onOpen() {
  newDir.value = settings.settings.workspaceDir || ""
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    @open="onOpen"
    title="更改工作目录"
    width="500px"
    align-center
  >
    <div class="workdir-content">
      <p class="workdir-desc">
        工作目录是 Reasonix 文件系统工具的操作根目录。所有文件读写都将限制在此目录内。
      </p>

      <div class="workdir-input-row">
        <ElInput
          v-model="newDir"
          placeholder="输入路径或点击浏览选择..."
        />
        <ElButton @click="pickDirectory">浏览...</ElButton>
      </div>

      <div class="workdir-current">
        当前: <code>{{ settings.settings.workspaceDir || "未设置" }}</code>
      </div>
    </div>

    <template #footer>
      <ElButton @click="emit('update:visible', false)">取消</ElButton>
      <ElButton type="primary" @click="save">保存</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.workdir-content {
  padding: 10px 0;
}
.workdir-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}
.workdir-input-row {
  display: flex;
  gap: 8px;
}
.workdir-input-row .el-input {
  flex: 1;
}
.workdir-current {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.workdir-current code {
  font-family: ui-monospace, monospace;
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
