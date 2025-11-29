# نظام إدارة الرواتب - LMM Finance

## نظرة عامة

نظام إدارة الرواتب هو جزء متقدم من مشروع LMM Finance يوفر إدارة شاملة لكشوفات الرواتب مع ميزات متقدمة تشمل:

- حساب الرواتب التلقائي
- نظام حوافز متعدد المستويات (فضي، ذهبي، ماسي)
- قفل زمني لحماية العمليات الحساسة
- إدارة شاملة للموظفين
- معالجة دفعات آمنة
- تقارير مفصلة وإحصائيات

## الميزات الرئيسية

### 1. نظام الحوافز المتدرج

#### مستويات الحوافز:
- **فضي (Silver)**: 5% من الراتب الأساسي - يتطلب 70-79 نقطة أداء
- **ذهبي (Gold)**: 10% من الراتب الأساسي - يتطلب 80-89 نقطة أداء  
- **ماسي (Diamond)**: 15% من الراتب الأساسي - يتطلب 90-100 نقطة أداء

#### معايير التقييم:
1. **الحضور والانضباط (40%)**
   - عدد أيام الحضور
   - عدد أيام التأخر
   - عدد أيام الغياب

2. **الأداء الوظيفي (30%)**
   - تحقيق الأهداف
   - التعاون الفريق
   - الابتكار والمبادرات

3. **الإنجازات والتميز (20%)**
   - الإنجازات المعتمدة
   - الشهادات والدورات

4. **رضا العملاء (10%)** (للوظائف ذات التعامل المباشر)
   - تقييمات العملاء
   - الشكاوى والاقتراحات

### 2. قفل النظام الزمني

لحماية عمليات الرواتب الحساسة، يتم قفل النظام ويصبح متاحاً فقط في الأيام 28-31 من كل شهر.

#### آلية القفل:
- **الحالة المغلقة**: لا يمكن إنشاء كشوف الرواتب أو تعديلها
- **الحالة المفتوحة**: تتوفر جميع وظائف إدارة الرواتب
- **رسائل تحذير**: يتم عرض رسائل واضحة للمستخدمين حول حالة النظام

### 3. إدارة الموظفين

#### العمليات الأساسية:
- **إضافة موظف**: إدخال بيانات كاملة للموظف
- **تعديل الموظف**: تحديث المعلومات والبيانات
- **حذف الموظف**: حذف آمن مع التحقق من الروابط
- **بحث وتصفية**: أدوات بحث متقدمة

#### البيانات المطلوبة:
- المعلومات الشخصية (الاسم، البريد، الهاتف)
- المعلومات الوظيفية (المنصب، الراتب، الدور)
- بيانات التواصل (العنوان، جهة الاتصال الطارئة)
- البيانات المالية (رقم الحساب البنكي)

### 4. معالجة الدفعات

#### طرق الدفع:
- **التحويل البنكي**: الطريقة الافتراضية والأكثر أماناً
- **الدفع النقدي**: مع سجلات التحقق
- **الشيكات**: مع متابعة الحالة

#### آلية المعالجة:
1. التحقق من صحة البيانات
2. تحديث حالة كشف الراتب
3. إنشاء سجل المعاملة المالية
4. إرسال إشعار للموظف
5. تحديث سجلات الحضور والأداء

## البنية التقنية

### قاعدة البيانات

#### الجداول الرئيسية:
```sql
-- الموظفين
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

-- كشوف الرواتب
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

-- سجلات الأداء
CREATE TABLE performance_reviews (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    performance_score INTEGER NOT NULL,
    target_achievement INTEGER NOT NULL,
    team_collaboration INTEGER NOT NULL,
    innovation_score INTEGER NOT NULL,
    review_date TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    comments TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- الإنجازات
CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    achievement_type TEXT NOT NULL,
    description TEXT NOT NULL,
    achievement_date TEXT NOT NULL,
    points INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- سجلات الدفع
CREATE TABLE payroll_payments (
    id TEXT PRIMARY KEY,
    payroll_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- المعاملات المالية
CREATE TABLE financial_transactions (
    id TEXT PRIMARY KEY,
    transaction_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    employee_id TEXT,
    payroll_id TEXT,
    payment_id TEXT,
    branch_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### واجهة برمجة التطبيقات (API)

#### النقاط الرئيسية:

1. **إنشاء كشف الراتب**
   ```http
   POST /api/payroll/generate
   {
     "month": 11,
     "year": 2024,
     "branchId": "branch-1"
   }
   ```

2. **حساب الحافز**
   ```http
   POST /api/bonus/calculate
   {
     "employeeId": "emp-1",
     "month": 11,
     "year": 2024
   }
   ```

3. **معالجة الدفعات**
   ```http
   POST /api/payroll/process-payment
   {
     "payrollIds": ["payroll-1", "payroll-2"],
     "paymentMethod": "bank_transfer",
     "notes": "دفعة شهر نوفمبر 2024"
   }
   ```

4. **إدارة الموظفين**
   ```http
   POST /api/employees/create    # إضافة موظف
   PUT /api/employees/update     # تعديل موظف  
   DELETE /api/employees/delete  # حذف موظف
   POST /api/employees/list      # قائمة الموظفين
   ```

## إعدادات النظام

### متغيرات البيئة

```env
# قفل النظام الزمني
PAYROLL_LOCK_ENABLED=true
PAYROLL_LOCK_START_DAY=28
PAYROLL_LOCK_END_DAY=31

# نسب الحوافز
BONUS_SILVER_PERCENTAGE=5
BONUS_GOLD_PERCENTAGE=10
BONUS_DIAMOND_PERCENTAGE=15

