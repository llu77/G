# دليل نشر نظام إدارة الرواتب - LMM Finance

## 🚀 نظرة عامة

هذا الدليل يوفر تعليمات مفصلة لنشر نظام إدارة الرواتب المتقدم على Cloudflare باستخدام wrangler.

## 📋 المتطلبات الأساسية

### 1. الحسابات المطلوبة
- ✅ حساب Cloudflare نشط
- ✅ حساب GitHub (لاستنساخ المشروع)
- ✅ Node.js 18+ مثبت على الجهاز
- ✅ npm أو yarn

### 2. الأدوات المطلوبة
- ✅ Terminal/Command Prompt
- ✅ Git
- ✅ Text Editor (VS Code recommended)
- ✅ wrangler CLI

## 🔧 الإعداد الأولي

### 1. تثبيت الأدوات

```bash
# تثبيت Node.js (إذا لم يكن مثبتاً)
# قم بتحميله من: https://nodejs.org/

# تثبيت wrangler CLI
npm install -g wrangler

# التحقق من التثبيت
wrangler --version
```

### 2. إعداد Cloudflare

#### الخيار 1: API Token (مستحسن)
```bash
# أنشئ API token من: https://dash.cloudflare.com/profile/api-tokens
# الصلاحيات المطلوبة:
# - Cloudflare Workers: Edit
# - Account: Read
# - User: Read
# - Zone: Read

export CLOUDFLARE_API_TOKEN=your_api_token_here
```

#### الخيار 2: Global API Key
```bash
# أنشئ Global API Key من: https://dash.cloudflare.com/profile/api-tokens

export CLOUDFLARE_API_KEY=your_api_key_here
export CLOUDFLARE_EMAIL=your_email@example.com
```

### 3. المصادقة

```bash
# التحقق من المصادقة
wrangler whoami

# إذا لم تكن مصدقاً، قم بتسجيل الدخول
wrangler login
```

## 📁 إعداد المشروع

### 1. استنساخ المشروع

```bash
# استنساخ من المستودع
git clone https://github.com/yourusername/lmm-finance.git
cd lmm-finance

# أو إذا كان لديك الملفات محلياً
cd /path/to/lmm-finance
```

### 2. تثبيت التبعيات

```bash
# تثبيت الحزم المطلوبة
npm install

# أو باستخدام yarn
yarn install
```

### 3. تكوين البيئة

```bash
# نسخ ملف التكوين
cp .env.example .env

# تعديل ملف .env مع بياناتك
nano .env
```

#### متغيرات البيئة المطلوبة:
```env
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token

# Database Configuration
DATABASE_URL=your_database_url
DATABASE_NAME=lmm-finance-db

# Security Configuration
JWT_SECRET=your_jwt_secret_min_32_characters
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900

# Email Configuration
EMAIL_SERVICE_ENABLED=true
EMAIL_SERVICE_API_KEY=your_email_api_key
```

## 🏗️ بناء المشروع

### 1. بناء المشروع

```bash
# بناء المشروع للإنتاج
npm run build

# أو باستخدام yarn
yarn build
```

### 2. اختبار المشروع

```bash
# تشغيل الاختبارات
npm test

# أو باستخدام yarn
yarn test

# اختبار بنجاح
npm run test:unit
npm run test:integration
```

### 3. معاينة المشروع

```bash
# تشغيل خادم المعاينة
npm run preview

# أو باستخدام yarn
yarn preview
```

## 🚀 النشر

### الخيار 1: استخدام سكربت النشر التلقائي

```bash
# نشر كامل باستخدام السكربت
./deploy-with-auth.sh

# أو مع توكن API
CLOUDFLARE_API_TOKEN=your_token_here ./deploy-with-auth.sh
```

### الخيار 2: النشر اليدوي خطوة بخطوة

#### 1. نشر Cloudflare Pages

```bash
# نشر إلى Cloudflare Pages
wrangler pages deploy dist --project-name=lmm-finance
```

#### 2. نشر Cloudflare Functions

```bash
# نشر وظائف الرواتب
wrangler deploy functions/api/payroll/generate.ts --name=payroll-generate
wrangler deploy functions/api/payroll/process-payment.ts --name=process-payment

# نشر وظائف الحوافز
wrangler deploy functions/api/bonus/calculate.ts --name=bonus-calculate

# نشر وظائف الموظفين
wrangler deploy functions/api/employees/list.ts --name=employees-list
wrangler deploy functions/api/employees/create.ts --name=employees-create
wrangler deploy functions/api/employees/update.ts --name=employees-update
wrangler deploy functions/api/employees/delete.ts --name=employees-delete

# نشر وظائف المصادقة
wrangler deploy functions/api/auth/login.ts --name=auth-login
wrangler deploy functions/api/auth/logout.ts --name=auth-logout
wrangler deploy functions/api/auth/refresh.ts --name=auth-refresh

# نشر الوظائف المساعدة
wrangler deploy functions/api/dashboard/stats.ts --name=dashboard-stats
wrangler deploy functions/api/reports/generate.ts --name=reports-generate
```

#### 3. إعداد قاعدة البيانات

```bash
# إنشاء قاعدة البيانات
wrangler d1 create lmm-finance-db

# تطبيق الترحيلات
wrangler d1 migrations apply lmm-finance-db --env production
```

#### 4. إعداد KV Storage

```bash
# إنشاء KV namespace
wrangler kv:namespace create "lmm-finance-cache" --env production

# إضافة إلى wrangler.toml
```

## 🔍 التحقق من النشر

