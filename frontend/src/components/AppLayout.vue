<template>
  <div class="layout-container">
    <!-- 顶部导航 -->
    <header class="header">
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
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.logo-icon {
  font-size: 24px;
}

.logo h1 {
  font-size: 20px;
  color: #333;
  margin: 0;
  font-weight: 700;
}

.logo .domain {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
  font-weight: normal;
}

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

.nav-item:hover {
  color: #1890ff;
  background: #e6f7ff;
}

.nav-item.active {
  color: #1890ff;
  background: #e6f7ff;
  font-weight: 600;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

@media (max-width: 768px) {
  .header {
    padding: 0 16px;
    height: 56px;
  }

  .logo h1 {
    display: none;
  }

  .nav-item {
    padding: 6px 10px;
    font-size: 12px;
  }

  .nav-item .el-icon {
    display: none;
  }
}
</style>
