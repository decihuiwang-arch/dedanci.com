<template>
  <AppLayout>
    <div class="profile-page">
      <!-- 用户卡片 -->
      <el-card class="user-card">
        <div class="user-header">
          <div class="user-avatar-large">
            {{ user.username?.charAt(0) || '学' }}
          </div>
          <div class="user-info">
            <div class="user-name-row">
              <h2>{{ user.username || '学习者' }}</h2>
              <el-tag v-if="user.is_guest" type="info" size="small">游客</el-tag>
              <el-tag v-else type="success" size="small">已认证</el-tag>
            </div>
            <p class="user-email">{{ user.email || '未绑定邮箱' }}</p>
            <div class="user-level-bar">
              <span class="level-badge">Lv.{{ user.level || 1 }}</span>
              <el-progress
                :percentage="levelProgress"
                :stroke-width="8"
                :color="'#667eea'"
                :show-text="false"
                style="flex:1; max-width: 200px;"
              />
              <span class="exp-text">{{ user.exp || 0 }} / {{ nextLevelExp }} EXP</span>
            </div>
          </div>
        </div>

        <div class="user-stats-row">
          <div class="mini-stat">
            <span class="mini-value">{{ user.streak_days || 0 }}</span>
            <span class="mini-label">🔥 连续天数</span>
          </div>
          <div class="mini-stat">
            <span class="mini-value">{{ user.level || 1 }}</span>
            <span class="mini-label">⭐ 当前等级</span>
          </div>
          <div class="mini-stat">
            <span class="mini-value">{{ user.exp || 0 }}</span>
            <span class="mini-label">✨ 累积经验</span>
          </div>
        </div>
      </el-card>

      <!-- 编辑资料 -->
      <el-card class="edit-card">
        <template #header>
          <span>📝 编辑资料</span>
        </template>
        <el-form label-width="80px" :model="editForm">
          <el-form-item label="用户名">
            <el-input v-model="editForm.username" placeholder="输入用户名" maxlength="20" show-word-limit />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input :model-value="user.email" disabled placeholder="注册邮箱" />
            <div class="form-hint">邮箱注册后不可更改</div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveProfile" :loading="saving">保存修改</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 修改密码 -->
      <el-card v-if="!user.is_guest" class="edit-card">
        <template #header>
          <span>🔒 修改密码</span>
        </template>
        <el-form label-width="80px" :model="passwordForm">
          <el-form-item label="当前密码">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="输入当前密码" />
          </el-form-item>
          <el-form-item label="新密码">
            <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少6位" />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
          </el-form-item>
          <el-form-item>
            <el-button type="warning" @click="changePassword" :loading="changingPwd">修改密码</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 学习设置 -->
      <el-card class="edit-card">
        <template #header>
          <span>⚙️ 学习设置</span>
        </template>
        <el-form label-width="100px">
          <el-form-item label="每日目标">
            <el-slider v-model="settings.dailyGoal" :min="10" :max="100" :step="5" show-input />
            <div class="form-hint">每日学习单词数量目标</div>
          </el-form-item>
          <el-form-item label="学习提醒">
            <el-switch v-model="settings.reminder" active-text="开启" inactive-text="关闭" />
          </el-form-item>
          <el-form-item label="自动发音">
            <el-switch v-model="settings.autoSpeak" active-text="开启" inactive-text="关闭" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 危险区域 -->
      <el-card class="danger-card">
        <template #header>
          <span style="color:#ff4d4f">⚠️ 账号操作</span>
        </template>
        <div class="danger-actions">
          <div v-if="user.is_guest" class="danger-item">
            <div>
              <strong>升级为正式账号</strong>
              <p>注册邮箱后可保存学习数据</p>
            </div>
            <el-button type="primary" @click="$router.push('/login')">去注册</el-button>
          </div>
          <div class="danger-item">
            <div>
              <strong>退出登录</strong>
              <p>切换到其他账号或游客模式</p>
            </div>
            <el-button type="danger" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { useAuth } from '../stores/auth'

