<template>
  <AppLayout>
    <div class="errorbook-page">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>错题本</span>
            <el-button type="primary" @click="analyzeErrors" :loading="analyzing" :disabled="errorWords.length === 0">
              <el-icon><MagicStick /></el-icon> AI 分析
            </el-button>
          </div>
        </template>

        <el-empty v-if="errorWords.length === 0" description="暂无错词，继续加油！" />

        <el-table v-else :data="errorWords" style="width: 100%">
          <el-table-column prop="word" label="单词" width="150" />
          <el-table-column prop="meaning" label="释义" min-width="200" />
          <el-table-column prop="error_count" label="错误次数" width="100">
            <template #default="{ row }">
              <el-tag :type="row.error_count >= 5 ? 'danger' : 'warning'">{{ row.error_count }} 次</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="last_error_at" label="最近错误" width="180" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" link @click="reviewWord(row)">复习</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- AI 分析结果 -->
      <el-card v-if="analysisResult" style="margin-top: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>AI 错题分析</span>
            <el-button size="small" @click="speakAnalysis">
              <el-icon><Volume /></el-icon> 朗读
            </el-button>
          </div>
        </template>
        <div class="analysis-content">
          <div class="analysis-section" v-if="analysisResult.errorTypes">
            <h4>错误类型分析</h4>
            <el-tag v-for="t in analysisResult.errorTypes" :key="t.type" style="margin: 4px" :type="getTagType(t.count)">
              {{ t.type }} ({{ t.count }}次)
            </el-tag>
          </div>
          <div class="analysis-section" v-if="analysisResult.weakness">
            <h4>薄弱环节</h4>
            <p>{{ analysisResult.weakness }}</p>
          </div>
          <div class="analysis-section" v-if="analysisResult.suggestions">
            <h4>改进建议</h4>
            <ul>
              <li v-for="(s, i) in analysisResult.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>
          <div class="analysis-section" v-if="analysisResult.studyPlan">
            <h4>学习计划建议</h4>
            <p>每日新词：{{ analysisResult.studyPlan.dailyNewWords }} 个</p>
            <p>每日复习：{{ analysisResult.studyPlan.dailyReview }} 个</p>
          </div>
        </div>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useAuth } from '../stores/auth'

const router = useRouter()
// axios 拦截器已自动附加 token

const errorWords = ref([])
const analyzing = ref(false)
const analysisResult = ref(null)

const loadErrorWords = async () => {
  try {
    const res = await axios.get('/api/error-book')
    if (res.data.success) {
      errorWords.value = res.data.data
    }
  } catch (error) {
    console.error('加载错词失败:', error)
    ElMessage.error('加载错题本失败')
  }
}

const analyzeErrors = async () => {
  if (errorWords.value.length === 0) {
    return ElMessage.warning('暂无错词可分析')
  }

  analyzing.value = true
  try {
    const res = await axios.post('/api/ai/analyze-errors', {
      errorWords: errorWords.value,
      userData: { studyDays: 30, accuracy: 75 }
    })
    if (res.data.success) {
      analysisResult.value = res.data.data
    }
  } catch (error) {
    ElMessage.error('分析失败: ' + (error.response?.data?.error || error.message))
  } finally {
    analyzing.value = false
  }
}

const reviewWord = (word) => {
  router.push({
    path: '/study',
    query: { word: word.word }
  })
}

const getTagType = (count) => {
  if (count >= 5) return 'danger'
  if (count >= 3) return 'warning'
  return 'info'
}

const speakAnalysis = () => {
  if (!analysisResult.value) return

  const parts = []
  if (analysisResult.value.weakness) parts.push(analysisResult.value.weakness)
  if (analysisResult.value.suggestions) {
    parts.push('建议：' + analysisResult.value.suggestions.join('。'))
  }

  const text = parts.join('。')
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }
}

onMounted(() => {
  loadErrorWords()
})
</script>

<style scoped>
.errorbook-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.analysis-content {
  max-height: 400px;
  overflow-y: auto;
}

.analysis-section {
  margin-bottom: 20px;
}

.analysis-section h4 {
  margin-bottom: 12px;
  color: #333;
}

.analysis-section p {
  color: #666;
  line-height: 1.8;
}

.analysis-section ul {
  padding-left: 20px;
}

.analysis-section li {
  color: #666;
  line-height: 2;
}
</style>
