<template>
  <AppLayout>
    <div class="vocab-page">
      <!-- 搜索栏 -->
      <el-card class="search-card">
        <div class="search-row">
          <el-input
            v-model="searchQuery"
            placeholder="搜索单词或释义..."
            size="large"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 搜索结果 -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div v-for="w in searchResults" :key="w.id" class="search-item" @click="goToWord(w)">
            <div class="si-main">
              <span class="si-word">{{ w.word }}</span>
              <span class="si-phonetic">{{ w.phonetic }}</span>
              <el-tag v-if="w.category" size="small" type="info">{{ w.category }}</el-tag>
            </div>
            <div class="si-meaning">{{ w.meaning }}</div>
          </div>
        </div>
      </el-card>

      <!-- 快捷入口 -->
      <div class="quick-links">
        <el-button @click="showStarred = true" type="warning" plain>
          <el-icon><Star /></el-icon> 生词本 ({{ starredCount }})
        </el-button>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon> 创建词库
        </el-button>
        <el-button @click="showExtractDialog = true">
          <el-icon><Document /></el-icon> 从文本提取
        </el-button>
      </div>

      <!-- 词库列表 -->
      <el-card>
        <template #header>
          <span>词库管理</span>
        </template>

        <el-table :data="vocabularies" style="width: 100%" v-loading="loading">
          <el-table-column prop="name" label="词库名称" min-width="200" />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="100">
            <template #default="{ row }">
              <el-tag>{{ row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="word_count" label="单词数" width="100" />
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button type="primary" link @click="startStudy(row.id)">开始学习</el-button>
              <el-button link @click="viewDetail(row.id)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 生词本弹窗 -->
      <el-dialog v-model="showStarred" title="生词本" width="600px">
        <el-empty v-if="starredWords.length === 0" description="还没有收藏的单词" />
        <div v-else class="starred-list">
          <div v-for="w in starredWords" :key="w.id" class="starred-item">
            <div class="starred-main">
              <span class="starred-word">{{ w.word }}</span>
              <span class="starred-phonetic">{{ w.phonetic }}</span>
              <el-tag v-if="w.state === 2" size="small" type="success">已掌握</el-tag>
            </div>
            <div class="starred-meaning">{{ w.meaning }}</div>
            <div class="starred-actions">
              <el-button type="primary" link size="small" @click="goToWord(w)">学习</el-button>
              <el-button type="danger" link size="small" @click="unstarWord(w.id)">移除</el-button>
            </div>
          </div>
        </div>
      </el-dialog>

      <!-- 创建词库弹窗 -->
      <el-dialog v-model="showCreateDialog" title="创建词库" width="500px">
        <el-form label-width="80px">
          <el-form-item label="名称">
            <el-input v-model="newVocab.name" placeholder="输入词库名称" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="newVocab.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="newVocab.category" style="width: 100%">
              <el-option label="四六级" value="cet" />
              <el-option label="考研" value="kaoyan" />
              <el-option label="雅思" value="ielts" />
              <el-option label="托福" value="toefl" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="createVocabulary">创建</el-button>
        </template>
      </el-dialog>

      <!-- 从文本提取弹窗 -->
      <el-dialog v-model="showExtractDialog" title="从文本提取生词" width="600px">
        <el-form label-width="80px">
          <el-form-item label="文本内容">
            <el-input v-model="extractText" type="textarea" :rows="8" placeholder="粘贴英文文章..." />
          </el-form-item>
          <el-form-item label="难度等级">
            <el-select v-model="extractLevel" style="width: 100%">
              <el-option label="四级" value="cet4" />
              <el-option label="六级" value="cet6" />
              <el-option label="考研" value="kaoyan" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showExtractDialog = false">取消</el-button>
          <el-button type="primary" @click="extractWords" :loading="extracting">提取</el-button>
        </template>
        <div v-if="extractResult" class="extract-result">
          <h4>提取到 {{ extractResult.words?.length || 0 }} 个单词</h4>
          <el-tag v-for="w in extractResult.words" :key="w.word" style="margin: 4px">{{ w.word }}</el-tag>
        </div>
      </el-dialog>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
// axios 拦截器已自动附加 token，无需手动设置 headers

const loading = ref(false)
const vocabularies = ref([])
const showCreateDialog = ref(false)
const showExtractDialog = ref(false)
const showStarred = ref(false)
const extracting = ref(false)
const extractResult = ref(null)

const newVocab = ref({ name: '', description: '', category: 'custom' })
const extractText = ref('')
const extractLevel = ref('cet6')

// 搜索
const searchQuery = ref('')
const searchResults = ref([])
let searchTimer = null

const handleSearch = () => {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const res = await axios.get('/api/vocabularies/search', {
        params: { q: searchQuery.value }
      })
      if (res.data.success) {
        searchResults.value = res.data.data
      }
    } catch (e) {
      console.error('搜索失败:', e)
    }
  }, 300)
}

