import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/study'
  },
  {
    path: '/study',
    name: 'Study',
    component: () => import('@/views/Study.vue'),
    meta: { title: '背单词' }
  },
  {
    path: '/vocabularies',
    name: 'Vocabularies',
    component: () => import('@/views/Vocabularies.vue'),
    meta: { title: '词库' }
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/views/Stats.vue'),
    meta: { title: '统计' }
  },
  {
    path: '/error-book',
    name: 'ErrorBook',
    component: () => import('@/views/ErrorBook.vue'),
    meta: { title: '错题本' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} - 得单词者得天下`
  next()
})

export default router
