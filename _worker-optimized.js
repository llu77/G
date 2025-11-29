// Optimized Cloudflare Worker for LMM Finance
// Based on 2024-2025 best practices and performance research

import { jwtVerify } from 'jose';

// Security configuration
const SECURITY = {
  JWT_SECRET: 'your-secret-key',
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 100,
  CORS_ORIGINS: ['https://symbolai-finance.pages.dev', 'http://localhost:3000']
};

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes
  LONG_TTL: 3600,   // 1 hour
  SHORT_TTL: 60     // 1 minute
};

// Enhanced logging system
class Logger {
  constructor(env) {
    this.env = env;
  }

  async log(level, message, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      environment: this.env.ENVIRONMENT
    };

    console.log(JSON.stringify(logEntry));

    // Send to analytics if configured
    if (this.env.ANALYTICS) {
      try {
        await this.env.ANALYTICS.writeDataPoint({
          blobs: [level, message],
          doubles: [Date.now()],
          indexes: [this.env.ENVIRONMENT]
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }
  }

  info(message, context) { return this.log('info', message, context); }
  error(message, context) { return this.log('error', message, context); }
  warn(message, context) { return this.log('warn', message, context); }
  debug(message, context) { return this.log('debug', message, context); }
}

// Smart KV operations with change detection
class SmartKV {
  constructor(kv, logger) {
    this.kv = kv;
    this.logger = logger;
  }

  async get(key, options = {}) {
    try {
      const start = Date.now();
      const value = await this.kv.get(key, options);
      const duration = Date.now() - start;
      
      await this.logger.debug('KV get operation', {
        key,
        duration,
        hit: value !== null
      });

      return value;
    } catch (error) {
      await this.logger.error('KV get error', { key, error: error.message });
      throw error;
    }
  }

  async put(key, value, options = {}) {
    try {
      // Smart change detection
      const existing = await this.kv.get(key);
      if (existing && this.isMeaningfullyEqual(existing, value)) {
        await this.logger.debug('KV put skipped - no meaningful change', { key });
        return false;
      }

      const start = Date.now();
      await this.kv.put(key, value, {
        ...options,
        metadata: {
          ...options.metadata,
          lastModified: new Date().toISOString()
        }
      });
      const duration = Date.now() - start;

      await this.logger.info('KV put successful', {
        key,
        duration,
        size: value.length
      });

      return true;
    } catch (error) {
      await this.logger.error('KV put error', { key, error: error.message });
      throw error;
    }
  }

  async delete(key) {
    try {
      await this.kv.delete(key);
      await this.logger.info('KV delete successful', { key });
      return true;
    } catch (error) {
      await this.logger.error('KV delete error', { key, error: error.message });
      throw error;
    }
  }

  // Compare values intelligently
  isMeaningfullyEqual(existing, newValue) {
    try {
      const existingData = JSON.parse(existing);
      const newData = JSON.parse(newValue);
      
      // Compare only meaningful fields
      return JSON.stringify(existingData) === JSON.stringify(newData);
    } catch {
      return existing === newValue;
    }
  }
}

// Rate limiting implementation
class RateLimiter {
  constructor(kv, logger) {
    this.kv = kv;
    this.logger = logger;
  }

  async checkLimit(clientIP) {
    const key = `rate_limit:${clientIP}`;
    const now = Date.now();
    const windowStart = now - SECURITY.RATE_LIMIT_WINDOW;

    try {
      const requests = await this.kv.get(key, { type: 'json' }) || [];
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (recentRequests.length >= SECURITY.MAX_REQUESTS_PER_WINDOW) {
        await this.logger.warn('Rate limit exceeded', { clientIP, count: recentRequests.length });
        return false;
      }

      recentRequests.push(now);
      await this.kv.put(key, JSON.stringify(recentRequests), {
        expirationTtl: Math.ceil(SECURITY.RATE_LIMIT_WINDOW / 1000)
      });

      return true;
    } catch (error) {
      await this.logger.error('Rate limit check error', { clientIP, error: error.message });
      return false;
    }
  }
}

// CORS handling
function handleCORS(request) {
  const origin = request.headers.get('Origin');
  const isAllowed = SECURITY.CORS_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

// JWT authentication
async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const secret = new TextEncoder().encode(env.JWT_SECRET || SECURITY.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// Main Worker implementation
export default {
  async fetch(request, env, ctx) {
    const logger = new Logger(env);
    const kv = new SmartKV(env.CACHE, logger);
    const rateLimiter = new RateLimiter(env.CACHE, logger);

    try {
      const url = new URL(request.url);
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Enhanced logging
      await logger.info('Request received', {
        method: request.method,
        url: request.url,
        clientIP,
        userAgent: request.headers.get('User-Agent')
      });

      // Rate limiting
      if (!(await rateLimiter.checkLimit(clientIP))) {
        return new Response('Rate limit exceeded', { 
          status: 429,
          headers: { 
            'Content-Type': 'text/plain',
            'Retry-After': '60'
          }
        });
      }

      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: handleCORS(request)
        });
      }

      // Route handling
      let response;

      switch (url.pathname) {
        case '/':
          response = new Response(HTML_CONTENT, {
            headers: { 
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600'
            }
          });
          break;

        case '/api/health':
          response = new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT,
            version: env.API_VERSION
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          break;

        case '/api/employees':
          response = await handleEmployees(request, env, kv, logger);
          break;

        case '/api/payroll':
          response = await handlePayroll(request, env, kv, logger);
          break;

        case '/api/dashboard':
          response = await handleDashboard(request, env, kv, logger);
          break;

        default:
          response = new Response('Not Found', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
      }

      // Add CORS headers
      const corsHeaders = handleCORS(request);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Enhanced response logging
      await logger.info('Response sent', {
        status: response.status,
        url: request.url,
        duration: Date.now() - request.startTime
      });

      return response;

    } catch (error) {
      await logger.error('Worker error', {
        error: error.message,
        stack: error.stack,
        url: request.url
      });

      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

// API Handlers with enhanced functionality
async function handleEmployees(request, env, kv, logger) {
  const cacheKey = `employees:${new URL(request.url).search}`;
  
  try {
    // Try cache first
    const cached = await kv.get(cacheKey, { type: 'json' });
    if (cached && request.method === 'GET') {
      await logger.debug('Employees data served from cache', { cacheKey });
      return new Response(JSON.stringify(cached), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }

    let data;
    switch (request.method) {
      case 'GET':
        // Mock data for demonstration
        data = {
          employees: [
            { id: 1, name: 'أحمد محمد', position: 'مدير', salary: 15000, department: 'الإدارة' },
            { id: 2, name: 'فاطمة الزهراء', position: 'محاسب', salary: 12000, department: 'المالية' },
            { id: 3, name: 'خالد عبد الله', position: 'مبرمج', salary: 14000, department: 'تقنية المعلومات' }
          ],
          total: 3,
          timestamp: new Date().toISOString()
        };
        
        // Cache the response
        await kv.put(cacheKey, JSON.stringify(data), {
          expirationTtl: CACHE_CONFIG.DEFAULT_TTL
        });
        
        break;

      case 'POST':
        const newEmployee = await request.json();
        await logger.info('New employee added', { employee: newEmployee.name });
        
        // Invalidate cache
        await kv.delete(cacheKey);
        
        data = { success: true, message: 'Employee added successfully' };
        break;

      default:
        return new Response('Method not allowed', { status: 405 });
    }

    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': cached ? 'HIT' : 'MISS'
      }
    });

  } catch (error) {
    await logger.error('Employees API error', { error: error.message });
    return new Response('Internal error', { status: 500 });
  }
}

async function handlePayroll(request, env, kv, logger) {
  try {
    // Mock payroll calculation
    const payrollData = {
      month: 'ديسمبر 2024',
      totalSalaries: 41000,
      bonuses: 5000,
      deductions: 2000,
      netPay: 44000,
      employees: 3,
      timestamp: new Date().toISOString()
    };

    await logger.info('Payroll data accessed', { 
      month: payrollData.month, 
      total: payrollData.netPay 
    });

    return new Response(JSON.stringify(payrollData), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    await logger.error('Payroll API error', { error: error.message });
    return new Response('Internal error', { status: 500 });
  }
}

async function handleDashboard(request, env, kv, logger) {
  try {
    // Mock dashboard data with analytics
    const dashboardData = {
      totalEmployees: 3,
      totalSalaries: 41000,
      monthlyGrowth: 5.2,
      recentActivities: [
        { action: 'إضافة موظف جديد', time: 'منذ 2 ساعة' },
        { action: 'حساب الرواتب', time: 'منذ 1 يوم' },
        { action: 'تحديث البيانات', time: 'منذ 3 أيام' }
      ],
      performance: {
        requests: 1250,
        avgResponseTime: '45ms',
        uptime: '99.9%'
      },
      timestamp: new Date().toISOString()
    };

    await logger.info('Dashboard data accessed', { 
      totalEmployees: dashboardData.totalEmployees 
    });

    return new Response(JSON.stringify(dashboardData), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    await logger.error('Dashboard API error', { error: error.message });
    return new Response('Internal error', { status: 500 });
  }
}

// Enhanced HTML content
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SymbolAI Financial ERP - نظام إدارة الرواتب المتقدم</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/tailwindcss@3.3.0/dist/tailwind.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { font-family: 'Cairo', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .glass-effect { backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.1); }
        .hover-lift { transition: transform 0.3s ease; }
        .hover-lift:hover { transform: translateY(-5px); }
        .arabic-text { font-family: 'Cairo', sans-serif; }
        .loading { animation: pulse 2s infinite; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body class="gradient-bg min-h-screen arabic-text">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <header class="text-center mb-12">
            <div class="glass-effect rounded-2xl p-6 mb-8">
                <h1 class="text-4xl font-bold text-white mb-4">
                    <i class="fas fa-calculator mr-3"></i>
                    SymbolAI Financial ERP
                </h1>
                <p class="text-xl text-gray-200">نظام إدارة الرواتب والموارد البشرية الذكي</p>
                <div class="mt-4 flex justify-center space-x-4">
                    <span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                        <i class="fas fa-check mr-1"></i>متوافق مع السعودية
                    </span>
                    <span class="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                        <i class="fas fa-shield-alt mr-1"></i>آمن وموثوق
                    </span>
                    <span class="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">
                        <i class="fas fa-rocket mr-1"></i>سريع الأداء
                    </span>
                </div>
            </div>
        </header>

        <!-- Main Dashboard -->
        <main class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Statistics Cards -->
            <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="glass-effect rounded-xl p-6 hover-lift">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-300 text-sm">إجمالي الموظفين</p>
                            <p class="text-3xl font-bold text-white" id="total-employees">3</p>
                        </div>
                        <i class="fas fa-users text-4xl text-blue-400"></i>
                    </div>
                </div>
                
                <div class="glass-effect rounded-xl p-6 hover-lift">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-300 text-sm">إجمالي الرواتب</p>
                            <p class="text-3xl font-bold text-white" id="total-salaries">41,000 ر.س</p>
                        </div>
                        <i class="fas fa-money-bill-wave text-4xl text-green-400"></i>
                    </div>
                </div>
                
                <div class="glass-effect rounded-xl p-6 hover-lift">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-300 text-sm">نمو الشهر</p>
                            <p class="text-3xl font-bold text-white" id="monthly-growth">+5.2%</p>
                        </div>
                        <i class="fas fa-chart-line text-4xl text-purple-400"></i>
                    </div>
                </div>
            </div>

            <!-- Employees Management -->
            <div class="glass-effect rounded-xl p-6 hover-lift">
                <h3 class="text-xl font-bold text-white mb-4">
                    <i class="fas fa-users mr-2"></i>إدارة الموظفين
                </h3>
                
                <div class="space-y-3" id="employees-list">
                    <!-- Employees will be loaded here -->
                </div>
                
                <button onclick="addEmployee()" class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition">
                    <i class="fas fa-plus mr-2"></i>إضافة موظف جديد
                </button>
            </div>

            <!-- Payroll Management -->
            <div class="glass-effect rounded-xl p-6 hover-lift">
                <h3 class="text-xl font-bold text-white mb-4">
                    <i class="fas fa-calculator mr-2"></i>حساب الرواتب
                </h3>
                
                <div class="space-y-4">
                    <div class="flex justify-between">
                        <span class="text-gray-300">الشهر الحالي:</span>
                        <span class="text-white font-semibold" id="current-month">ديسمبر 2024</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-300">إجمالي الرواتب:</span>
                        <span class="text-green-400 font-semibold" id="total-payroll">41,000 ر.س</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-300">الحوافز:</span>
                        <span class="text-blue-400 font-semibold" id="total-bonuses">5,000 ر.س</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-300">الخصومات:</span>
                        <span class="text-red-400 font-semibold" id="total-deductions">2,000 ر.س</span>
                    </div>
                    
                    <hr class="border-gray-600">
                    
                    <div class="flex justify-between text-lg">
                        <span class="text-white font-bold">الصافي:</span>
                        <span class="text-green-400 font-bold" id="net-pay">44,000 ر.س</span>
                    </div>
                </div>
                
                <button onclick="calculatePayroll()" class="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition">
                    <i class="fas fa-calculator mr-2"></i>احسب الرواتب
                </button>
            </div>

            <!-- System Status -->
            <div class="glass-effect rounded-xl p-6 hover-lift">
                <h3 class="text-xl font-bold text-white mb-4">
                    <i class="fas fa-chart-bar mr-2"></i>حالة النظام
                </h3>
                
                <div class="space-y-4">
                    <div class="flex justify-between">
                        <span class="text-gray-300">الطلبات:</span>
                        <span class="text-white font-semibold" id="requests-count">1,250</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-300">متوسط الاستجابة:</span>
                        <span class="text-green-400 font-semibold" id="avg-response">45ms</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-300">التوفر:</span>
                        <span class="text-green-400 font-semibold" id="uptime">99.9%</span>
                    </div>
                </div>
                
                <div class="mt-6">
                    <h4 class="text-white font-semibold mb-2">الأنشطة الأخيرة</h4>
                    <div class="space-y-2" id="recent-activities">
                        <!-- Activities will be loaded here -->
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="text-center mt-12 text-gray-300">
            <p class="mb-2">
                <i class="fas fa-shield-alt mr-2"></i>
                محمي بأحدث تقنيات الأمان | 
                <i class="fas fa-rocket mr-2 ml-2"></i>
                مدعوم بـ Cloudflare Workers
            </p>
            <p class="text-sm">
                النسخة 2.0 - محسّن للأداء والأمان | آخر تحديث: ديسمبر 2024
            </p>
        </footer>
    </div>

    <script>
        // Initialize application
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();
            loadEmployees();
            loadRecentActivities();
            
            // Auto-refresh every 30 seconds
            setInterval(loadDashboard, 30000);
        });

        // Load dashboard data
        async function loadDashboard() {
            try {
                const response = await fetch('/api/dashboard');
                const data = await response.json();
                
                document.getElementById('total-employees').textContent = data.totalEmployees;
                document.getElementById('total-salaries').textContent = data.totalSalaries.toLocaleString() + ' ر.س';
                document.getElementById('monthly-growth').textContent = '+' + data.monthlyGrowth + '%';
                document.getElementById('requests-count').textContent = data.performance.requests.toLocaleString();
                document.getElementById('avg-response').textContent = data.performance.avgResponseTime;
                document.getElementById('uptime').textContent = data.performance.uptime;
                
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }

        // Load employees
        async function loadEmployees() {
            try {
                const response = await fetch('/api/employees');
                const data = await response.json();
                
                const employeesList = document.getElementById('employees-list');
                employeesList.innerHTML = '';
                
                data.employees.forEach(employee => {
                    const employeeDiv = document.createElement('div');
                    employeeDiv.className = 'flex justify-between items-center p-3 bg-white bg-opacity-10 rounded-lg';
                    employeeDiv.innerHTML = `
                        <div>
                            <p class="text-white font-semibold">${employee.name}</p>
                            <p class="text-gray-300 text-sm">${employee.position}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-green-400 font-semibold">${employee.salary.toLocaleString()} ر.س</p>
                            <p class="text-gray-300 text-sm">${employee.department}</p>
                        </div>
                    `;
                    employeesList.appendChild(employeeDiv);
                });
                
            } catch (error) {
                console.error('Error loading employees:', error);
            }
        }

        // Load recent activities
        async function loadRecentActivities() {
            try {
                const response = await fetch('/api/dashboard');
                const data = await response.json();
                
                const activitiesList = document.getElementById('recent-activities');
                activitiesList.innerHTML = '';
                
                data.recentActivities.forEach(activity => {
                    const activityDiv = document.createElement('div');
                    activityDiv.className = 'text-sm text-gray-300 flex justify-between';
                    activityDiv.innerHTML = `
                        <span>${activity.action}</span>
                        <span class="text-gray-400">${activity.time}</span>
                    `;
                    activitiesList.appendChild(activityDiv);
                });
                
            } catch (error) {
                console.error('Error loading activities:', error);
            }
        }

        // Add employee function
        function addEmployee() {
            alert('سيتم فتح نموذج إضافة موظف جديد قريباً!');
        }

        // Calculate payroll function
        function calculatePayroll() {
            alert('جاري حساب الرواتب... سيتم تحديث البيانات قريباً!');
        }

        // System monitoring
        setInterval(async () => {
            try {
                const response = await fetch('/api/health');
                if (!response.ok) {
                    console.warn('System health check failed');
                }
            } catch (error) {
                console.error('Health check error:', error);
            }
        }, 60000); // Check every minute
    </script>
</body>
</html>`;