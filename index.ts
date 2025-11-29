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

// GET all employees
export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { env } = context;
    
    const employees = await env.DB.prepare(
      'SELECT * FROM employees ORDER BY createdAt DESC'
    ).all();

    if (!employees.results) {
      return new Response(
        JSON.stringify([]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify(employees.results),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Get employees error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء جلب الموظفين',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// POST new employee
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
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
      isActive = true,
      branchId = 'default-branch'
    } = body;

    // Validate required fields
    if (!fullName || !email || !phone || !department || !position || !hireDate || baseSalary === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'جميع الحقول المطلوبة يجب أن تكون ممتلئة'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if email already exists
    const existingEmail = await env.DB.prepare(
      'SELECT id FROM employees WHERE email = ?'
    ).bind(email).first();

    if (existingEmail) {
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

    // Generate employee code
    const employeeCode = `EMP-${Date.now()}`;
    const id = `emp_${Date.now()}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO employees (
        id, employeeCode, fullName, email, phone, department, position,
        hireDate, baseSalary, allowances, deductions, performanceRating,
        overtimeHours, overtimeRate, isActive, branchId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      employeeCode,
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
      isActive ? 1 : 0,
      branchId,
      now,
      now
    ).run();

    const newEmployee = await env.DB.prepare(
      'SELECT * FROM employees WHERE id = ?'
    ).bind(id).first();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إضافة الموظف بنجاح',
        employee: newEmployee
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Create employee error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'حدث خطأ أثناء إضافة الموظف',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}