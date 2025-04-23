/* eslint-env node */
const dgram = require('dgram')

class AlpacaDiscoveryService {
  constructor(port = 32227) {
    // The port parameter is the standard Alpaca discovery port (32227)
    // This is the port we'll send broadcasts TO, not what we listen on
    this.port = port
    this.server = dgram.createSocket('udp4')
    this.discoveredDevices = new Map()
    this.setupServer()
  }

  setupServer() {
    this.server.on('error', (err) => {
      console.error(`Alpaca Discovery server error:\n${err.stack}`)
      this.server.close()
    })

    this.server.on('message', (msg, rinfo) => {
      console.log(`Alpaca Discovery received: ${msg} from ${rinfo.address}:${rinfo.port}`)

      // Parse the discovery message
      try {
        const discoveryMessage = JSON.parse(msg.toString())

        // Check if this is an Alpaca discovery response
        if (discoveryMessage.AlpacaPort) {
          // Store the discovered device
          const deviceKey = `${rinfo.address}:${discoveryMessage.AlpacaPort}`
          this.discoveredDevices.set(deviceKey, {
            address: rinfo.address,
            port: discoveryMessage.AlpacaPort,
            discoveryTime: new Date(),
            ...discoveryMessage
          })
        }
      } catch (error) {
        console.error('Error parsing discovery message:', error)
      }
    })

    this.server.on('listening', () => {
      const address = this.server.address()
      console.log(`Alpaca Discovery client listening on ${address.address}:${address.port}`)

      // Bind to the broadcast address to receive discovery messages
      this.server.setBroadcast(true)
    })

    // Start listening on a random port to receive responses
    // We use port 0 to let the OS assign an available port
    // This way we don't need to be on the standard Alpaca discovery port
    this.server.bind(0)
  }

  broadcastDiscovery() {
    // Create a broadcast message to discover Alpaca devices according to the specification:
    // Bytes 0-14: Fixed ASCII text "alpacadiscovery"
    // Byte 15: ASCII Version number "1" for the current version
    // Bytes 16-63: Reserved for future expansion (empty/zeros)

    // Create a buffer with 64 bytes (filled with zeros by default)
    const messageBuffer = Buffer.alloc(64)

    // Write "alpacadiscovery" to the first 15 bytes
    messageBuffer.write('alpacadiscovery', 0)

    // Write version "1" at byte 15
    messageBuffer.write('1', 15)

    // Send discovery message to the broadcast address on the Alpaca discovery port (32227)
    // We send TO port 32227 but listen on a different port for responses
    this.server.send(messageBuffer, 0, messageBuffer.length, this.port, '255.255.255.255')
    console.log('Sent discovery broadcast to port', this.port)
  }

  getDiscoveredDevices() {
    // Convert Map to Array for easier consumption
    return Array.from(this.discoveredDevices.values())
  }

  close() {
    this.server.close()
  }
}

module.exports = AlpacaDiscoveryService