const router = useRouter()
const { user, userName, userLevel, userExp, streakDays, setAuth, logout, fetchUser } = useAuth()

const saving = ref(false)
const changingPwd = ref(false)

// 等级经验阈值
const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000]

const nextLevelExp = computed(() => {
  const level = user.value?.level || 1
  return LEVEL_THRESHOLDS[level] || 5000
})

const levelProgress = computed(() => {
  const exp = user.value?.exp || 0
  const level = user.value?.level || 1
  const prevExp = LEVEL_THRESHOLDS[level - 1] || 0
  const nextExp = LEVEL_THRESHOLDS[level] || 5000
  return Math.min(Math.round((exp - prevExp) / (nextExp - prevExp) * 100), 100)
})

const editForm = ref({
  username: ''
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const settings = ref({
  dailyGoal: 30,
  reminder: true,
  autoSpeak: true
})

// 加载用户信息
onMounted(async () => {
  await fetchUser()
  editForm.value.username = user.value?.username || ''
  // 加载设置
  if (user.value?.settings) {
    Object.assign(settings.value, user.value.settings)
  }
})

// 保存资料
const saveProfile = async () => {
  if (!editForm.value.username.trim()) {
    return ElMessage.warning('用户名不能为空')
  }
  saving.value = true
  try {
    await axios.put('/api/auth/profile', {
      username: editForm.value.username
    })
    ElMessage.success('资料已更新')
    await fetchUser()
  } catch (e) {
    ElMessage.error('更新失败: ' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}

// 修改密码
const changePassword = async () => {
  if (!passwordForm.value.oldPassword) {
    return ElMessage.warning('请输入当前密码')
  }
  if (passwordForm.value.newPassword.length < 6) {
    return ElMessage.warning('新密码至少6位')
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    return ElMessage.warning('两次输入的密码不一致')
  }
  changingPwd.value = true
  try {
    await axios.put('/api/auth/password', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    ElMessage.success('密码已修改，请重新登录')
    logout()
    router.push('/login')
  } catch (e) {
    ElMessage.error('修改失败: ' + (e.response?.data?.error || e.message))
  } finally {
    changingPwd.value = false
  }
}

// 保存设置
const saveSettings = async () => {
  try {
    await axios.put('/api/auth/profile', {
      settings: settings.value
    })
    ElMessage.success('设置已保存')
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 取消
  }
}
</script>

<style scoped>
.profile-page {
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
}

/* 用户卡片 */
.user-card {
  margin-bottom: 20px;
  border-radius: 16px;
}
.user-header {
  display: flex;
  align-items: center;
  gap: 24px;
}
.user-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  flex-shrink: 0;
}
.user-info {
  flex: 1;
}
.user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-name-row h2 {
  margin: 0;
  font-size: 22px;
  color: #333;
}
.user-email {
  color: #999;
  font-size: 14px;
  margin: 4px 0 12px;
}
.user-level-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.level-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.exp-text {
  font-size: 12px;
  color: #999;
}

.user-stats-row {
  display: flex;
  gap: 40px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}
.mini-stat {
  text-align: center;
}
.mini-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #333;
}
.mini-label {
  font-size: 13px;
  color: #999;
}

/* 编辑卡片 */
.edit-card {
  margin-bottom: 20px;
  border-radius: 16px;
}
.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 危险区域 */
.danger-card {
  margin-bottom: 20px;
  border-radius: 16px;
  border: 1px solid #ffccc7;
}
.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.danger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.danger-item:last-child {
  border-bottom: none;
}
.danger-item strong {
  font-size: 14px;
  color: #333;
}
.danger-item p {
  font-size: 12px;
  color: #999;
  margin: 2px 0 0;
}

@media (max-width: 768px) {
  .profile-page { padding: 16px; }
  .user-header { flex-direction: column; text-align: center; }
  .user-level-bar { justify-content: center; }
  .user-stats-row { justify-content: center; }
  .danger-item { flex-direction: column; gap: 12px; text-align: center; }
}
</style>
