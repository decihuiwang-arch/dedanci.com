<template>
  <el-dialog
    v-model="visible"
    width="800px"
    :show-close="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    @close="handleClose"
    class="sim-modal"
    append-to-body
  >
    <template #header>
      <div class="sim-header">
        <div>
          <span class="sim-title">🔬 {{ simTitle }}</span>
          <span class="sim-subtitle">互动小实验</span>
        </div>
        <span class="sim-brand">🎨 得单词原创模拟</span>
      </div>
    </template>
    <div class="sim-body">
      <canvas
        ref="simCanvas"
        class="sim-canvas"
        style="touch-action: none"
      ></canvas>
      <div v-if="simContext" class="sim-context">
        💡 {{ simContext }}
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  simId: { type: String, default: '' },
  simTitle: { type: String, default: '' },
  simContext: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
const simCanvas = ref(null)

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.simId) {
    nextTick(() => {
      setTimeout(() => startSimulation(), 100)
    })
  } else {
    stopSimulation()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) stopSimulation()
})

function startSimulation() {
  const canvas = simCanvas.value
  if (!canvas) return
  if (typeof window.startSim === 'function' && props.simId) {
    window.startSim(canvas, props.simId)
  }
}

function stopSimulation() {
  if (typeof window.stopSim === 'function') {
    window.stopSim()
  }
}

function handleClose() {
  stopSimulation()
  visible.value = false
  emit('update:modelValue', false)
}
</script>

<style scoped>
.sim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sim-title {
  font-size: 16px;
  font-weight: bold;
  color: #1f2937;
}

.sim-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 8px;
}

.sim-brand {
  font-size: 10px;
  color: #d1d5db;
}

.sim-body {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.sim-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: block;
  background: #f8fafc;
}

.sim-context {
  padding: 12px 16px;
  background: linear-gradient(135deg, #eef2ff, #f5f3ff);
  border-top: 1px solid #e0e7ff;
  font-size: 13px;
  color: #4f46e5;
  text-align: center;
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  margin-right: 0;
}

:deep(.el-dialog__body) {
  padding: 0;
}
</style>