### 1. التحقق من الحالة

```bash
# التحقق من حالة التطبيق
curl -I https://lmm-finance.pages.dev

# التحقق من نقطة النهاية الصحية
curl https://lmm-finance.pages.dev/api/health
```

### 2. اختبار واجهات API

```bash
# اختبار API الموظفين
curl -X POST https://lmm-finance.pages.dev/api/employees/list \
  -H "Content-Type: application/json" \
  -d '{"branchId": "test-branch"}'

# اختبار API الرواتب
curl -X POST https://lmm-finance.pages.dev/api/payroll/generate \
  -H "Content-Type: application/json" \
  -d '{"month": 11, "year": 2024, "branchId": "test-branch"}'
```

### 3. مراجعة السجلات

```bash
# مراجعة سجلات النشر
tail -f deployment.log

# مراجعة سجلات wrangler
wrangler tail
```

## 🛠️ إدارة ما بعد النشر

### 1. تحديث التطبيق

```bash
# تحديث المشروع
git pull origin main

# إعادة بناء ونشر
npm run build
wrangler pages deploy dist
```

### 2. النسخ الاحتياطي

```bash
# نسخ احتياطي من قاعدة البيانات
wrangler d1 export lmm-finance-db --output=backup.sql

# نسخ احتياطي من KV
wrangler kv:key get --namespace-id=your-kv-id --key-pattern="*" > kv-backup.json
```

### 3. المراقبة

```bash
# مراقبة الأداء
wrangler tail --format=pretty

# مراقبة الأخطاء
wrangler tail --level=error
```

## 🚨 استكشاف الأخطاء وإصلاحها

### مشاكل شائعة وحلولها

#### 1. فشل المصادقة
```bash
# خطأ: "You are not authenticated"
# الحل: قم بتسجيل الدخول
wrangler login

# أو استخدم توكن API
export CLOUDFLARE_API_TOKEN=your_token_here
```

#### 2. فشل النشر
```bash
# خطأ: "Deployment failed"
# الحل: تحقق من السجلات
wrangler tail

# تحقق من حجم الملفات
find dist -type f -size +25M
```

#### 3. مشاكل قاعدة البيانات
```bash
# خطأ: "Database not found"
# الحل: إنشاء قاعدة البيانات
wrangler d1 create lmm-finance-db

# تطبيق الترحيلات
wrangler d1 migrations apply lmm-finance-db
```

#### 4. مشاكل API
```bash
# خطأ: "404 Not Found"
# الحل: تحقق من routes
wrangler routes list

# تحقق من Functions
wrangler deploy --dry-run
```

## 📊 الأداء والتحسين

### 1. تحسين الأداء

```bash
# تحليل حجم الحزمة
npm run build -- --analyze

# تقليل حجم الحزمة
npm run build -- --minify
```

### 2. تحسين قاعدة البيانات

```bash
# إنشاء فهارس
wrangler d1 execute lmm-finance-db --command="CREATE INDEX idx_employees_email ON employees(email);"

# تحليل الاستعلامات
wrangler d1 execute lmm-finance-db --command="EXPLAIN QUERY PLAN SELECT * FROM employees;"
```

### 3. تحسين الكاش

```bash
# ضبط TTL للكاش
wrangler kv:key put --namespace-id=your-kv-id key value --ttl=3600

# مسح الكاش
wrangler kv:namespace delete --namespace-id=your-kv-id
```

## 🔐 الأمان

### 1. إدارة الأذونات

```bash
# مراجعة الأذونات
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "Authorization: Bearer your_api_token"
```

### 2. تدوير المفاتيح

```bash
# تدوير API token
wrangler logout
wrangler login

# تحديث المتغيرات البيئية
wrangler secret put JWT_SECRET
```

### 3. مراقبة الأمان

```bash
# مراقبة محاولات الوصول
wrangler tail --format=pretty | grep -i "error\|unauthorized\|forbidden"
```

## 📚 الموارد الإضافية

### 1. وثائق Cloudflare
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)

### 2. أدوات التطوير
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### 3. الدعم الفني
- [Cloudflare Community](https://community.cloudflare.com/)
- [GitHub Issues](https://github.com/cloudflare/wrangler/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/cloudflare-workers)

## 🎯 ملاحظات نهائية

### 1. أفضل الممارسات
- ✅ استخدم API tokens بدلاً من Global API Keys
- ✅ قم بتدوير المفاتيح بانتظام
- ✅ راقب استخدام الحصص والحدود
- ✅ نفذ النسخ الاحتياطي بانتظام
- ✅ راقب الأداء والأخطاء

### 2. النصائح المهمة
- ⚠️ لا تشارك المفاتيح أو الأسرار
- ⚠️ لا تنسخ الملفات الحساسة في Git
- ⚠️ راقب حجم الحزمة والملفات
- ⚠️ اختبر في بيئة التطوير أولاً
- ⚠️ راقب استهلاك الحصص

### 3. التواصل
- 📧 للدعم الفني: support@lmm-finance.com
- 🐛 للإبلاغ عن الأخطاء: GitHub Issues
- 📚 للوثائق: https://docs.lmm-finance.com

---

**🎉 تهانينا! لقد قمت بنشر نظام إدارة الرواتب المتقدم بنجاح.**

النظام الآن جاهز للاستخدام الفعلي ويوفر:
- تجربة مستخدم استثنائية
- أمان عالي المستوى
- أداء فائق
- قابلية للتوسع المستقبلي

**مبروك على هذا الإنجاز الرائع!** 🚀