/**
 * 用户认证 Store
 * 管理 token、用户信息、登录状态
 * 含全局 axios 拦截器：自动附加 token、401 自动跳转登录
 */

import { ref, computed } from 'vue'
import axios from 'axios'

const token = ref(localStorage.getItem('token') || '')
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

// ===== 全局 axios 拦截器 =====

// 请求拦截器：自动附加 Authorization header
axios.interceptors.request.use(config => {
  if (token.value) {
    config.headers['Authorization'] = `Bearer ${token.value}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// 响应拦截器：处理 401 自动跳转登录
axios.interceptors.response.use(response => {
  return response
}, error => {
  if (error.response?.status === 401) {
    // Token 过期或无效，清除登录状态
    clearAuth()
    // 延迟跳转，避免在初始化时就跳转
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      // 动态导入 router 避免循环依赖
      import('../router').then(({ default: router }) => {
        router.push({ path: '/login', query: { redirect: window.location.pathname } })
      })
    }
  }
  return Promise.reject(error)
})

function clearAuth() {
  token.value = ''
  user.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  delete axios.defaults.headers.common['Authorization']
}

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value)
  const isGuest = computed(() => user.value?.is_guest ?? true)
  const userName = computed(() => user.value?.username || '游客')
  const userLevel = computed(() => user.value?.level || 1)
  const userExp = computed(() => user.value?.exp || 0)
  const streakDays = computed(() => user.value?.streak_days || 0)

  function setAuth(newToken, newUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  function logout() {
    clearAuth()
  }

  async function fetchUser() {
    try {
      const res = await axios.get('/api/auth/me')
      if (res.data.success) {
        user.value = res.data.data
        localStorage.setItem('user', JSON.stringify(res.data.data))
      }
    } catch (e) {
      console.warn('获取用户信息失败:', e)
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    isGuest,
    userName,
    userLevel,
    userExp,
    streakDays,
    setAuth,
    logout,
    fetchUser
  }
}
