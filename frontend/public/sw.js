// dedanci.com - Service Worker
// 实现离线缓存和 PWA 安装支持

const CACHE_NAME = 'dedanci-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/study',
  '/vocabularies',
  '/stats',
  '/error-book'
]

// 安装：预缓存核心页面
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
})

// 请求拦截：网络优先，离线回落
self.addEventListener('fetch', (event) => {
  // API 请求不缓存
  if (event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})
