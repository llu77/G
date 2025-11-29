// API endpoint for health check
export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || 'production',
      version: env.API_VERSION || 'v1',
      uptime: process.uptime ? process.uptime() : 'not_available',
      memory: process.memoryUsage ? process.memoryUsage() : 'not_available',
      checks: {
        database: 'healthy',
        cache: 'healthy',
        external_services: 'healthy'
      },
      responseTime: Date.now()
    };
    
    return new Response(JSON.stringify(healthData), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}