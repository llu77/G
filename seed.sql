-- بيانات تجريبية لـ LMM Finance
-- يمكن استخدام هذه البيانات للتطوير والاختبار

-- إدراج فروع تجريبية
INSERT OR IGNORE INTO branches (branch_code, branch_name, password_hash, manager_name, phone, email, address) VALUES
('BR001', 'فرع الرياض الرئيسي', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLq', 'أحمد محمد', '0501234567', 'riyadh@lmm.com', 'الرياض، حي الملك عبدالعزيز'),
('BR002', 'فرع جدة', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLq', 'فاطمة علي', '0502345678', 'jeddah@lmm.com', 'جدة، حي الروضة'),
('BR003', 'فرع الدمام', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLq', 'خالد عبدالرحمن', '0503456789', 'dammam@lmm.com', 'الدمام، حي الشاطئ');

-- إدراج مستخدمين تجريبيين
INSERT OR IGNORE INTO users (username, email, password_hash, role, branch_id) VALUES
('admin', 'admin@lmm.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLq', 'admin', 1),
('supervisor1', 'supervisor@lmm.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLq', 'supervisor', 1),
('partner1', 'partner@lmm.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLq', 'partner', 1),
('employee1', 'employee@lmm.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLq', 'employee', 1);

-- إدراج موظفين تجريبيين
INSERT OR IGNORE INTO employees (employee_id, full_name, phone, email, national_id, position, department, branch_id, hire_date, base_salary) VALUES
('EMP001', 'محمد أحمد عبدالله', '0501111111', 'mohammed@lmm.com', '1020304050', 'محاسب', 'المالية', 1, '2023-01-15', 3500.00),
('EMP002', 'سارة خالد محمد', '0502222222', 'sarah@lmm.com', '1020304051', 'مديرة فرع', 'الإدارة', 1, '2022-03-10', 5000.00),
('EMP003', 'عبدالرحمن علي سعيد', '0503333333', 'abdulrahman@lmm.com', '1020304052', 'موظف مبيعات', 'المبيعات', 2, '2023-06-01', 3000.00),
('EMP004', 'نورة فيصل أحمد', '0504444444', 'nora@lmm.com', '1020304053', 'أخصائية موارد بشرية', 'الموارد البشرية', 2, '2022-11-20', 4000.00),
('EMP005', 'خالد سامي محمد', '0505555555', 'khaled@lmm.com', '1020304054', 'فني صيانة', 'الصيانة', 3, '2023-02-14', 3200.00);

-- إدراج سجلات مالية تجريبية
INSERT OR IGNORE INTO financial_records (branch_id, record_date, cash_amount, card_amount, transfer_amount, total_amount, recorded_by) VALUES
(1, '2024-11-20', 1500.00, 2000.00, 1000.00, 4500.00, 1),
(1, '2024-11-21', 1200.00, 1800.00, 800.00, 3800.00, 1),
(2, '2024-11-20', 2000.00, 1500.00, 1200.00, 4700.00, 2),
(2, '2024-11-21', 1800.00, 1700.00, 1100.00, 4600.00, 2),
(3, '2024-11-20', 1000.00, 1200.00, 800.00, 3000.00, 3),
(3, '2024-11-21', 1100.00, 1300.00, 900.00, 3300.00, 3);

-- إدراج سجلات رواتب تجريبية (لشهر 10 - ليتم الدفع في شهر 11)
INSERT OR IGNORE INTO payroll_records (employee_id, month, year, base_salary, bonus_amount, deduction_amount, loan_amount, net_salary, status, generated_by) VALUES
(1, 10, 2024, 3500.00, 200.00, 100.00, 0.00, 3600.00, 'paid', 1),
(2, 10, 2024, 5000.00, 500.00, 200.00, 0.00, 5300.00, 'paid', 1),
(3, 10, 2024, 3000.00, 150.00, 50.00, 0.00, 3100.00, 'paid', 1),
(4, 10, 2024, 4000.00, 300.00, 150.00, 0.00, 4150.00, 'paid', 1),
(5, 10, 2024, 3200.00, 100.00, 80.00, 0.00, 3220.00, 'paid', 1);

-- إدراج طلبات تجريبية
INSERT OR IGNORE INTO requests (employee_id, request_type, title, content, submitted_by) VALUES
(1, 'loan', 'طلب سلفة', 'أرغب في الحصول على سلفة قدرها 2000 ريال لظروف عائلية طارئة', 1),
(2, 'vacation', 'طلب إجازة', 'أطلب إجازة سنوية لمدة 10 أيام اعتباراً من 1 ديسمبر 2024', 2),
(3, 'complaint', 'شكوى', 'هناك مشكلة في نظام الحضور والانصراف في الفرع', 3),
(1, 'resignation', 'استقالة', 'أتقدم باستقالتي من العمل لظروف شخصية، وسأكمل فترة الإشعار 30 يوم', 1);

-- إدراج إعدادات النظام
INSERT OR IGNORE INTO settings (key_name, value, description) VALUES
('payroll_lock_enabled', 'true', 'تمكين قفل وقت الرواتب'),
('branch_lock_enabled', 'true', 'تمكين قفل الفروع'),
('max_failed_attempts', '3', 'الحد الأقصى لمحاولات الفشل قبل القفل'),
('lock_duration_hours', '1', 'مدة القفل بالساعات'),
('extended_lock_duration_hours', '24', 'مدة القفل الممتدة بالساعات'),
('bonus_silver_threshold', '1300', 'عتبة المكافأة الفضية'),
('bonus_gold_threshold', '1800', 'عتبة المكافأة الذهبية'),
('bonus_diamond_threshold', '2400', 'عتبة المكافأة الماسية'),
('bonus_silver_amount', '50', 'مبلغ المكافأة الفضية'),
('bonus_gold_amount', '100', 'مبلغ المكافأة الذهبية'),
('bonus_diamond_amount', '175', 'مبلغ المكافأة الماسية'),
('base_salary', '3000', 'الراتب الأساسي الافتراضي'),
('app_name', 'LMM Finance', 'اسم التطبيق'),
('app_version', '1.0.0', 'إصدار التطبيق'),
('company_name', 'شركة LMM للتمويل', 'اسم الشركة');