# الخصومات الافتراضية
SOCIAL_INSURANCE_PERCENTAGE=9
HEALTH_INSURANCE_PERCENTAGE=5

# إعدادات البريد الإلكتروني
EMAIL_SERVICE_ENABLED=true
EMAIL_SERVICE_API_KEY=your_api_key
```

### الأذونات والأدوار

#### الأدوار المدعومة:
- **Admin**: وصول كامل لجميع الميزات
- **HR Manager**: إدارة الموظفين والرواتب
- **Accountant**: إنشاء كشوف الرواتب ومعالجة الدفعات
- **Manager**: عرض التقارير والإحصائيات
- **Employee**: عرض الراتب الشخصي فقط

#### الأذونات حسب الدور:
- **إنشاء كشف راتب**: Admin, Accountant
- **حساب الحوافز**: Admin, HR Manager
- **معالجة الدفعات**: Admin, Accountant
- **إدارة الموظفين**: Admin, HR Manager
- **عرض التقارير**: جميع الأدوار (بمستويات مختلفة)

## التقارير والإحصائيات

### التقارير المتوفرة:

1. **تقرير الرواتب الشهري**
   - إجمالي الرواتب المدفوعة
   - تفصيل الحوافز والخصومات
   - عدد الموظفين

2. **تقرير الأداء الشهري**
   - توزيع الحوافز حسب المستوى
   - متوسط نقاط الأداء
   - الإنجازات المعتمدة

3. **تقرير التكاليف**
   - تكلفة الرواتب الإجمالية
   - تكلفة الحوافز
   - تكلفة الخصومات

4. **تقرير الحضور**
   - نسبة الحضور
   - أيام التأخر والغياب
   - العقوبات المطبقة

### لوحة التحكم التفاعلية:

- **إحصائيات لحظية**: تحديث فوري للبيانات
- **رسوم بيانية تفاعلية**: توزيع الحوافز، تطور الرواتب
- **مؤشرات الأداء**: KPIs رئيسية
- **تنبيهات مهمة**: المواعيد النهائية، المهام المعلقة

## الأمان والخصوصية

### تدابير الأمان:

1. **التحقق من الصلاحيات**: كل عملية تتطلب التحقق من الدور
2. **سجلات التدقيق**: تسجيل جميع العمليات الحساسة
3. **تشفير البيانات**: تشفير المعلومات الحساسة
4. **النسخ الاحتياطي**: نسخ احتياطي تلقائي للبيانات
5. **التحقق من صحة البيانات**: التحقق من صحة جميع المدخلات

### الخصوصية:

- **حماية بيانات الموظفين**: الوصول المحدود للمعلومات الشخصية
- **تشفير الاتصالات**: جميع الاتصالات مشفرة
- **سجلات الوصول**: تتبع من يصل إلى أي معلومات
- **الحذف الآمن**: حذف آمن للبيانات غير الضرورية

## الصيانة والدعم

### الصيانة الدورية:

- **تحديث البيانات**: تحديث دوري لسجلات الأداء
- **مراجعة الحسابات**: التحقق من دقة الحسابات
- **تحديث النظام**: تطبيق التحديثات الأمنية
- **النسخ الاحتياطي**: نسخ احتياطي يومي للبيانات

### الدعم الفني:

- **تتبع الأخطاء**: نظام تتبع شامل للأخطاء
- **سجلات الأداء**: مراقبة أداء النظام
- **النسخ الاحتياطي**: استعادة سريعة للبيانات
- **الدعم الفني**: فريق دعم متخصص

## التكامل مع الأنظمة الأخرى

### أنظمة التوصيل:
- **البريد الإلكتروني**: إشعارات تلقائية
- **الرسائل النصية**: تنبيهات مهمة
- **التطبيقات المحمولة**: مزامنة مع تطبيقات الهاتف

### أنظمة المحاسبة:
- **البرامج المحاسبية**: تصدير البيانات
- **أنظمة ERP**: تكامل مع أنظمة الموارد
- **البنوك**: ربط مباشر مع الحسابات البنكية

## التوثيق والتدريب

### وثائق المستخدم:
- **دليل المستخدم**: تعليمات مفصلة لكل ميزة
- **فيديوهات تعليمية**: شروحات مصورة
- **أسئلة شائعة**: إجابات للأسئلة المتكررة
- **دعم مباشر**: مساعدة فورية عبر الدردشة

### التدريب:
- **جلسات تدريبية**: تدريب عملي على النظام
- **شهادات اجتياز**: تأكيد الكفاءة في استخدام النظام
- **تحديثات دورية**: تدريب على الميزات الجديدة

## التراخيص والامتثال

### الامتثال القانوني:
- **قوانين العمل**: الالتزام بقوانين العمل المحلية
- **خصوصية البيانات**: الالتزام بمعايير GDPR
- **الأمان السيبراني**: معايير الأمان الدولية
- **المراجعة القانونية**: مراجعة دورية للتزامات النظام

### التراخيص:
- **رخصة الاستخدام**: شروط استخدام النظام
- **حقوق الملكية**: حماية حقوق الملكية الفكرية
- **اتفاقية الخدمة**: شروط تقديم الخدمة
- **سياسة الخصوصية**: حماية خصوصية المستخدمين

---

**ملاحظة**: هذا النظام مصمم لتلبية احتياجات إدارة الرواتب في بيئة الأعمال السعودية، مع مراعاة القوانين والأنظمة المحلية والمتطلبات الثقافية.