const goToWord = (w) => {
  router.push({ path: '/study', query: { word: w.word } })
}

// 生词本
const starredWords = ref([])
const starredCount = ref(0)

const loadStarred = async () => {
  try {
    const res = await axios.get('/api/vocabularies/starred')
    if (res.data.success) {
      starredWords.value = res.data.data
      starredCount.value = res.data.data.length
    }
  } catch (e) {
    console.error('加载生词本失败:', e)
  }
}

const unstarWord = async (wordId) => {
  try {
    await axios.delete('/api/vocabularies/star/' + wordId)
    ElMessage.success('已从生词本移除')
    loadStarred()
  } catch (e) {
    ElMessage.error('移除失败')
  }
}

// 词库
const loadVocabularies = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/vocabularies')
    if (res.data.success) {
      vocabularies.value = res.data.data
    }
  } catch (error) {
    console.error('加载失败:', error)
    ElMessage.error('加载词库失败')
  } finally {
    loading.value = false
  }
}

const createVocabulary = async () => {
  if (!newVocab.value.name) {
    return ElMessage.warning('请输入词库名称')
  }
  try {
    await axios.post('/api/vocabularies', newVocab.value)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    newVocab.value = { name: '', description: '', category: 'custom' }
    loadVocabularies()
  } catch (error) {
    ElMessage.error('创建失败: ' + (error.response?.data?.error || error.message))
  }
}

const extractWords = async () => {
  if (!extractText.value) {
    return ElMessage.warning('请输入文本内容')
  }
  extracting.value = true
  extractResult.value = null
  try {
    const res = await axios.post('/api/vocabularies/extract', {
      text: extractText.value,
      level: extractLevel.value
    })
    if (res.data.success) {
      extractResult.value = res.data.data
      ElMessage.success('提取到 ' + (res.data.data.words?.length || 0) + ' 个单词')
    }
  } catch (error) {
    ElMessage.error('提取失败: ' + (error.response?.data?.error || error.message))
  } finally {
    extracting.value = false
  }
}

const startStudy = (id) => {
  router.push({ path: '/study', query: { vocabId: id } })
}

const viewDetail = (id) => {
  router.push({ path: '/vocabularies/' + id })
}

onMounted(() => {
  loadVocabularies()
  loadStarred()
})
</script>

<style scoped>
.vocab-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.search-card {
  margin-bottom: 20px;
}
.search-results {
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}
.search-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.search-item:hover { background: #f5f7fa; }
.si-main { display: flex; align-items: center; gap: 8px; }
.si-word { font-size: 16px; font-weight: 600; color: #333; }
.si-phonetic { font-size: 13px; color: #999; }
.si-meaning { font-size: 14px; color: #666; margin-top: 2px; }

.quick-links {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.extract-result {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.extract-result h4 {
  margin-bottom: 12px;
  color: #333;
}

/* 生词本 */
.starred-list {
  max-height: 400px;
  overflow-y: auto;
}
.starred-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.starred-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.starred-word { font-size: 16px; font-weight: 600; color: #333; }
.starred-phonetic { font-size: 13px; color: #999; }
.starred-meaning { font-size: 14px; color: #666; margin: 4px 0; }
.starred-actions { display: flex; gap: 8px; }

@media (max-width: 768px) {
  .vocab-page { padding: 16px; }
  .quick-links { flex-direction: column; }
  .quick-links .el-button { width: 100%; }
}
</style>
