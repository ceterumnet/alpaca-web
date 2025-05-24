# Image Stretch Concepts for Astrophotography and Diagnostics

This document summarizes the core concepts and mental model for handling image stretching, histogram display, and lookup table (LUT) mapping in scientific/astrophotography image display software.

## 1. Raw Image Data

- **Acquisition:** Images are downloaded from the camera in their native format (e.g., 8-bit, 16-bit, or higher per channel).
- **Immutability:** The raw sensor data is preserved as-is after initial decoding (e.g., after handling Alpaca/ASCOM format quirks).
- **Bit Depth:** The data may have a higher bit depth (e.g., 16 bits) than the display can show.

## 2. Display Mapping

- **Display Limitation:** Computer screens typically display 8 bits per color channel (0–255), so higher bit-depth data must be mapped to this range.
- **LUT (Lookup Table):** A LUT is used to map raw sensor values (e.g., 0–65535 for 16-bit) to display values (0–255).
- **Stretching:** The mapping can be linear, logarithmic, or use windowing (black/white points, gamma, etc.) to enhance faint details or compress dynamic range.
- **User Controls:** Users can adjust black/white points, midtones, gamma, and mapping method to control how the image appears.

## 3. Histograms

- **Raw Histogram:**
  - Shows the distribution of raw sensor values (full bit depth, e.g., 0–65535).
  - Useful for diagnostics and understanding the true data distribution.
- **Display Histogram:**
  - Shows the distribution of display values (after LUT mapping, 0–255).
  - Reflects what the user actually sees on the screen.
- **Overlay:** Both histograms can be shown together for comparison and diagnostics.

## 4. Data Flow and Transformations

- **Raw Data:** Immutable, as received from the camera.
- **LUT Mapping:** Raw values are mapped to display values using the current LUT (based on user stretch settings).
- **Canvas Rendering:** The mapped 8-bit values are rendered to the screen.
- **Histograms:**
  - Raw histogram is calculated from the original data.
  - Display histogram is calculated from the mapped (LUT) data.

## 5. Modes and Controls

- **Auto Stretch:** Sets black/white points based on robust percentiles (ignoring outliers).
- **Manual Stretch:** User sets black/white/mid points and gamma.
- **True Linear:** Maps the full sensor range linearly to display (no windowing, gamma=1.0).

## 6. Diagnostic/Scientific Transparency

- The UI should make it clear:
  - What range is being mapped (LUT arguments: min, max, method, gamma, etc.).
  - The difference between raw and display histograms.
  - That the raw data is never altered—only the mapping changes.

---

**Summary:**

- The raw sensor data is immutable and forms the basis for all processing.
- The LUT and stretch controls determine how this data is mapped to the 8-bit display range.
- Both raw and display histograms are essential for diagnostics and scientific transparency.
- The user should always be able to see and understand how their data is being transformed for display.
