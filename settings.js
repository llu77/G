import { Hono } from 'hono'

const app = new Hono()

// GET /api/settings
app.get('/', async (c) => {
  try {
    const settings = await c.env.SETTINGS_KV.get('settings', 'json')
    return c.json(settings || {
      systemName: 'LMM Finance ERP v2',
      defaultLanguage: 'ar',
      timezone: 'Asia/Riyadh',
      dateFormat: 'DD/MM/YYYY',
      companyName: 'LMM Finance',
      payrollDay: 25,
      currency: 'SAR',
      taxRate: 15,
      housingAllowance: 25,
      transportAllowance: 10,
      foodAllowance: 15,
      otherAllowance: 5,
      insuranceDeduction: 10,
      retirementDeduction: 9,
      darkMode: false,
      showDashboardStats: true,
      soundNotifications: true,
      notifyNewEmployees: true,
      notifyPayrollProcessing: true,
      notifyContractExpiry: true,
      notifyHolidays: true,
      twoFactorAuth: false,
      secureLoginOnly: true,
      logUserActivities: true,
      autoBackup: true,
      minPasswordLength: 8,
      passwordExpiryDays: 90,
      requireMixedCase: true,
      requireNumbersSymbols: true,
      backupFrequency: 'daily',
      backupRetention: 30,
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch settings' }, 500)
  }
})

// PUT /api/settings
app.put('/', async (c) => {
  try {
    const { key, value } = await c.req.json()
    
    if (!key) {
      return c.json({ error: 'Key is required' }, 400)
    }
    
    const settings = await c.env.SETTINGS_KV.get('settings', 'json') || {}
    settings[key] = value
    
    await c.env.SETTINGS_KV.put('settings', JSON.stringify(settings))
    
    return c.json({ message: 'Setting updated successfully', settings })
  } catch (error) {
    return c.json({ error: 'Failed to update setting' }, 500)
  }
})

// PUT /api/settings/bulk
app.put('/bulk', async (c) => {
  try {
    const { settings } = await c.req.json()
    
    if (!settings || typeof settings !== 'object') {
      return c.json({ error: 'Settings object is required' }, 400)
    }
    
    const currentSettings = await c.env.SETTINGS_KV.get('settings', 'json') || {}
    const updatedSettings = { ...currentSettings, ...settings }
    
    await c.env.SETTINGS_KV.put('settings', JSON.stringify(updatedSettings))
    
    return c.json({ message: 'Settings updated successfully', settings: updatedSettings })
  } catch (error) {
    return c.json({ error: 'Failed to update settings' }, 500)
  }
})

export default app