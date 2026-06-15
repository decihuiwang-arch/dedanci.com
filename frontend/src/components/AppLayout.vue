<template>
  <div class="layout-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-inner">
        <div class="logo">
          <router-link to="/" class="logo-link">
            <span class="logo-icon">📖</span>
            <h1>得单词者得天下</h1>
            <span class="domain">dedanci.com</span>
          </router-link>
        </div>
        <nav class="nav">
          <router-link to="/study" class="nav-item" active-class="active">
            <el-icon><Reading /></el-icon> 背单词
          </router-link>
          <router-link to="/vocabularies" class="nav-item" active-class="active">
            <el-icon><Collection /></el-icon> 词库
          </router-link>
          <router-link to="/stats" class="nav-item" active-class="active">
            <el-icon><DataAnalysis /></el-icon> 统计
          </router-link>
          <router-link to="/error-book" class="nav-item" active-class="active">
            <el-icon><WarningFilled /></el-icon> 错题本
          </router-link>
          <router-link to="/achievements" class="nav-item" active-class="active">
            <el-icon><Trophy /></el-icon> 成就
          </router-link>
          <router-link to="/leaderboard" class="nav-item" active-class="active">
            <el-icon><Histogram /></el-icon> 排行
          </router-link>
        </nav>
        <div class="user-area">
          <div class="user-info" @click="showUserMenu = !showUserMenu">
            <div class="user-avatar">{{ userName.charAt(0) }}</div>
            <div class="user-detail">
              <span class="user-name">{{ userName }}</span>
              <span class="user-level">Lv.{{ userLevel }}</span>
            </div>
            <el-icon :size="12"><ArrowDown /></el-icon>
          </div>
          <div v-if="showUserMenu" class="user-menu" @click.stop>
            <div class="menu-item" @click="goProfile">
              <el-icon><User /></el-icon> 个人信息
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item logout" @click="handleLogout">
              <el-icon><SwitchButton /></el-icon> 退出登录
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '../stores/auth'

const router = useRouter()
const { userName, userLevel, isLoggedIn, logout } = useAuth()
const showUserMenu = ref(false)

const handleLogout = () => {
  logout()
  showUserMenu.value = false
  ElMessage.success('已退出登录')
  router.push('/login')
}

const goProfile = () => {
  showUserMenu.value = false
  router.push('/profile')
}

const closeMenu = (e) => {
  if (showUserMenu.value) showUserMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  height: 64px;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}
.logo-icon { font-size: 24px; }
.logo h1 { font-size: 20px; color: #333; margin: 0; font-weight: 700; }
.logo .domain { font-size: 12px; color: #999; margin-left: 4px; font-weight: normal; }

.nav {
  display: flex;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  text-decoration: none;
  font-size: 14px;
  padding: 8px 18px;
  border-radius: 8px;
  transition: all 0.25s;
  font-weight: 500;
}
.nav-item:hover { color: #1890ff; background: #e6f7ff; }
.nav-item.active { color: #1890ff; background: #e6f7ff; font-weight: 600; }

/* 用户区域 */
.user-area {
  position: relative;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}
.user-info:hover { background: #f5f5f5; }
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}
.user-detail {
  display: flex;
  flex-direction: column;
}
.user-name { font-size: 13px; color: #333; font-weight: 500; line-height: 1.2; }
.user-level { font-size: 11px; color: #999; line-height: 1.2; }

/* 下拉菜单 */
.user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #eee;
  min-width: 160px;
  overflow: hidden;
  z-index: 200;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}
.menu-item:hover { background: #f5f5f5; }
.menu-item.logout { color: #ff4d4f; }
.menu-item.logout:hover { background: #fff2f0; }
.menu-divider { height: 1px; background: #f0f0f0; margin: 4px 0; }

.main-content {
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .header-inner { padding: 0 12px; }
  .logo h1 { display: none; }
  .nav-item { padding: 6px 10px; font-size: 12px; }
  .nav-item .el-icon { display: none; }
  .user-detail { display: none; }
}
</style>
