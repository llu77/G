# متطلبات Cloudflare للنشر - دليل شامل

## نظرة عامة

هذا الدليل يوفر مراجعة شاملة لمتطلبات Cloudflare للنشر ويضمن أن مشروع LMM Finance يفي بجميع المتطلبات الفنية والأمنية.

## 1. متطلبات Cloudflare Pages

### ✅ الحدود والقيود

#### حجم الملفات
- **الحد الأقصى لحجم الملف**: 25 ميغابايت لكل ملف
- **الحد الأقصى لحجم الحزمة**: 100 ميغابايت لكل بناء
- **عدد الملفات**: لا يوجد حد محدد
- **أنواع الملفات المدعومة**: HTML, CSS, JS, PNG, JPG, SVG, Fonts, etc.

#### عدد الطلبات
- **الطلبات الشهرية**: 1,000,000 طلب (مجاني)
- **النطاق الشهري**: 100 جيجابايت (مجاني)
- **الطلبات المتوازية**: 100 طلب متوازي (مجاني)

#### البناء والنشر
- **وقت البناء**: 20 دقيقة كحد أقصى
- **ذاكرة البناء**: 16 جيجابايت كحد أقصى
- **عدد الإصدارات**: 100 إصدار حافظ (أقدم الإصدارات تُحذف تلقائياً)

### ✅ التكوين الصحيح

#### ملف `wrangler.toml`
```toml
name = "lmm-finance"
main = "functions/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"
cwd = "."

[env.production]
name = "lmm-finance-prod"

# D1 Database Configuration
[[env.production.d1_databases]]
binding = "DB"
database_name = "lmm-finance-db"
database_id = "your-database-id"

# KV Storage Configuration
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# Environment Variables
[env.production.vars]
PAYROLL_LOCK_ENABLED = "true"
PAYROLL_LOCK_START_DAY = "28"
PAYROLL_LOCK_END_DAY = "31"
BONUS_SILVER_PERCENTAGE = "5"
BONUS_GOLD_PERCENTAGE = "10"
BONUS_DIAMOND_PERCENTAGE = "15"
```

#### ملف `package.json`
```json
{
  "name": "lmm-finance",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler pages deploy dist",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.12.0",
    "zustand": "^4.4.7",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "vitest": "^1.0.4",
    "wrangler": "^3.19.0"
  }
}
```

## 2. متطلبات Cloudflare Functions

### ✅ الحدود والقيود

#### البيئة التنفيذية
- **وقت التنفيذ**: 30 ثانية كحد أقصى (Workers)
- **وقت التنفيذ**: 15 دقيقة كحد أقصى (Pages Functions)
- **ذاكرة RAM**: 128 ميغابايت كحد أقصى
- **CPU Time**: 30 مللي ثانية كحد أقصى

#### الحزمة
- **حجم الحزمة**: 1 ميغابايت كحد أقصى (مضغوط)
- **عدد الملفات**: 1000 ملف كحد أقصى
- **الاعتمادات**: يجب أن تكون مضمنة (bundled)

#### الطلبات
- **حجم الطلب**: 100 ميغابايت كحد أقصى
- **عدد الطلبات**: 100,000 طلب يومياً (مجاني)
- **الطلبات المتوازية**: 10 طلبات متوازية (مجاني)

### ✅ التكوين الصحيح

#### بنية الدالة
```typescript
// functions/api/payroll/generate.ts
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

export async function onRequestPost(context: { 
  request: Request; 
  env: Env;
  params: any;
}) {
  try {
    // التحقق من صحة الطلب
    const { month, year, branchId } = await context.request.json();
    
    if (!month || !year || !branchId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // معالجة العملية
    const result = await processPayroll(context.env.DB, { month, year, branchId });
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## 3. متطلبات Cloudflare D1 Database

### ✅ الحدود والقيود

#### قاعدة البيانات
- **عدد قواعد البيانات**: 10 (مجاني)
- **حجم قاعدة البيانات**: 500 ميغابايت (مجاني)
- **عدد الطلبات**: 100,000 طلب يومياً (مجاني)
- **حجم الاستجابة**: 100 ميغابايت كحد أقصى

#### الاستعلامات
- **وقت التنفيذ**: 30 ثانية كحد أقصى
- **عدد الصفوف**: 100,000 صف (مجاني)
- **حجم الاستعلام**: 100 ميغابايت كحد أقصى

### ✅ التكوين الصحيح

#### إنشاء قاعدة البيانات
```bash
# إنشاء قاعدة البيانات
wrangler d1 create lmm-finance-db

