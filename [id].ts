interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hireDate: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  performanceRating: number;
  overtimeHours: number;
  overtimeRate: number;
  isActive: boolean;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

// GET single employee
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'معرف الموظف مطلوب'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const employee = await env.DB.prepare(
      'SELECT * FROM employees WHERE id = ?'
    ).bind(id).first();

    if (!employee) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'الموظف غير موجود'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify(employee),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Get employee error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء جلب الموظف',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PUT update employee
export async function onRequestPut(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'معرف الموظف مطلوب'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      department,
      position,
      hireDate,
      baseSalary,
      allowances = 0,
      deductions = 0,
      performanceRating = 0,
      overtimeHours = 0,
      overtimeRate = 1.5,
      isActive = true
    } = body;

    // Check if employee exists
    const existingEmployee = await env.DB.prepare(
      'SELECT * FROM employees WHERE id = ?'
    ).bind(id).first();

    if (!existingEmployee) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'الموظف غير موجود'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingEmployee.email) {
      const emailExists = await env.DB.prepare(
        'SELECT id FROM employees WHERE email = ? AND id != ?'
      ).bind(email, id).first();

      if (emailExists) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'البريد الإلكتروني مستخدم بالفعل'
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    const now = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE employees SET
        fullName = COALESCE(?, fullName),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        department = COALESCE(?, department),
        position = COALESCE(?, position),
        hireDate = COALESCE(?, hireDate),
        baseSalary = COALESCE(?, baseSalary),
        allowances = COALESCE(?, allowances),
        deductions = COALESCE(?, deductions),
        performanceRating = COALESCE(?, performanceRating),
        overtimeHours = COALESCE(?, overtimeHours),
        overtimeRate = COALESCE(?, overtimeRate),
        isActive = COALESCE(?, isActive),
        updatedAt = ?
      WHERE id = ?
    `).bind(
      fullName,
      email,
      phone,
      department,
      position,
      hireDate,
      baseSalary,
      allowances,
      deductions,
      performanceRating,
      overtimeHours,
      overtimeRate,
      isActive,
      now,
      id
    ).run();

    const updatedEmployee = await env.DB.prepare(
      'SELECT * FROM employees WHERE id = ?'
    ).bind(id).first();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم تحديث الموظف بنجاح',
        employee: updatedEmployee
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Update employee error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء تحديث الموظف',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// DELETE employee
export async function onRequestDelete(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'معرف الموظف مطلوب'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if employee exists
    const existingEmployee = await env.DB.prepare(
      'SELECT * FROM employees WHERE id = ?'
    ).bind(id).first();

    if (!existingEmployee) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'الموظف غير موجود'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete employee (soft delete by setting isActive to false)
    await env.DB.prepare(
      'UPDATE employees SET isActive = 0, updatedAt = ? WHERE id = ?'
    ).bind(new Date().toISOString(), id).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم حذف الموظف بنجاح'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Delete employee error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء حذف الموظف',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}