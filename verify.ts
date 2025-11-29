import { z } from 'zod';

// مخطط التحقق من المدخلات
const financialSchema = z.object({
  branchId: z.number().positive(),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  cashAmount: z.number().min(0),
  cardAmount: z.number().min(0),
  transferAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  differenceReason: z.string().optional()
});

// دالة التحقق من الحسابات
function verifyFinancialRecord(data: any): { valid: boolean; difference: number; reason?: string } {
  const calculatedTotal = data.cashAmount + data.cardAmount + data.transferAmount;
  const difference = Math.abs(data.totalAmount - calculatedTotal);
  
  if (difference === 0) {
    return { valid: true, difference: 0 };
  }
  
  // إذا كان هناك فرق، يجب توضيح السبب
  if (!data.differenceReason || data.differenceReason.trim().length < 5) {
    return { 
      valid: false, 
      difference, 
      reason: 'يجب توضيح سبب الفرق عند عدم تطابق المبالغ' 
    };
  }
  
  return { 
    valid: true, 
    difference, 
    reason: data.differenceReason 
  };
}

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    
    // قراءة وتحقق من البيانات
    const body = await request.json();
    const validatedData = financialSchema.parse(body);
    
    // التحقق من الحسابات
    const verification = verifyFinancialRecord(validatedData);
    
    if (!verification.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: verification.reason || 'التحقق من الحسابات فشل',
          details: {
            calculatedTotal: validatedData.cashAmount + validatedData.cardAmount + validatedData.transferAmount,
            providedTotal: validatedData.totalAmount,
            difference: verification.difference
          }
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
    
    // التحقق من وجود الفرع
    const branch = await env.DB.prepare(
      'SELECT id FROM branches WHERE id = ? AND is_active = true'
    ).bind(validatedData.branchId).first();
    
    if (!branch) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'الفرع غير موجود أو غير نشط'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
    
    // التحقق من عدم وجود سجل لنفس التاريخ
    const existingRecord = await env.DB.prepare(
      'SELECT id FROM financial_records WHERE branch_id = ? AND record_date = ?'
    ).bind(validatedData.branchId, validatedData.recordDate).first();
    
    if (existingRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'يوجد بالفعل سجل مالي لنفس التاريخ والفرع'
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }
    
    // إنشاء سجل مالي جديد
    const result = await env.DB.prepare(
      `INSERT INTO financial_records 
       (branch_id, record_date, cash_amount, card_amount, transfer_amount, total_amount, difference_amount, difference_reason, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      validatedData.branchId,
      validatedData.recordDate,
      validatedData.cashAmount,
      validatedData.cardAmount,
      validatedData.transferAmount,
      validatedData.totalAmount,
      verification.difference || 0,
      verification.reason || null,
      1 // TODO: استخدام معرف المستخدم الفعلي
    ).run();
    
    if (!result.success) {
      throw new Error('فشل في إنشاء سجل مالي');
    }
    
    // إرجاع النتيجة
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recordId: result.meta.last_row_id,
          verification: {
            valid: true,
            difference: verification.difference || 0,
            reason: verification.reason
          },
          breakdown: {
            cash: validatedData.cashAmount,
            card: validatedData.cardAmount,
            transfer: validatedData.transferAmount,
            calculatedTotal: validatedData.cashAmount + validatedData.cardAmount + validatedData.transferAmount,
            providedTotal: validatedData.totalAmount
          }
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
    
  } catch (error) {
    console.error('خطأ في التحقق من السجل المالي:', error);
    
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