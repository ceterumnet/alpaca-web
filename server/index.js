const express = require('express')
const http = require('http')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')
const AlpacaDiscoveryService = require('./alpacaDiscovery')

const app = express()
const PORT = process.env.PORT || 3000

// Enable CORS
app.use(cors())

// Create discovery service
const discoveryService = new AlpacaDiscoveryService()

// API endpoint to get discovered devices
app.get('/discovery/devices', (req, res) => {
  res.json({
    devices: discoveryService.getDiscoveredDevices()
  })
})

// API endpoint to trigger a discovery broadcast
app.post('/discovery/scan', (req, res) => {
  discoveryService.broadcastDiscovery()
  res.json({ success: true, message: 'Discovery broadcast initiated' })
})

// Dynamic proxy middleware for Alpaca devices
app.use('/proxy/:deviceAddress/:devicePort', (req, res, next) => {
  const { deviceAddress, devicePort } = req.params

  // Create a proxy for this specific device
  const proxy = createProxyMiddleware({
    target: `http://${deviceAddress}:${devicePort}`,
    changeOrigin: true,
    pathRewrite: {
      [`^/proxy/${deviceAddress}/${devicePort}`]: ''
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying request to ${deviceAddress}:${devicePort}: ${req.method} ${req.url}`)
    },
    onError: (err, req, res) => {
      console.error(`Proxy error: ${err.message}`)
      res.status(500).json({ error: 'Proxy error', message: err.message })
    }
  })

  return proxy(req, res, next)
})

// Create HTTP server
const server = http.createServer(app)

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Alpaca Discovery Service active`)
})

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...')
  discoveryService.close()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
