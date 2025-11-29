import { Hono } from 'hono'

const app = new Hono()

// GET /api/employees
app.get('/', async (c) => {
  try {
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json')
    return c.json(employees || [])
  } catch (error) {
    return c.json({ error: 'Failed to fetch employees' }, 500)
  }
})

// GET /api/employees/:id
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json')
    const employee = employees?.find(emp => emp.id === id)
    
    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404)
    }
    
    return c.json(employee)
  } catch (error) {
    return c.json({ error: 'Failed to fetch employee' }, 500)
  }
})

// POST /api/employees
app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    
    // Validation
    if (!data.name || !data.email || !data.employeeId) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json') || []
    
    // Check if employee ID already exists
    const existingEmployee = employees.find(emp => emp.employeeId === data.employeeId)
    if (existingEmployee) {
      return c.json({ error: 'Employee ID already exists' }, 400)
    }
    
    const newEmployee = {
      id: crypto.randomUUID(),
      ...data,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    employees.push(newEmployee)
    await c.env.EMPLOYEES_KV.put('employees', JSON.stringify(employees))
    
    return c.json(newEmployee, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create employee' }, 500)
  }
})

// PUT /api/employees/:id
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json') || []
    const employeeIndex = employees.findIndex(emp => emp.id === id)
    
    if (employeeIndex === -1) {
      return c.json({ error: 'Employee not found' }, 404)
    }
    
    employees[employeeIndex] = {
      ...employees[employeeIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    
    await c.env.EMPLOYEES_KV.put('employees', JSON.stringify(employees))
    
    return c.json(employees[employeeIndex])
  } catch (error) {
    return c.json({ error: 'Failed to update employee' }, 500)
  }
})

// DELETE /api/employees/:id
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const employees = await c.env.EMPLOYEES_KV.get('employees', 'json') || []
    const filteredEmployees = employees.filter(emp => emp.id !== id)
    
    if (filteredEmployees.length === employees.length) {
      return c.json({ error: 'Employee not found' }, 404)
    }
    
    await c.env.EMPLOYEES_KV.put('employees', JSON.stringify(filteredEmployees))
    
    return c.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete employee' }, 500)
  }
})

export default app