# تطبيق الترحيلات
wrangler d1 migrations apply lmm-finance-db --local

# التحقق من الحالة
wrangler d1 info lmm-finance-db
```

#### ملف الترحيلات `0001_initial_schema.sql`
```sql
-- إنشاء جدول الموظفين
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    position TEXT NOT NULL,
    salary INTEGER NOT NULL,
    role TEXT DEFAULT 'employee',
    branch_id TEXT NOT NULL,
    hire_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    address TEXT,
    emergency_contact TEXT,
    bank_account TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول كشوف الرواتب
CREATE TABLE payroll_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    basic_salary INTEGER NOT NULL,
    bonus INTEGER DEFAULT 0,
    deductions INTEGER DEFAULT 0,
    net_salary INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    generated_at TEXT,
    paid_at TEXT,
    bonus_tier TEXT,
    branch_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء الفهارس
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX idx_payroll_month_year ON payroll_records(month, year);
```

## 4. متطلبات Cloudflare KV Storage

### ✅ الحدود والقيود

#### المساحة
- **عدد مساحات الاسم**: 100 (مجاني)
- **حجم المساحة**: 1 جيجابايت (مجاني)
- **حجم القيمة**: 25 ميغابايت كحد أقصى
- **عدد العمليات**: 100,000 عملية يومياً (مجاني)

#### الأداء
- **وقت الاستجابة**: < 1 مللي ثانية
- **التوزيع الجغرافي**: تلقائي
- **الديمومة**: فورية

### ✅ التكوين الصحيح

#### إنشاء مساحة الاسم
```bash
# إنشاء KV namespace
wrangler kv:namespace create "lmm-finance-cache"

# ربط بالبيئة الإنتاجية
wrangler kv:namespace create "lmm-finance-cache" --env production
```

#### استخدام KV في الدالة
```typescript
// استخدام KV للتخزين المؤقت
export async function onRequestGet(context: { env: Env }) {
  const cacheKey = `payroll:summary:${branchId}`;
  
  // محاولة الحصول من الكاش
  const cached = await context.env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }
  
  // جلب البيانات من قاعدة البيانات
  const data = await fetchFromDatabase(context.env.DB);
  
  // تخزين في الكاش
  await context.env.CACHE.put(cacheKey, JSON.stringify(data), {
    expirationTtl: 3600 // ساعة واحدة
  });
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
  });
}
```

## 5. متطلبات الأمان

### ✅ مصادقة Cloudflare Access

#### التكوين
```javascript
// functions/_middleware.ts
export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}) {
  // التحقق من JWT token
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // التحقق من التوكن
    const user = await verifyToken(token, context.env.JWT_SECRET);
    context.request.user = user;
    
    return await context.next();
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
}
```

### ✅ CORS Configuration

```typescript
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequest(context: { request: Request }) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // معالجة الطلب الرئيسي
  const response = await handleRequest(context.request);
  
  // إضافة CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
```

## 6. متطلبات الأداء

### ✅ الأمثلية

#### Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
```

#### Code Splitting
```typescript
// Lazy loading for routes
import { lazy, Suspense } from 'react';

const PayrollPage = lazy(() => import('./views/PayrollPage'));
const EmployeeManagementPage = lazy(() => import('./views/EmployeeManagementPage'));

// في المكون
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/payroll" element={<PayrollPage />} />
    <Route path="/employees" element={<EmployeeManagementPage />} />
  </Routes>
</Suspense>
```

## 7. متطلبات المراقبة والتسجيل

### ✅ Logging

```typescript
// utils/logger.ts
export class Logger {
  static async log(event: string, data: any, env: Env) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      userId: data.userId || 'anonymous',
      ip: data.ip || 'unknown',
    };
    
    // تسجيل في الكاش للمراجعة السريعة
    await env.CACHE.put(
      `log:${Date.now()}:${Math.random()}`,
      JSON.stringify(logEntry),
      { expirationTtl: 86400 }
    );
    
    // تسجيل في قاعدة البيانات للأرشيف
    await env.DB.prepare(
      'INSERT INTO audit_logs (id, event_type, data, user_id, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      event,
      JSON.stringify(data),
      data.userId || 'anonymous',
      data.ip || 'unknown',
      logEntry.timestamp
    ).run();
  }
}
```

