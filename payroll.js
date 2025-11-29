import { Hono } from 'hono'

const app = new Hono()

// GET /api/payroll
app.get('/', async (c) => {
  try {
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json')
    return c.json(payroll || [])
  } catch (error) {
    return c.json({ error: 'Failed to fetch payroll' }, 500)
  }
})

// POST /api/payroll/calculate
app.post('/calculate', async (c) => {
  try {
    const { employeeId, month, year } = await c.req.json()
    
    if (!employeeId || !month || !year) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Get employee data
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json')
    const employee = employees?.find(emp => emp.id === employeeId)
    
    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404)
    }
    
    // Get settings
    const settings = await c.env.SETTINGS_KV.get('settings', 'json') || {}
    
    // Calculate payroll
    const basicSalary = employee.basicSalary || 0
    const taxRate = settings?.taxRate || 15
    const insuranceRate = settings?.insuranceDeduction || 10
    
    // Calculate allowances
    const housingAllowance = basicSalary * (settings?.housingAllowance || 25) / 100
    const transportAllowance = basicSalary * (settings?.transportAllowance || 10) / 100
    const foodAllowance = basicSalary * (settings?.foodAllowance || 15) / 100
    const otherAllowance = basicSalary * (settings?.otherAllowance || 5) / 100
    
    const totalAllowances = housingAllowance + transportAllowance + foodAllowance + otherAllowance
    
    // Calculate deductions
    const tax = basicSalary * taxRate / 100
    const insurance = basicSalary * insuranceRate / 100
    const totalDeductions = tax + insurance
    
    // Calculate net salary
    const netSalary = basicSalary + totalAllowances - totalDeductions
    
    const payrollRecord = {
      id: crypto.randomUUID(),
      employeeId,
      employeeName: employee.name,
      employeeIdNumber: employee.employeeId,
      department: employee.department,
      position: employee.position,
      month,
      year,
      basicSalary,
      allowances: {
        housing: housingAllowance,
        transport: transportAllowance,
        food: foodAllowance,
        other: otherAllowance,
        total: totalAllowances,
      },
      deductions: {
        tax,
        insurance,
        total: totalDeductions,
      },
      netSalary,
      status: 'calculated',
      calculatedAt: new Date().toISOString(),
      processedAt: null,
      paidAt: null,
    }
    
    // Save payroll record
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json') || []
    payroll.push(payrollRecord)
    await c.env.PAYROLL_KV.put('payroll', JSON.stringify(payroll))
    
    return c.json(payrollRecord, 201)
  } catch (error) {
    return c.json({ error: 'Failed to calculate payroll' }, 500)
  }
})

// POST /api/payroll/:id/process
app.post('/:id/process', async (c) => {
  try {
    const id = c.req.param('id')
    const payroll = await c.env.PAYROLL_KV.get('payroll', 'json') || []
    
    const payrollIndex = payroll.findIndex(p => p.id === id)
    if (payrollIndex === -1) {
      return c.json({ error: 'Payroll record not found' }, 404)
    }
    
    if (payroll[payrollIndex].status !== 'calculated') {
      return c.json({ error: 'Payroll record cannot be processed' }, 400)
    }
    
    payroll[payrollIndex] = {
      ...payroll[payrollIndex],
      status: 'processed',
      processedAt: new Date().toISOString(),
    }
    
    await c.env.PAYROLL_KV.put('payroll', JSON.stringify(payroll))
    
    return c.json(payroll[payrollIndex])
  } catch (error) {
    return c.json({ error: 'Failed to process payroll' }, 500)
  }
})

// GET /api/payroll/summary
app.get('/summary', async (c) => {
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

export default app