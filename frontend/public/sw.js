// dedanci.com - Service Worker v2
// 增强版离线缓存 + 后台同步

const CACHE_NAME = 'dedanci-v2'
const STATIC_ASSETS = [
  '/',
  '/study',
  '/vocabularies',
  '/stats',
  '/error-book',
  '/login',
  '/favicon.svg',
  '/manifest.json',
  '/sims.js'
]

// API 缓存策略：网络优先，离线回落
const API_CACHE_NAME = 'dedanci-api-v2'
const CACHEABLE_APIS = [
  '/api/study/today',
  '/api/study/stats',
  '/api/vocabularies',
  '/api/pronunciation/',
  '/api/ai/analyze/',
  '/api/auth/me'
]

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW: 部分资源预缓存失败:', err)
      })
    })
  )
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // POST/PUT/DELETE 请求不缓存
  if (request.method !== 'GET') return

  // API 请求：网络优先，离线回落到缓存
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api))

    if (isCacheable) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(API_CACHE_NAME).then((cache) => {
                cache.put(request, clone)
              })
            }
            return response
          })
          .catch(() => {
            return caches.match(request).then((cached) => {
              return cached || new Response(JSON.stringify({ success: false, error: '离线状态' }), {
                headers: { 'Content-Type': 'application/json' }
              })
            })
          })
      )
    }
    return
  }

  // 静态资源：缓存优先，网络回落
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone)
          })
        }
        return response
      })
    }).catch(() => {
      // 离线且无缓存时，返回首页（SPA fallback）
      if (request.mode === 'navigate') {
        return caches.match('/')
      }
      return new Response('Offline', { status: 503 })
    })
  )
})

// 后台同步：离线时的复习记录队列
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncOfflineReviews())
  }
})

async function syncOfflineReviews() {
  // TODO: 从 IndexedDB 读取离线复习记录并同步
  console.log('SW: 后台同步复习记录')
}
