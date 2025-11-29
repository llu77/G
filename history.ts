interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  performanceBonus: number;
  overtimePay: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  bonusTier: 'none' | 'silver' | 'gold' | 'diamond';
  status: 'generated' | 'approved' | 'paid';
  generatedBy: string;
  approvedBy?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// GET payroll history
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // Get query parameters
    const employeeId = url.searchParams.get('employeeId');
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const status = url.searchParams.get('status');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';

    let query = 'SELECT * FROM payroll_records WHERE 1=1';
    const params: any[] = [];

    // Add filters
    if (employeeId) {
      query += ' AND employeeId = ?';
      params.push(employeeId);
    }

    if (month) {
      query += ' AND month = ?';
      params.push(parseInt(month));
    }

    if (year) {
      query += ' AND year = ?';
      params.push(parseInt(year));
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Add ordering and pagination
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const payrollHistory = await env.DB.prepare(query).bind(...params).all();

    if (!payrollHistory.results) {
      return new Response(
        JSON.stringify([]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify(payrollHistory.results),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Get payroll history error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء جلب سجلات الرواتب',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PUT update payroll status
export async function onRequestPut(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { recordId, status, approvedBy } = body;

    if (!recordId || !status) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'معرف السجل والحالة مطلوبان'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate status
    const validStatuses = ['generated', 'approved', 'paid'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'حالة غير صالحة'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if record exists
    const existingRecord = await env.DB.prepare(
      'SELECT * FROM payroll_records WHERE id = ?'
    ).bind(recordId).first();

    if (!existingRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'سجل الراتب غير موجود'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const now = new Date().toISOString();
    let updateQuery = 'UPDATE payroll_records SET status = ?, updatedAt = ?';
    const params = [status, now];

    // Add approvedBy if provided and status is approved
    if (status === 'approved' && approvedBy) {
      updateQuery += ', approvedBy = ?';
      params.push(approvedBy);
    }

    // Add paidAt if status is paid
    if (status === 'paid') {
      updateQuery += ', paidAt = ?';
      params.push(now);
    }

    updateQuery += ' WHERE id = ?';
    params.push(recordId);

    await env.DB.prepare(updateQuery).bind(...params).run();

    const updatedRecord = await env.DB.prepare(
      'SELECT * FROM payroll_records WHERE id = ?'
    ).bind(recordId).first();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم تحديث حالة الراتب بنجاح',
        record: updatedRecord
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Update payroll status error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء تحديث حالة الراتب',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// DELETE payroll record
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const recordId = url.pathname.split('/').pop();

    if (!recordId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'معرف سجل الراتب مطلوب'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if record exists
    const existingRecord = await env.DB.prepare(
      'SELECT * FROM payroll_records WHERE id = ?'
    ).bind(recordId).first();

    if (!existingRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'سجل الراتب غير موجود'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete the record
    await env.DB.prepare(
      'DELETE FROM payroll_records WHERE id = ?'
    ).bind(recordId).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم حذف سجل الراتب بنجاح'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Delete payroll record error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء حذف سجل الراتب',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}