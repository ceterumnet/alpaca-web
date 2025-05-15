# Build Process Notes

This document outlines environment variables that significantly impact the build and runtime behavior of the application.

## Environment Variables

### `VITE_APP_BASE_PATH`

This variable defines the base path from which the application will be served. This is crucial when the application is hosted in a subdirectory of a domain.

**Example:**

If `VITE_APP_BASE_PATH` is set to `/html/`, the application's assets will be served from `your-domain.com/html/`.

### `VITE_APP_DISCOVERY_MODE`

This variable controls how the application discovers Alpaca devices.

- **`proxied` (default):** Uses the application's built-in discovery proxy server.
- **`direct`:** The application attempts to discover devices by directly querying their `/management/v1/configureddevices` endpoint. This mode bypasses the application's proxy.

## Example Build Command

The following command builds the application to be served from the `/html/` path and enables direct device discovery:

```bash
VITE_APP_BASE_PATH=/html/ VITE_APP_DISCOVERY_MODE=direct npm run build
```
