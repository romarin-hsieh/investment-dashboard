# Investment Dashboard

A POC Investment Information Dashboard - A static web application that provides macro economic indicators, stock tracking capabilities, and portfolio management features for a fixed universe of 10 US stocks.

## Features

- **Dashboard**: View macro indicators and stock information grouped by industry
- **Holdings**: Manage watchlist and track portfolio performance with ROI/PnL calculations
- **Settings**: Configure privacy settings, view diagnostics, and import/export data

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **Testing**: Vitest + fast-check for property-based testing
- **Code Quality**: ESLint + Prettier
- **Data Generation**: GitHub Actions workflows
- **Hosting**: GitHub Pages

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
investment-dashboard/
├── public/
│   ├── config/          # Configuration files
│   └── data/           # Generated data files
├── src/
│   ├── components/     # Vue components
│   ├── pages/         # Page components
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript interfaces
├── tests/             # Test files
└── .github/workflows/ # GitHub Actions
```

## Configuration

The application uses static JSON configuration files:

- `/config/universe.json` - List of trackable stock symbols
- `/config/macro_indicators.json` - Macro indicator definitions
- `/config/news_sources.json` - RSS feed configurations
- `/config/wish.json` - External wish channel URL

## Data Generation

GitHub Actions workflows automatically generate data:

- **Hourly**: Stock quotes update
- **Daily**: News collection and brief generation
- **As needed**: Metadata refresh with industry classifications

## Security

- Content Security Policy implemented
- Safe content rendering (textContent only)
- URL scheme validation
- No PII storage in localStorage
- Pinned GitHub Actions by commit SHA

## License

This is a POC project for demonstration purposes.
