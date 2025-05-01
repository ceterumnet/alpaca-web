# alpaca-web

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Cypress](https://www.cypress.io/)

```sh
npm run test:e2e:dev
```

This runs the end-to-end tests against the Vite development server.
It is much faster than the production build.

But it's still recommended to test the production build with `test:e2e` before deploying (e.g. in CI environments):

```sh
npm run build
npm run test:e2e
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Project Structure

The project consists of two main components:

1. **Vue Web Application**: The frontend application built with Vue 3 and Vite
2. **Discovery Server**: A Node.js server located in the `server/` directory that provides discovery functionality

## Building and Packaging

### GitHub Actions

This project uses GitHub Actions for continuous integration and deployment:

1. **Build Workflow**: Runs on every push to main and pull requests, checking build and tests
2. **Server Workflow**: Runs on changes to server files, checking the server's functionality
3. **Release Workflow**: Creates distribution packages when a new tag is pushed

### Creating a Release

To create a new release:

1. Update the version in `package.json`
2. Create and push a new tag:
   ```sh
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions will automatically build the project and create a release with distribution packages

### Manual Packaging

To manually create a distribution package:

1. Build the web application:

   ```sh
   npm run build
   ```

2. Create a distribution folder:

   ```sh
   mkdir -p dist-package
   cp -r dist/* dist-package/
   mkdir -p dist-package/server
   cp server/{package.json,package-lock.json,index.js,alpacaDiscovery.js} dist-package/server/
   cp README.md dist-package/
   ```

3. Create startup scripts:

   ```sh
   echo '#!/bin/bash
   cd server && npm i --production && node index.js' > dist-package/start.sh
   chmod +x dist-package/start.sh

   echo '@echo off
   cd server && npm i --production && node index.js' > dist-package/start.bat
   ```

4. Create a zip or tar archive:
   ```sh
   cd dist-package
   zip -r ../alpaca-web-v1.0.0.zip .
   # or
   tar -czf ../alpaca-web-v1.0.0.tar.gz .
   ```

## Features

### Responsive Panel System

The application includes a responsive panel system that adapts to different screen sizes and device capabilities. The system provides:

- Responsive layout that adapts to available space
- Feature prioritization based on screen size
- Collapsible sections for related settings
- Dynamic component resolution

For more information, see the [Responsive Panels Documentation](docs/ResponsivePanels.md).

### ASCOM Alpaca Integration

This application provides a user-friendly interface for controlling astronomical equipment through the ASCOM Alpaca protocol. It supports various device types including:

- Cameras
- Telescopes
- Focusers
- Filter Wheels
- Domes
- And more...
