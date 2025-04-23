# Alpaca Web Server

This is the server component for the Alpaca Web UI project. It provides two main functionalities:

1. **UDP Discovery Client** - Implements ASCOM Alpaca's discovery protocol to find Alpaca devices on the local network.
2. **Proxy Server** - Addresses CORS issues by proxying requests from the frontend to Alpaca devices.

## Port Configuration

- **Express Server**: Runs on port 3000 - this is the server that the frontend communicates with
- **Alpaca Discovery**: Uses port 32227 (the standard Alpaca discovery port) for sending discovery broadcasts, but listens on a random port for responses

## Setup

```bash
# Install dependencies
npm install

# Start the server
npm start

# Start the server with auto-reload (development)
npm run dev
```

## How It Works

### UDP Discovery

The discovery service operates as a client only - it broadcasts discovery messages over UDP on port 32227 (the standard Alpaca discovery port) and listens for responses from actual Alpaca devices. It does not make itself discoverable. This implementation:

- Sends discovery broadcasts to find Alpaca devices
- Listens for responses from devices
- Maintains a list of discovered devices

### CORS Proxy

The server acts as a proxy between the frontend and discovered Alpaca devices. This solves CORS issues that would otherwise prevent direct communication from the browser to various Alpaca devices.

The proxy routes are dynamically created based on discovered devices.

## API Endpoints

- `GET /discovery/devices` - Get a list of all discovered devices
- `POST /discovery/scan` - Trigger a discovery broadcast
- `GET /proxy/:deviceAddress/:devicePort/*` - Proxy requests to a specific Alpaca device

## Development

The server is built with Node.js and Express. To modify it:

1. Edit the server code as needed
2. Run with `npm run dev` for auto-reload during development
3. Test with the Alpaca Web UI frontend

## Integration with Frontend

The frontend communicates with this server to:

1. Trigger discovery of Alpaca devices on the network
2. Get the list of discovered devices
3. Connect to and interact with discovered devices through the proxy
