# alpaca-web

[![Build Status](https://img.shields.io/github/actions/workflow/status/your-org/alpaca-web/build.yml?branch=main)](https://github.com/your-org/alpaca-web/actions) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

> **A modern, responsive web client for ASCOM Alpaca devices.**

---

## Overview

**alpaca-web** is a Vue 3 + Vite application for discovering, controlling, and monitoring astronomical equipment via the [ASCOM Alpaca](https://ascom-standards.org/) protocol. It provides a user-friendly, responsive interface for a wide range of devices (cameras, telescopes, focusers, filter wheels, domes, and more), supporting both local and networked device discovery.

- **Who is it for?**
  - Astronomers, observatory operators, and hobbyists using ASCOM Alpaca-compatible hardware.
- **What does it do?**
  - Device discovery, control, and monitoring in a browser-based UI.
  - Advanced panel system for flexible, multi-device workflows.
  - Extensible, standards-compliant, and open source.

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [ASCOM Alpaca Integration](#ascom-alpaca-integration)
- [License](#license)
- [Contact & Support](#contact--support)

---

## Features

- **Responsive Panel System:**
  - Adapts to all screen sizes and device capabilities
  - Feature prioritization and collapsible sections
  - Dynamic component resolution
- **ASCOM Alpaca Integration:**
  - Supports cameras, telescopes, focusers, filter wheels, domes, and more
  - Adheres to the Alpaca specification for maximum compatibility
- **Device Discovery:**
  - Local and networked device discovery via a Node.js backend
- **Modern UI/UX:**
  - Consistent design system, dark/light themes, and accessibility focus
- **Extensible Architecture:**
  - Modular codebase for easy addition of new device types and features
- **Robust Logging:**
  - Structured, filterable logs with in-app viewer (see [Logging Strategy](LOGGING.md))
- **Comprehensive Testing:**
  - Strong Unit tests with Vitest

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

```sh
npm install
```

### Development

```sh
npm run dev
```

### Build for Production

```sh
npm run build
```

### Run Unit Tests

```sh
npm run test:unit
```

### Run End-to-End Tests

```sh
npm run test:e2e:dev
```

For more details, see the [Project Setup](#project-structure) and [docs/](docs/) directory.

---

## Usage

1. **Start the development server:**
   ```sh
   npm run dev
   ```
2. **Open your browser:**
   - Visit [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal)
3. **Discover and control devices:**
   - Use the UI to discover Alpaca devices on your network and interact with them

> **Note:** For production deployment or packaging, see the [manual packaging instructions](#building-and-packaging) below or in the original README history.

---

## Project Structure

```
├── src/                # Main application source code
│   ├── api/            # Alpaca protocol clients
│   ├── assets/         # Static assets, design tokens, icons
│   ├── components/     # Vue components (devices, panels, layout, UI)
│   ├── lib/            # Utility libraries
│   ├── plugins/        # Vue plugins (logging, etc.)
│   ├── router/         # Vue Router setup
│   ├── services/       # Device discovery, imaging, etc.
│   ├── stores/         # Pinia stores (state management)
│   ├── types/          # TypeScript types
│   ├── ui/             # UI-specific utilities
│   ├── utils/          # General utilities
│   └── views/          # Top-level views/pages
├── server/             # Node.js discovery server
├── tests/              # Unit and integration tests
├── docs/               # Additional documentation
├── public/             # Static public assets
├── ...
```

---

## Documentation

- **UI Style Consistency Plan:**
  - [UI_STYLE_CONSISTENCY_PLAN.md](UI_STYLE_CONSISTENCY_PLAN.md)
- **Camera Gain/Offset Implementation Details:**
  - [VALUES_VS_INDEX_ALPACA_IMPLEMENTATION_DETAILS.md](VALUES_VS_INDEX_ALPACA_IMPLEMENTATION_DETAILS.md)
- **Logging Strategy:**
  - [LOGGING.md](LOGGING.md)
- **Full API, architecture, and more:**
  - See the [docs/](docs/) directory for in-depth guides

---

## ASCOM Alpaca Integration

**alpaca-web** is built to be fully compatible with the [ASCOM Alpaca](https://ascom-standards.org/) protocol, enabling seamless control of a wide range of astronomical devices. For more on the Alpaca standard, see:

- [ASCOM Alpaca Documentation](https://ascom-standards.org/Alpaca.htm)
- [VALUES_VS_INDEX_ALPACA_IMPLEMENTATION_DETAILS.md](VALUES_VS_INDEX_ALPACA_IMPLEMENTATION_DETAILS.md)

---

## Screenshot

> _Add a screenshot or animated GIF here to showcase the UI._

---

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

---

## Contact & Support

- For bug reports, feature requests, or questions, please use the [GitHub Issues](https://github.com/your-org/alpaca-web/issues) page.
- For general discussion, see the [docs/](docs/) directory or open an issue.
