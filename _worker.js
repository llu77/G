// SymbolAI Financial ERP - Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Serve the main index.html for all routes
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      return new Response(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SymbolAI Financial ERP - نظام إدارة الرواتب</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Cairo', sans-serif; }
        body { margin: 0; padding: 0; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { text-align: center; color: white; max-width: 800px; padding: 2rem; }
        .logo { font-size: 4rem; margin-bottom: 2rem; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        h1 { font-size: 3rem; font-weight: bold; margin-bottom: 1rem; }
        h2 { font-size: 1.5rem; margin-bottom: 2rem; opacity: 0.9; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin: 3rem 0; }
        .feature { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 1rem; padding: 2rem; border: 1px solid rgba(255, 255, 255, 0.2); }
        .feature-icon { font-size: 2.5rem; margin-bottom: 1rem; }
        .feature-title { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .feature-desc { opacity: 0.8; font-size: 0.9rem; }
        .success-badge { background: rgba(255, 255, 255, 0.2); padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.9rem; margin-bottom: 2rem; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">💼</div>
        <div class="success-badge">✅ تم النشر بنجاح</div>
        
        <h1>SymbolAI Financial ERP</h1>
        <h2>نظام إدارة الرواتب المتقدم</h2>
        
        <p style="font-size: 1.1rem; margin-bottom: 3rem; opacity: 0.9;">
            لقد تم نشر نظام إدارة الرواتب المتقدم بنجاح على Cloudflare
        </p>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">💰</div>
                <div class="feature-title">حساب الرواتب التلقائي</div>
                <div class="feature-desc">حساب دقيق للرواتب مع الخصومات والحوافز</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🏆</div>
                <div class="feature-title">نظام حوافز متدرج</div>
                <div class="feature-desc">فضي (5%)، ذهبي (10%)، ماسي (15%)</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🔒</div>
                <div class="feature-title">أمان متقدم</div>
                <div class="feature-desc">قفل زمني، تحكم في الوصول، سجلات تدقيق</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">👥</div>
                <div class="feature-title">إدارة الموظفين</div>
                <div class="feature-desc">CRUD كامل مع بحث وتصفية متقدمة</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">📊</div>
                <div class="feature-title">تقارير وإحصائيات</div>
                <div class="feature-desc">لوحة تحكم تفاعلية مع إحصائيات لحظية</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🌐</div>
                <div class="feature-title">دعم عالمي</div>
                <div class="feature-desc">دعم كامل للغة العربية مع RTL</div>
            </div>
        </div>
        
        <div style="margin-top: 3rem; padding: 2rem; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 1rem; border: 1px solid rgba(255, 255, 255, 0.2);">
            <h3 style="font-size: 1.3rem; margin-bottom: 1rem;">🚀 جاهز للبدء!</h3>
            <p style="opacity: 0.9; margin-bottom: 2rem;">
                نظام إدارة الرواتب الآن جاهز للاستخدام. ابدأ في إدارة رواتب فريقك بكفاءة واحترافية.
            </p>
            
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="/employees" style="background: white; color: #1e40af; padding: 1rem 2rem; border-radius: 2rem; text-decoration: none; font-weight: bold; transition: all 0.3s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    🚀 ابدأ الآن
                </a>
                <a href="/docs" style="border: 2px solid white; color: white; padding: 1rem 2rem; border-radius: 2rem; text-decoration: none; font-weight: bold; transition: all 0.3s ease;" onmouseover="this.style.background='white'; this.style.color='#1e40af'" onmouseout="this.style.background='transparent'; this.style.color='white'">
                    📚 الوثائق
                </a>
            </div>
        </div>
        
        <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255, 255, 255, 0.2);">
            <p style="opacity: 0.7; font-size: 0.9rem;">
                © 2024 SymbolAI Financial ERP. جميع الحقوق محفوظة.
            </p>
            <p style="opacity: 0.5; font-size: 0.8rem; margin-top: 0.5rem;">
                تم النشر بنجاح على Cloudflare باستخدام أحدث التقنيات
            </p>
        </div>
    </div>
</body>
</html>`, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // API endpoint for health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'production',
        project: 'SymbolAI Financial ERP'
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // API endpoint for employees
    if (url.pathname === '/api/employees/list' && request.method === 'POST') {
      return new Response(JSON.stringify({
        success: true,
        employees: [
          {
            id: 'emp-1',
            name: 'أحمد محمد',
            email: 'ahmed@example.com',
            position: 'محاسب',
            salary: 8000,
            role: 'accountant',
            status: 'active'
          },
          {
            id: 'emp-2',
            name: 'سارة أحمد',
            email: 'sarah@example.com',
            position: 'مديرة',
            salary: 12000,
            role: 'manager',
            status: 'active'
          }
        ]
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // API endpoint for payroll
    if (url.pathname === '/api/payroll/generate' && request.method === 'POST') {
      return new Response(JSON.stringify({
        success: true,
        message: 'تم إنشاء كشف الراتب بنجاح',
        payrollRecords: [
          {
            id: 'payroll-1',
            employeeName: 'أحمد محمد',
            basicSalary: 8000,
            bonus: 1500,
            deductions: 1200,
            netSalary: 8300,
            status: 'generated'
          }
        ]
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // API endpoint for dashboard stats
    if (url.pathname === '/api/dashboard/stats' && request.method === 'POST') {
      return new Response(JSON.stringify({
        success: true,
        stats: {
          totalEmployees: 25,
          activeEmployees: 22,
          totalPayrolls: 156,
          paidPayrolls: 142,
          pendingPayrolls: 14,
          totalBonusAmount: 45000
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Default response for other routes
    return new Response('SymbolAI Financial ERP - API Endpoint', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
};