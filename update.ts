interface Env {
  DB: D1Database;
}

interface EmployeeUpdateData {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  salary: number;
  role: 'employee' | 'manager' | 'hr' | 'accountant';
  address?: string;
  emergencyContact?: string;
  bankAccount?: string;
}

export async function onRequestPut(context: { request: Request; env: Env }) {
  try {
    const updateData: EmployeeUpdateData = await context.request.json();
    
    // Validate required fields
    if (!updateData.id || !updateData.name || !updateData.email || 
        !updateData.phone || !updateData.position || !updateData.salary) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updateData.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate salary
    if (updateData.salary < 0) {
      return new Response(
        JSON.stringify({ error: 'Salary must be positive' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = context.env.DB;

    // Check if employee exists
    const existingEmployee = await db.prepare(
      'SELECT id FROM employees WHERE id = ?'
    ).bind(updateData.id).first();

    if (!existingEmployee) {
      return new Response(
        JSON.stringify({ error: 'Employee not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is taken by another employee
    const emailConflict = await db.prepare(
      'SELECT id FROM employees WHERE email = ? AND id != ?'
    ).bind(updateData.email, updateData.id).first();

    if (emailConflict) {
      return new Response(
        JSON.stringify({ error: 'Email already taken by another employee' }), 
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedAt = new Date().toISOString();

    // Update employee
    await db.prepare(`
      UPDATE employees 
      SET name = ?, email = ?, phone = ?, position = ?, salary = ?, role = ?, 
          address = ?, emergency_contact = ?, bank_account = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      updateData.name,
      updateData.email,
      updateData.phone,
      updateData.position,
      updateData.salary,
      updateData.role,
      updateData.address || null,
      updateData.emergencyContact || null,
      updateData.bankAccount || null,
      updatedAt,
      updateData.id
    ).run();

    // Get the updated employee with branch info
    const updatedEmployee = await db.prepare(`
      SELECT 
        e.id, e.name, e.email, e.phone, e.position, e.salary, 
        e.hire_date as hireDate, e.status, e.role,
        e.address, e.emergency_contact as emergencyContact, e.bank_account as bankAccount,
        b.id as branchId, b.name as branchName
      FROM employees e
      JOIN branches b ON e.branch_id = b.id
      WHERE e.id = ?
    `).bind(updateData.id).first();

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee: updatedEmployee,
        message: 'Employee updated successfully' 
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Employee update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update employee' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}