### ✅ Monitoring

```typescript
// utils/monitoring.ts
export class Metrics {
  static async recordRequest(context: { 
    request: Request; 
    env: Env;
    startTime: number;
  }) {
    const duration = Date.now() - context.startTime;
    const url = new URL(context.request.url);
    
    const metrics = {
      timestamp: Date.now(),
      endpoint: url.pathname,
      method: context.request.method,
      duration,
      status: 200, // سيتم تحديثه لاحقاً
    };
    
    // تخزين المقاييس
    await context.env.CACHE.put(
      `metrics:${Date.now()}:${Math.random()}`,
      JSON.stringify(metrics),
      { expirationTtl: 3600 }
    );
  }
}
```

## 8. متطلبات النسخ الاحتياطي والاسترداد

### ✅ Backup Strategy

```bash
#!/bin/bash
# backup.sh

# نسخ احتياطي من قاعدة البيانات
wrangler d1 export lmm-finance-db --output=backup.sql

# نسخ احتياطي من KV
wrangler kv:key get --namespace-id=your-kv-id --key-pattern="*" > kv-backup.json

# رفع النسخة الاحتياطية إلى Cloud Storage
aws s3 cp backup.sql s3://your-backup-bucket/lmm-finance/$(date +%Y%m%d).sql
aws s3 cp kv-backup.json s3://your-backup-bucket/lmm-finance/$(date +%Y%m%d).json
```

## 9. متطلبات الامتثال والخصوصية

### ✅ GDPR Compliance

```typescript
// utils/gdpr.ts
export class GDPR {
  static async handleDataRequest(userId: string, env: Env) {
    // جمع جميع بيانات المستخدم
    const userData = await env.DB.prepare(
      'SELECT * FROM employees WHERE id = ?'
    ).bind(userId).all();
    
    const payrollData = await env.DB.prepare(
      'SELECT * FROM payroll_records WHERE employee_id = ?'
    ).bind(userId).all();
    
    return {
      personal: userData.results,
      payroll: payrollData.results,
      generatedAt: new Date().toISOString(),
    };
  }
  
  static async handleDataDeletion(userId: string, env: Env) {
    // حذف البيانات الشخصية (التحفظ على السجلات القانونية)
    await env.DB.prepare(
      'UPDATE employees SET name = ?, email = ?, phone = ? WHERE id = ?'
    ).bind(
      '[DELETED]',
      '[DELETED]',
      '[DELETED]',
      userId
    ).run();
    
    // تسجيل عملية الحذف
    await env.DB.prepare(
      'INSERT INTO deletion_logs (user_id, deleted_at, reason) VALUES (?, ?, ?)'
    ).bind(userId, new Date().toISOString(), 'GDPR Request').run();
  }
}
```

## 10. قائمة التحقق النهائية

### ✅ قبل النشر

- [ ] جميع المتغيرات البيئية مضبوطة
- [ ] قاعدة البيانات تم إنشاؤها والترحيلات مطبقة
- [ ] KV namespaces تم إنشاؤها
- [ ] الأذونات والأدوار مضبوطة
- [ ] SSL/TLS مفعّل
- [ ] Custom domains مضبوطة
- [ ] Email services مضبوطة
- [ ] Monitoring مفعّل
- [ ] Backup strategy مفعلة
- [ ] Documentation مكتملة

### ✅ بعد النشر

- [ ] اختبار جميع الميزات
- [ ] التحقق من الأداء
- [ ] التحقق من الأمان
- [ ] مراجعة السجلات
- [ ] اختبار النسخ الاحتياطي والاسترداد
- [ ] تدريب المستخدمين
- [ ] إعداد الدعم الفني

---

## 📋 ملاحظات مهمة

1. **النسخ الاحتياطية**: تأكد من إعداد نسخ احتياطية منتظمة
2. **المراقبة**: راقب الأداء والأخطاء باستمرار
3. **التحديثات**: حدث الاعتمادات بانتظام
4. **الأمان**: راقب محاولات الوصول غير المصرح بها
5. **الامتثال**: التزم بقوانين الخصوصية المحلية

هذا الدليل يضمن أن مشروع LMM Finance يفي بجميع متطلبات Cloudflare ويجهزه للنشر الإنتاجي الناجح.