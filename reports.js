import { Hono } from 'hono'

const app = new Hono()

// GET /api/reports/dashboard
app.get('/dashboard', async (c) => {
  try {
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json') || []
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json') || []
    const settings = await c.env.SETTINGS_KV.get('settings', 'json') || {}
    
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    
    const currentMonthPayroll = payroll.filter(p => 
      p.month === currentMonth && p.year === currentYear
    )
    
    const stats = {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'active').length,
      monthlyPayroll: currentMonthPayroll.reduce((sum, p) => sum + p.netSalary, 0),
      growth: settings.companyGrowth || 12.5,
      activeProjects: 8,
    }
    
    return c.json(stats)
  } catch (error) {
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500)
  }
})

// GET /api/reports/payroll-summary
app.get('/payroll-summary', async (c) => {
  try {
    const month = parseInt(c.req.query('month') || new Date().getMonth() + 1)
    const year = parseInt(c.req.query('year') || new Date().getFullYear())
    
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json') || []
    const filteredPayroll = payroll.filter(p => p.month === month && p.year === year)
    
    const summary = {
      month,
      year,
      totalEmployees: filteredPayroll.length,
      totalBasicSalary: filteredPayroll.reduce((sum, p) => sum + p.basicSalary, 0),
      totalAllowances: filteredPayroll.reduce((sum, p) => sum + p.allowances.total, 0),
      totalDeductions: filteredPayroll.reduce((sum, p) => sum + p.deductions.total, 0),
      totalNetSalary: filteredPayroll.reduce((sum, p) => sum + p.netSalary, 0),
      processedCount: filteredPayroll.filter(p => p.status === 'processed').length,
      paidCount: filteredPayroll.filter(p => p.status === 'paid').length,
      calculatedCount: filteredPayroll.filter(p => p.status === 'calculated').length,
    }
    
    return c.json(summary)
  } catch (error) {
    return c.json({ error: 'Failed to fetch payroll summary' }, 500)
  }
})

// GET /api/reports/employee/:id
app.get('/employee/:id', async (c) => {
  try {
    const employeeId = c.req.param('id')
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json') || []
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json') || []
    
    const employee = employees.find(e => e.id === employeeId)
    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404)
    }
    
    const employeePayroll = payroll.filter(p => p.employeeId === employeeId)
    
    const report = {
      employee: {
        id: employee.id,
        name: employee.name,
        employeeId: employee.employeeId,
        department: employee.department,
        position: employee.position,
        hireDate: employee.hireDate,
        status: employee.status,
      },
      payrollHistory: employeePayroll.map(p => ({
        month: p.month,
        year: p.year,
        basicSalary: p.basicSalary,
        netSalary: p.netSalary,
        status: p.status,
      })),
      totalEarnings: employeePayroll.reduce((sum, p) => sum + p.netSalary, 0),
      averageMonthlySalary: employeePayroll.length > 0 
        ? employeePayroll.reduce((sum, p) => sum + p.netSalary, 0) / employeePayroll.length 
        : 0,
    }
    
    return c.json(report)
  } catch (error) {
    return c.json({ error: 'Failed to fetch employee report' }, 500)
  }
})

// GET /api/reports/financial
app.get('/financial', async (c) => {
  try {
    const startDate = c.req.query('start')
    const endDate = c.req.query('end')
    
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json') || []
    const settings = await c.env.SETTINGS_KV.get('settings', 'json') || {}
    
    let filteredPayroll = payroll
    if (startDate && endDate) {
      filteredPayroll = payroll.filter(p => {
        const payrollDate = new Date(p.year, p.month - 1, 1)
        return payrollDate >= new Date(startDate) && payrollDate <= new Date(endDate)
      })
    }
    
    const totalSalaries = filteredPayroll.reduce((sum, p) => sum + p.netSalary, 0)
    const totalTaxes = filteredPayroll.reduce((sum, p) => sum + p.deductions.tax, 0)
    const totalInsurance = filteredPayroll.reduce((sum, p) => sum + p.deductions.insurance, 0)
    
    const report = {
      period: {
        start: startDate,
        end: endDate,
      },
      totalRevenue: settings.monthlyRevenue || 500000,
      totalExpenses: totalSalaries + totalTaxes + totalInsurance,
      totalSalaries,
      totalTaxes,
      totalInsurance,
      netProfit: (settings.monthlyRevenue || 500000) - (totalSalaries + totalTaxes + totalInsurance),
      payrollCount: filteredPayroll.length,
      averageSalary: filteredPayroll.length > 0 ? totalSalaries / filteredPayroll.length : 0,
    }
    
    return c.json(report)
  } catch (error) {
    return c.json({ error: 'Failed to fetch financial report' }, 500)
  }
})

// GET /api/reports/department-analysis
app.get('/department-analysis', async (c) => {
  try {
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json') || []
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json') || []
    
    const departments = {}
    
    employees.forEach(employee => {
      const dept = employee.department
      if (!departments[dept]) {
        departments[dept] = {
          name: dept,
          employees: [],
          totalSalary: 0,
          averageSalary: 0,
        }
      }
      departments[dept].employees.push(employee)
    })
    
    payroll.forEach(p => {
      const employee = employees.find(e => e.id === p.employeeId)
      if (employee && departments[employee.department]) {
        departments[employee.department].totalSalary += p.netSalary
      }
    })
    
    Object.keys(departments).forEach(dept => {
      const department = departments[dept]
      department.averageSalary = department.employees.length > 0 
        ? department.totalSalary / department.employees.length 
        : 0
    })
    
    return c.json(Object.values(departments))
  } catch (error) {
    return c.json({ error: 'Failed to fetch department analysis' }, 500)
  }
})

export default app