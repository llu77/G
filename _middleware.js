import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'
import { secureHeaders } from 'hono/secure-headers'
import { jwt } from 'hono/jwt'

const app = new Hono()

// Cloudflare Workers 2025 - Smart Placement v2
app.use('*', async (c, next) => {
  // Smart Placement مع تحسينات 2025
  c.env.PLACEMENT = {
    mode: "smart",
    region: "middle-east"
  }
  
  // Edge Cache API 2025
  const cache = caches.default
  const cacheKey = new Request(c.req.url)
  
  if (c.req.method === 'GET') {
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      return cachedResponse
    }
  }
  
  await next()
  
  // Cache the response
  if (c.req.method === 'GET' && c.res.status === 200) {
    c.executionCtx.waitUntil(cache.put(cacheKey, c.res.clone()))
  }
})

// Global middleware
app.use('*', cors({
  origin: ['https://lmm-finance.com', 'https://*.lmm-finance.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
}))

app.use('*', logger())
app.use('*', compress())

// Security Headers 2025
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https:"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    childSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    requireTrustedTypesFor: ["'script'"]
  },
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: []
  }
}))

// JWT Authentication middleware
app.use('/api/*', jwt({
  secret: c => c.env.JWT_SECRET || 'your-secret-key',
  alg: 'HS256'
}))

// Rate limiting middleware - Updated 2025
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP')
  const key = `rate_limit:${ip}:${Date.now()}`
  
  // Rate limiting مع sliding window
  const requests = await c.env.CACHE_KV.get(key)
  const count = requests ? parseInt(requests) : 0
  
  if (count > 100) {
    return c.json({ 
      error: 'Too many requests',
      retryAfter: 3600
    }, 429)
  }
  
  await c.env.CACHE_KV.put(key, (count + 1).toString(), { expirationTtl: 3600 })
  
  await next()
})

// Error handling middleware - Enhanced 2025
app.onError((err, c) => {
  console.error(`Error: ${err.message}`, {
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString(),
    stack: err.stack
  })
  
  // إرسال إلى خدمة تتبع الأخطاء (اختياري)
  if (c.env.ERROR_REPORTING_URL) {
    c.executionCtx.waitUntil(
      fetch(c.env.ERROR_REPORTING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: err.message,
          url: c.req.url,
          method: c.req.method,
          timestamp: new Date().toISOString()
        })
      })
    )
  }
  
  return c.json({ error: 'Internal Server Error' }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

export default app