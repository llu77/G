import { Hono } from 'hono'
import { cors } from 'hono/cors'
import employees from './employees'
import payroll from './payroll'
import reports from './reports'
import settings from './settings'

const app = new Hono()

// CORS for API routes
app.use('/api/*', cors({
  origin: ['https://lmm-finance.com', 'https://*.lmm-finance.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
}))

// API routes
app.route('/api/employees', employees)
app.route('/api/payroll', payroll)
app.route('/api/reports', reports)
app.route('/api/settings', settings)

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    react: '19.0.0',
    vite: '6.0.0',
    wrangler: '4.0.0'
  })
})

// API info endpoint
app.get('/api', (c) => {
  return c.json({
    name: 'LMM Finance ERP v2 API',
    version: '2.0.0',
    description: 'Advanced Financial Resource Management System API - Updated 2025',
    technologies: {
      react: '19.0.0',
      vite: '6.0.0',
      wrangler: '4.0.0',
      cloudflare: '2025'
    },
    endpoints: {
      employees: '/api/employees',
      payroll: '/api/payroll',
      reports: '/api/reports',
      settings: '/api/settings',
      health: '/api/health',
    },
    features: [
      'React 19 with Compiler',
      'React Router v7 Data Router',
      'TanStack Query v6 Suspense',
      'Cloudflare Workers 2025',
      'Smart Placement v2',
      'Edge Cache API',
      'Enhanced Security Headers'
    ]
  })
})

// 404 handler for API
app.notFound((c) => {
  return c.json({ error: 'API endpoint not found' }, 404)
})

export default app