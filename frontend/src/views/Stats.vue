<template>
  <AppLayout>
    <div class="stats-page">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-icon"><el-icon :size="40" color="#1890ff"><Collection /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total_words || 0 }}</div>
              <div class="stat-label">已学单词</div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-icon"><el-icon :size="40" color="#52c41a"><CircleCheck /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.mastered || 0 }}</div>
              <div class="stat-label">已掌握</div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-icon"><el-icon :size="40" color="#faad14"><Sunny /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.streak || 0 }}</div>
              <div class="stat-label">连续天数</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card style="margin-top: 20px">
        <template #header>
          <span>今日学习</span>
        </template>
        <el-row :gutter="40">
          <el-col :xs="12" :sm="6">
            <div class="today-stat">
              <div class="value">{{ todayStats.total || 0 }}</div>
              <div class="label">复习次数</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="today-stat">
              <div class="value good">{{ todayStats.good || 0 }}</div>
              <div class="label">良好</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="today-stat">
              <div class="value warn">{{ todayStats.hard || 0 }}</div>
              <div class="label">困难</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="today-stat">
              <div class="value danger">{{ todayStats.again || 0 }}</div>
              <div class="label">忘记</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <el-card style="margin-top: 20px">
        <template #header>
          <span>总体统计</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="总复习次数">{{ stats.total_reps || 0 }}</el-descriptions-item>
          <el-descriptions-item label="总错误次数">{{ stats.total_lapses || 0 }}</el-descriptions-item>
          <el-descriptions-item label="正确率">{{ accuracy }}%</el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const stats = ref({})
const todayStats = ref({})

const accuracy = computed(() => {
  const total = stats.value.total_reps || 0
  const lapses = stats.value.total_lapses || 0
  if (total === 0) return 0
  return Math.round((total - lapses) / total * 100)
})

const loadStats = async () => {
  try {
    const res = await axios.get('/api/study/stats', {
      headers: { 'x-user-id': '1' }
    })
    if (res.data.success) {
      stats.value = res.data.data.total || {}
      todayStats.value = res.data.data.today || {}
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.stats-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  margin-right: 20px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  color: #999;
  margin-top: 4px;
}

.today-stat {
  text-align: center;
  padding: 20px;
}

.today-stat .value {
  font-size: 28px;
  font-weight: bold;
  color: #1890ff;
}

.today-stat .value.good { color: #52c41a; }
.today-stat .value.warn { color: #faad14; }
.today-stat .value.danger { color: #ff4d4f; }

.today-stat .label {
  color: #999;
  margin-top: 8px;
}
</style>
