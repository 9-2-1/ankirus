# Ankirus New UI

A modern React-based UI for Ankirus card visualization, featuring TreeMap visualization using D3.js.

## Features

- **TreeMap Visualization**: Visualize card retention rates using hierarchical TreeMap
- **Responsive Design**: Adaptive layout for wide and narrow screens
- **Interactive Preview**: Click TreeMap blocks to view card details
- **Retention-based Coloring**: Color coding based on FSRS retention rates
- **Group Hierarchy**: Support for nested card groups (e.g., "Math::LinearAlgebra::Matrix")

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd web_new
npm install
```

### Development Server

```bash
npm run dev
```

This starts the Vite development server with proxy to the Python backend at `http://localhost:24032`.

### Build

```bash
npm run build
```

## Architecture

### Components

- `App` - Main application component
- `Layout` - Responsive layout manager
- `TreeMap` - D3.js-based TreeMap visualization
- `CardPreview` - Card details display

### Hooks

- `useCardData` - Fetch card data from API
- `useTreeMap` - Calculate TreeMap layout using D3
- `useResponsive` - Screen size detection

### Data Flow

1. Fetch card data from `/cards/` API endpoint
2. Parse hierarchical group structure
3. Calculate TreeMap layout using D3 hierarchy
4. Render interactive visualization
5. Handle user interactions for card preview

## Integration with Backend

The new UI connects to the existing Python backend via:

- API endpoint: `/cards/` (serves card data with group markers)
- Proxy configuration in `vite.config.ts`

## File Structure

```
web_new/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── styles/         # CSS styles
├── index.html
└── package.json
```
