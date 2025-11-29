interface Env {
  DB: D1Database;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  salary: number;
  role: string;
  hireDate: string;
  branchId: string;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  month: number;
  year: number;
  status: 'pending' | 'generated' | 'paid';
  generatedAt: string;
  branchId: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { month, year, branchId } = await context.request.json();
    
    // Validate time lock (only days 28-31)
    const today = new Date();
    const dayOfMonth = today.getDate();
    if (dayOfMonth < 28 || dayOfMonth > 31) {
      return new Response(
        JSON.stringify({ 
          error: 'Payroll generation is only available on days 28-31 of the month' 
        }), 
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const db = context.env.DB;

    // Check if payroll already exists for this month/year
    const existingPayroll = await db.prepare(
      'SELECT id FROM payroll_records WHERE month = ? AND year = ? AND branch_id = ?'
    ).bind(month, year, branchId).first();

    if (existingPayroll) {
      return new Response(
        JSON.stringify({ 
          error: 'Payroll already exists for this month' 
        }), 
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all active employees for the branch
    const employees = await db.prepare(
      'SELECT * FROM employees WHERE branch_id = ? AND status = ?'
    ).bind(branchId, 'active').all<Employee>();

    const payrollRecords: PayrollRecord[] = [];
    const generatedAt = new Date().toISOString();

    // Process each employee
    for (const employee of employees.results) {
      // Calculate bonus based on performance (simplified logic)
      const bonus = await calculateEmployeeBonus(db, employee.id, month, year);
      
      // Calculate deductions (simplified - can be expanded)
      const deductions = calculateDeductions(employee.salary);
      
      // Calculate net salary
      const netSalary = employee.salary + bonus - deductions;

      // Create payroll record
      const payrollId = crypto.randomUUID();
      const payrollRecord: PayrollRecord = {
        id: payrollId,
        employeeId: employee.id,
        employeeName: employee.name,
        basicSalary: employee.salary,
        bonus,
        deductions,
        netSalary,
        month,
        year,
        status: 'generated',
        generatedAt,
        branchId
      };

      // Insert into database
      await db.prepare(`
        INSERT INTO payroll_records 
        (id, employee_id, employee_name, basic_salary, bonus, deductions, net_salary, month, year, status, generated_at, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        payrollId,
        employee.id,
        employee.name,
        employee.salary,
        bonus,
        deductions,
        netSalary,
        month,
        year,
        'generated',
        generatedAt,
        branchId
      ).run();

      payrollRecords.push(payrollRecord);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payrollRecords,
        generatedCount: payrollRecords.length 
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Payroll generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate payroll' 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function calculateEmployeeBonus(db: D1Database, employeeId: string, month: number, year: number): Promise<number> {
  try {
    // Get employee performance metrics
    const performance = await db.prepare(`
      SELECT 
        COUNT(DISTINCT sa.id) as attendance_days,
        AVG(pr.performance_score) as avg_performance,
        COUNT(DISTINCT ac.id) as achievements
      FROM employees e
      LEFT JOIN staff_attendance sa ON e.id = sa.employee_id 
        AND MONTH(sa.date) = ? AND YEAR(sa.date) = ?
      LEFT JOIN performance_reviews pr ON e.id = pr.employee_id 
        AND MONTH(pr.review_date) = ? AND YEAR(pr.review_date) = ?
      LEFT JOIN achievements ac ON e.id = ac.employee_id 
        AND MONTH(ac.achievement_date) = ? AND YEAR(ac.achievement_date) = ?
      WHERE e.id = ?
    `).bind(month, year, month, year, month, year, employeeId).first();

    const { attendance_days = 0, avg_performance = 0, achievements = 0 } = performance || {};
    
    // Calculate performance score (0-100)
    const attendanceScore = Math.min((attendance_days / 22) * 40, 40); // 40% weight
    const performanceScore = Math.min((avg_performance || 0) * 0.5, 40); // 40% weight
    const achievementScore = Math.min(achievements * 5, 20); // 20% weight
    
    const totalScore = attendanceScore + performanceScore + achievementScore;
    
    // Determine bonus tier and amount
    if (totalScore >= 90) return 2000; // Diamond tier
    if (totalScore >= 80) return 1500; // Gold tier
    if (totalScore >= 70) return 1000; // Silver tier
    if (totalScore >= 60) return 500;  // Bronze tier
    return 0; // No bonus
    
  } catch (error) {
    console.error('Bonus calculation error:', error);
    return 0;
  }
}

function calculateDeductions(basicSalary: number): number {
  // Simplified deduction calculation
  // Can be expanded to include:
  // - Social insurance (9% of basic salary)
  // - Health insurance (5% of basic salary)
  // - Tax deductions based on salary brackets
  // - Loan deductions
  // - Absence penalties
  
  const socialInsurance = basicSalary * 0.09; // 9%
  const healthInsurance = basicSalary * 0.05; // 5%
  
  return Math.round(socialInsurance + healthInsurance);
}