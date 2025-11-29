import { z } from 'zod';

// Employee schema
export const employeeSchema = z.object({
  id: z.number(),
  employee_id: z.string(),
  full_name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  national_id: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  branch_id: z.number(),
  hire_date: z.string().optional(),
  base_salary: z.number().default(3000),
  is_active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string()
});

// Payroll record schema
export const payrollRecordSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  month: z.number(),
  year: z.number(),
  base_salary: z.number(),
  bonus_amount: z.number().default(0),
  deduction_amount: z.number().default(0),
  loan_amount: z.number().default(0),
  net_salary: z.number(),
  status: z.enum(['draft', 'approved', 'paid', 'cancelled']).default('draft'),
  generated_by: z.number(),
  generated_at: z.string().optional(),
  paid_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export type Employee = z.infer<typeof employeeSchema>;
export type PayrollRecord = z.infer<typeof payrollRecordSchema>;

// Get employee by ID
export async function getEmployeeById(env: any, employeeId: number): Promise<Employee | null> {
  const result = await env.DB.prepare(
    `SELECT * FROM employees WHERE id = ? AND is_active = true`
  ).bind(employeeId).first();
  
  if (!result) return null;
  
  try {
    return employeeSchema.parse(result);
  } catch (error) {
    console.error('Employee validation error:', error);
    return null;
  }
}

// Get all active employees for a branch
export async function getEmployeesByBranch(env: any, branchId: number): Promise<Employee[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM employees WHERE branch_id = ? AND is_active = true ORDER BY full_name`
  ).bind(branchId).all();
  
  return results.results?.map(employee => {
    try {
      return employeeSchema.parse(employee);
    } catch (error) {
      console.error('Employee validation error:', error);
      return null;
    }
  }).filter(Boolean) as Employee[];
}

// Create payroll record
export async function createPayrollRecord(
  env: any, 
  data: {
    employeeId: number;
    month: number;
    year: number;
    baseSalary: number;
    bonuses: number;
    deductions: number;
    loans: number;
    netSalary: number;
    generatedBy: number;
  }
): Promise<PayrollRecord> {
  const result = await env.DB.prepare(
    `INSERT INTO payroll_records (
      employee_id, month, year, base_salary, bonus_amount, 
      deduction_amount, loan_amount, net_salary, generated_by, 
      generated_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.employeeId,
    data.month,
    data.year,
    data.baseSalary,
    data.bonuses,
    data.deductions,
    data.loans,
    data.netSalary,
    data.generatedBy,
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  ).run();
  
  // Get the created record
  const createdRecord = await env.DB.prepare(
    `SELECT * FROM payroll_records WHERE id = ?`
  ).bind(result.meta.last_row_id).first();
  
  if (!createdRecord) {
    throw new Error('Failed to create payroll record');
  }
  
  return payrollRecordSchema.parse(createdRecord);
}

// Get payroll records for employee
export async function getPayrollRecordsByEmployee(
  env: any, 
  employeeId: number, 
  limit: number = 12
): Promise<PayrollRecord[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM payroll_records 
     WHERE employee_id = ? 
     ORDER BY year DESC, month DESC 
     LIMIT ?`
  ).bind(employeeId, limit).all();
  
  return results.results?.map(record => {
    try {
      return payrollRecordSchema.parse(record);
    } catch (error) {
      console.error('Payroll record validation error:', error);
      return null;
    }
  }).filter(Boolean) as PayrollRecord[];
}

// Get payroll records for month/year
export async function getPayrollRecordsByMonth(
  env: any, 
  month: number, 
  year: number
): Promise<PayrollRecord[]> {
  const results = await env.DB.prepare(
    `SELECT pr.*, e.full_name, e.employee_id 
     FROM payroll_records pr
     JOIN employees e ON pr.employee_id = e.id
     WHERE pr.month = ? AND pr.year = ?
     ORDER BY e.full_name`
  ).bind(month, year).all();
  
  return results.results?.map(record => {
    try {
      return payrollRecordSchema.parse(record);
    } catch (error) {
      console.error('Payroll record validation error:', error);
      return null;
    }
  }).filter(Boolean) as PayrollRecord[];
}

// Update payroll status
export async function updatePayrollStatus(
  env: any, 
  payrollId: number, 
  status: 'draft' | 'approved' | 'paid' | 'cancelled'
): Promise<boolean> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };
  
  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }
  
  const result = await env.DB.prepare(
    `UPDATE payroll_records SET status = ?, updated_at = ?, paid_at = ?
     WHERE id = ?`
  ).bind(
    updateData.status,
    updateData.updated_at,
    updateData.paid_at || null,
    payrollId
  ).run();
  
  return result.success;
}

// Delete payroll record
export async function deletePayrollRecord(env: any, payrollId: number): Promise<boolean> {
  const result = await env.DB.prepare(
    `DELETE FROM payroll_records WHERE id = ?`
  ).bind(payrollId).run();
  
  return result.success;
}

// Calculate salary breakdown
export function calculateSalaryBreakdown(
  baseSalary: number,
  bonuses: number,
  deductions: number,
  loans: number
): {
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  breakdown: {
    baseSalary: number;
    bonuses: number;
    deductions: number;
    loans: number;
  };
} {
  const grossSalary = baseSalary + bonuses;
  const totalDeductions = deductions + loans;
  const netSalary = grossSalary - totalDeductions;
  
  return {
    grossSalary,
    netSalary,
    totalDeductions,
    breakdown: {
      baseSalary,
      bonuses,
      deductions,
      loans
    }
  };
}