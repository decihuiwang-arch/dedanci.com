<template>
  <AppLayout>
    <div class="vocab-page">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>词库管理</span>
            <div>
              <el-button type="primary" @click="showCreateDialog = true">创建词库</el-button>
              <el-button @click="showExtractDialog = true">从文本提取</el-button>
            </div>
          </div>
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
          <el-tag v-for="w in extractResult.words" :key="w.word" style="margin: 4px">
            {{ w.word }}
          </el-tag>
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
const loading = ref(false)
const vocabularies = ref([])
const showCreateDialog = ref(false)
const showExtractDialog = ref(false)
const extracting = ref(false)
const extractResult = ref(null)

const newVocab = ref({ name: '', description: '', category: 'custom' })
const extractText = ref('')
const extractLevel = ref('cet6')

const loadVocabularies = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/vocabularies', {
      headers: { 'x-user-id': '1' }
    })
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
    await axios.post('/api/vocabularies', newVocab.value, {
      headers: { 'x-user-id': '1' }
    })
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
      ElMessage.success(`提取到 ${res.data.data.words?.length || 0} 个单词`)
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
})
</script>

<style scoped>
.vocab-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
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
</style>
