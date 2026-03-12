// backend/middleware/monitor.js
const os = require('os');

// Track active requests
let activeRequests = 0;
const requestLog = [];

exports.requestMonitor = (req, res, next) => {
  activeRequests++;
  const start = Date.now();
  
  res.on('finish', () => {
    activeRequests--;
    const duration = Date.now() - start;
    
    // Log slow requests (> 2 seconds)
    if (duration > 2000) {
      console.log(`⚠️ Slow request: ${req.method} ${req.url} - ${duration}ms`);
    }
    
    // Store in memory (last 100 requests)
    requestLog.push({
      time: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      active: activeRequests
    });
    
    if (requestLog.length > 100) {
      requestLog.shift();
    }
  });
  
  next();
};

// Health check endpoint
exports.healthCheck = (req, res) => {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    activeRequests,
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB'
    },
    cpu: os.loadavg(),
    recentRequests: requestLog.slice(-10)
  });
};

// Metrics endpoint for monitoring
exports.metrics = (req, res) => {
  res.json({
    activeRequests,
    totalRequests: requestLog.length,
    averageResponseTime: requestLog.length > 0 
      ? Math.round(requestLog.reduce((sum, r) => sum + r.duration, 0) / requestLog.length) 
      : 0,
    statusCodes: requestLog.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {})
  });
};