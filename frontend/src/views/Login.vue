<template>
  <div class="auth-page">
    <div class="auth-bg">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
    </div>
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-logo">📖</span>
        <h2>{{ isLogin ? '欢迎回来' : '创建账号' }}</h2>
        <p>{{ isLogin ? '登录继续你的学习之旅' : '注册开启高效背单词' }}</p>
      </div>

      <div class="auth-form">
        <!-- 邮箱 -->
        <div class="form-group">
          <label>邮箱</label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            @keyup.enter="handleSubmit"
          />
        </div>

        <!-- 用户名（仅注册） -->
        <div v-if="!isLogin" class="form-group">
          <label>用户名 <span class="optional">（选填）</span></label>
          <input v-model="username" type="text" placeholder="起个名字" />
        </div>

        <!-- 密码 -->
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            :placeholder="isLogin ? '输入密码' : '至少6位密码'"
            @keyup.enter="handleSubmit"
          />
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="auth-error">{{ error }}</div>

        <!-- 提交 -->
        <button class="btn-submit" :disabled="loading" @click="handleSubmit">
          <span v-if="loading" class="spinner"></span>
          <span v-else>{{ isLogin ? '登 录' : '注 册' }}</span>
        </button>

        <!-- 切换模式 -->
        <div class="auth-switch">
          <span>{{ isLogin ? '没有账号？' : '已有账号？' }}</span>
          <a href="#" @click.prevent="isLogin = !isLogin; error = ''">
            {{ isLogin ? '立即注册' : '去登录' }}
          </a>
        </div>

        <!-- 分隔线 -->
        <div class="auth-divider"><span>或</span></div>

        <!-- 游客模式 -->
        <button class="btn-guest" @click="guestLogin" :disabled="loading">
          🎮 游客模式 - 免登录体验
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useAuth } from '../stores/auth'

const router = useRouter()
const { setAuth } = useAuth()
const isLogin = ref(true)
const email = ref('')
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  error.value = ''

  if (!email.value) {
    error.value = '请输入邮箱'
    return
  }
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  if (!isLogin.value && password.value.length < 6) {
    error.value = '密码至少6位'
    return
  }

  loading.value = true
  try {
    const url = isLogin.value ? '/api/auth/login' : '/api/auth/register'
    const payload = isLogin.value
      ? { email: email.value, password: password.value }
      : { email: email.value, username: username.value, password: password.value }

    const res = await axios.post(url, payload)

    if (res.data.success) {
      // 使用 auth store 统一管理
      setAuth(res.data.data.token, res.data.data.user)

      ElMessage.success(isLogin.value ? '登录成功！' : '注册成功！')
      const redirect = router.currentRoute.value.query.redirect || '/study'
      router.push(redirect)
    } else {
      error.value = res.data.error || '操作失败'
    }
  } catch (e) {
    error.value = e.response?.data?.error || '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

const guestLogin = async () => {
  loading.value = true
  try {
    const res = await axios.post('/api/auth/guest')
    if (res.data.success) {
      setAuth(res.data.data.token, res.data.data.user)
      ElMessage.success('游客模式已启动')
      router.push('/study')
    }
  } catch (e) {
    error.value = '游客模式启动失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a1a;
  position: relative;
  overflow: hidden;
}
.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.25;
}
.orb-1 { width: 500px; height: 500px; background: #667eea; top: -200px; right: -100px; }
.orb-2 { width: 400px; height: 400px; background: #764ba2; bottom: -150px; left: -100px; }

.auth-card {
  position: relative;
  z-index: 1;
  width: 400px;
  max-width: 90vw;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px 32px;
  backdrop-filter: blur(20px);
}
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}
.auth-logo { font-size: 40px; display: block; margin-bottom: 12px; }
.auth-header h2 { font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 6px; }
.auth-header p { font-size: 14px; color: #888; margin: 0; }

.form-group {
  margin-bottom: 18px;
}
.form-group label {
  display: block;
  font-size: 13px;
  color: #aaa;
  margin-bottom: 6px;
  font-weight: 500;
}
.optional { color: #666; font-weight: 400; }
.form-group input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}
.form-group input::placeholder { color: #555; }
.form-group input:focus { border-color: #667eea; }

.auth-error {
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  color: #ff7875;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.btn-submit {
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-switch {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #888;
}
.auth-switch a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}
.auth-switch a:hover { text-decoration: underline; }

.auth-divider {
  text-align: center;
  margin: 20px 0;
  position: relative;
  color: #555;
  font-size: 13px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 35%;
  height: 1px;
  background: rgba(255,255,255,0.08);
}
.auth-divider::before { left: 0; }
.auth-divider::after { right: 0; }

.btn-guest {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #aaa;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-guest:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}
.btn-guest:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 480px) {
  .auth-card { padding: 28px 20px; }
  .auth-header h2 { font-size: 20px; }
}
</style>
