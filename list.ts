interface Env {
  DB: D1Database;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  branchId: string;
  branchName: string;
  position: string;
  salary: number;
  hireDate: string;
  status: 'active' | 'inactive';
  role: 'employee' | 'manager' | 'hr' | 'accountant';
  address?: string;
  emergencyContact?: string;
  bankAccount?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { branchId } = await context.request.json();
    
    if (!branchId) {
      return new Response(
        JSON.stringify({ error: 'Branch ID is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = context.env.DB;

    // Get employees with their branch information
    const employees = await db.prepare(`
      SELECT 
        e.id, e.name, e.email, e.phone, e.position, e.salary, 
        e.hire_date as hireDate, e.status, e.role,
        e.address, e.emergency_contact as emergencyContact, e.bank_account as bankAccount,
        b.id as branchId, b.name as branchName
      FROM employees e
      JOIN branches b ON e.branch_id = b.id
      WHERE e.branch_id = ?
      ORDER BY e.name ASC
    `).bind(branchId).all<Employee>();

    return new Response(
      JSON.stringify(employees.results), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Employee list error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch employees' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}