import { z } from 'zod';

// مخطط التحقق من المدخلات
const loginSchema = z.object({
  branchCode: z.string().min(3).max(10),
  password: z.string().min(6)
});

// دالة التحقق من حالة القفل
async function isBranchLocked(env: any, branchId: number): Promise<{ locked: boolean; until?: Date }> {
  const lockRecord = await env.DB.prepare(
    'SELECT locked_until FROM lock_sessions WHERE branch_id = ? AND lock_type = ? AND locked_until > datetime("now")'
  ).bind(branchId, 'branch_login').first();
  
  if (lockRecord) {
    return {
      locked: true,
      until: new Date(lockRecord.locked_until)
    };
  }
  
  return { locked: false };
}

// دالة تسجيل محاولة فاشلة
async function recordFailedAttempt(env: any, branchId: number): Promise<void> {
  // تحديث عداد المحاولات الفاشلة
  await env.DB.prepare(
    'UPDATE branches SET failed_attempts = failed_attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(branchId).run();
  
  // التحقق من الحاجة للقفل
  const branch = await env.DB.prepare(
    'SELECT failed_attempts FROM branches WHERE id = ?'
  ).bind(branchId).first();
  
  if (branch) {
    const attempts = branch.failed_attempts;
    let lockDuration = 0;
    
    if (attempts >= 5) {
      // قفل لمدة 24 ساعة
      lockDuration = 24;
    } else if (attempts >= 3) {
      // قفل لمدة 1 ساعة
      lockDuration = 1;
    }
    
    if (lockDuration > 0) {
      await env.DB.prepare(
        'INSERT INTO lock_sessions (branch_id, lock_type, locked_until, reason) VALUES (?, ?, datetime("now", "+" || ? || " hours"), ?)'
      ).bind(branchId, 'branch_login', lockDuration, `فشل في تسجيل الدخول ${attempts} مرات`).run();
    }
  }
}

// دالة إعادة تعيين عداد المحاولات
async function resetFailedAttempts(env: any, branchId: number): Promise<void> {
  await env.DB.prepare(
    'UPDATE branches SET failed_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(branchId).run();
}

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    
    // قراءة وتحقق من البيانات
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    
    const { branchCode, password } = validatedData;
    
    // البحث عن الفرع
    const branch = await env.DB.prepare(
      'SELECT * FROM branches WHERE branch_code = ? AND is_active = true'
    ).bind(branchCode).first();
    
    if (!branch) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'رمز الفرع غير صحيح أو الفرع غير نشط'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
    
    // التحقق من حالة القفل
    const lockStatus = await isBranchLocked(env, branch.id);
    if (lockStatus.locked) {
      const remainingTime = Math.ceil((lockStatus.until!.getTime() - Date.now()) / (1000 * 60));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'الفرع مغلق بسبب محاولات فاشلة',
          details: {
            locked: true,
            remainingMinutes: remainingTime,
            message: `الفرع مغلق لمدة ${Math.ceil(remainingTime / 60)} ساعة. الرجاء المحاولة لاحقاً.`
          }
        }),
        {
          status: 423, // Locked
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
    
    // التحقق من كلمة المرور (في الواقع، استخدم bcrypt.compare)
    // هذا مثال مبسط - استبدل بـ bcrypt.compare(password, branch.password_hash)
    const isPasswordValid = password === 'demo123'; // TODO: استخدام التحقق الفعلي
    
    if (!isPasswordValid) {
      // تسجيل المحاولة الفاشلة
      await recordFailedAttempt(env, branch.id);
      
      // الحصول على عدد المحاولات المتبقية
      const updatedBranch = await env.DB.prepare(
        'SELECT failed_attempts FROM branches WHERE id = ?'
      ).bind(branch.id).first();
      
      const remainingAttempts = Math.max(0, 3 - (updatedBranch?.failed_attempts || 0));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'كلمة المرور غير صحيحة',
          details: {
            remainingAttempts,
            warning: remainingAttempts === 0 ? 'سيتم قفل الفرع بعد محاولة أخرى' : undefined
          }
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
    
    // نجاح تسجيل الدخول - إعادة تعيين عداد المحاولات
    await resetFailedAttempts(env, branch.id);
    
    // إنشاء جلسة أو توكن (اختياري)
    const sessionToken = crypto.randomUUID();
    
    // تخزين الجلسة في KV (إذا تم تكوينه)
    if (env.CACHE) {
      await env.CACHE.put(
        `session_${sessionToken}`,
        JSON.stringify({
          branchId: branch.id,
          branchCode: branch.branch_code,
          loginTime: new Date().toISOString()
        }),
        { expirationTtl: 3600 } // ساعة واحدة
      );
    }
    
    // إرجاع النتيجة
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          branch: {
            id: branch.id,
            code: branch.branch_code,
            name: branch.branch_name,
            manager: branch.manager_name
          },
          sessionToken,
          message: 'تم تسجيل الدخول بنجاح'
        }
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
        }
      }
    );
    
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'بيانات غير صالحة',
          details: error.errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'حدث خطأ داخلي في الخادم'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}