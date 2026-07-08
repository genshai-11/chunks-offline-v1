# Research & Outline: Learner Sentence Timeline

## Design Decisions

### Decision 1: Recharts LineChart for Multi-Series Rendering

- **Chosen**: Recharts `LineChart` with dynamic `<Line>` components.
- **Rationale**: Recharts is already installed in the project (`recharts` version 3.9.2). It provides excellent native React bindings, built-in tooltips, responsive container resizing, and legend support.
- **Alternatives considered**: 
  - Custom SVG Line Chart: Rejected because Recharts handles axes, ticks, tooltips, responsive grid resizing, and legends automatically.
  - ScatterChart (Current): Upgraded to LineChart because scatter dots do not visually show individual student progress trajectories as clearly as continuous lines.

### Decision 2: Curated 10-Color Palette

- **Chosen**: A vibrant, high-contrast palette of 10 tailwind-adjacent colors for the lines to ensure visual clarity.
  - Color 1: `#3b82f6` (Blue)
  - Color 2: `#ef4444` (Red)
  - Color 3: `#10b981` (Emerald)
  - Color 4: `#f59e0b` (Amber)
  - Color 5: `#8b5cf6` (Violet)
  - Color 6: `#ec4899` (Pink)
  - Color 7: `#06b6d4` (Cyan)
  - Color 8: `#f97316` (Orange)
  - Color 9: `#14b8a6` (Teal)
  - Color 10: `#6366f1` (Indigo)
- **Rationale**: These colors are visually distinct in both light and dark backgrounds, providing clear line differentiation for up to 10 players.

### Decision 3: X-Axis Aggregation Mappings

- **Chosen**: X-Axis values will be derived from:
  1. Round Index: formatted as "R1", "R2", etc.
  2. CVR Value: formatted as "Ω[val]".
  3. CCI Standard Card: formatted as "X[val]".
  We will construct the chart data by grouping the filtered response history. Each unique X-axis key (e.g., Round index or Sentence Code) will form a single object in the chart data array.
  Each object will look like:
  ```typescript
  {
    xValue: string | number, // formatted key
    displayLabel: string,     // e.g. "R1 (S01)"
    "Learner Name A": cpdA,
    "Learner Name B": cpdB,
    ...
  }
  ```
  This format matches how Recharts expects data for multiple lines.
- **Rationale**: Recharts supports rendering multiple lines where each line reads a specific key (the learner's name or ID) from the data objects.
