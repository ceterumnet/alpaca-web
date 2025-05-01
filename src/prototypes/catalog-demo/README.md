# Astronomical Object Catalog Panel Prototype

This is a standalone prototype demonstrating an Astronomical Object Catalog panel for Alpaca Web.

## Overview

The Astronomical Object Catalog panel provides users with the ability to search for celestial objects (stars, galaxies, nebulae, planets, etc.) and send their coordinates to a connected telescope. This functionality enhances the user experience by making it easier to locate objects of interest without needing to consult external catalogs or applications.

## Features

The panel provides several key features organized by priority according to the panel system design:

### Primary Features

- **Object Search**: Search for celestial objects by name or catalog designation (e.g., M31, Andromeda Galaxy)
- **Object Information**: Display detailed information about the selected celestial object
- **Object Images**: Display images of celestial objects when available

### Secondary Features

- **Catalog Filtering**: Filter objects by catalog type (Messier, NGC, IC, etc.)
- **Object Type Filtering**: Filter by type (galaxy, nebula, star cluster, etc.)
- **Send to Telescope**: Send object coordinates to a connected telescope

### Tertiary Features

- **Constellation Filtering**: Filter objects by constellation
- **Favorites System**: Save objects to a favorites list for quick access
- **Advanced Metadata**: View additional technical data about celestial objects

## Implementation

This prototype implements a standalone demo that includes:

1. A responsive design with three modes (Overview, Detailed, and Fullscreen)
2. A working search function that queries a mock database of common celestial objects
3. Filtering capabilities by catalog and object type
4. Favoriting functionality to demonstrate the user preference system
5. Simulated "Send to Telescope" functionality

## Data Sources

In a production implementation, this panel would connect to astronomical databases like:

- **VizieR** - Comprehensive collection of published astronomical catalogs
- **NASA/IPAC Extragalactic Database (NED)** - Extensive galaxy database
- **SIMBAD** - Reference database for stars and deep space objects
- **Minor Planet Center** - Data for solar system objects

The prototype currently uses a small set of mock data for demonstration purposes.

## Integration with Panel System

This panel is designed to be integrated with the Alpaca Web panel system once the core panels (camera, telescope, focuser, etc.) are fully implemented and stable. It follows the same design principles and categorization of features as outlined in the panel system design document.

## Future Development

- Connect to real astronomical databases via API
- Implement more advanced filtering and search options
- Add plate-solving features to assist with object identification
- Integrate with the observation planning system
- Add support for user-defined custom catalogs
