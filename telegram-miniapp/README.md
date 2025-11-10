# AP2 Telegram Mini App

Telegram Mini App with crypto payments using [AP2 Protocol](https://github.com/google-agentic-commerce/AP2).

## Project Structure

This project is part of a monorepo containing:
- **AP2 Protocol Core** (Python) - located in `../../src/ap2/`
- **Telegram Mini App** (TypeScript/React) - this directory

## Quick Start

### Prerequisites

- Node.js ≥20.0.0
- npm ≥10.0.0

### Installation

```bash
npm install
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Lint
npm run lint
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `VITE_BACKEND_URL` - AP2 backend URL (default: http://localhost:8080)
- `VITE_TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather

Feature flags:
- `VITE_FEATURE_A2A_MOCK` - Use mock A2A client for development
- `VITE_FEATURE_CHECKOUT` - Enable checkout flow
- `VITE_FEATURE_CRYPTO_WALLET` - Enable real crypto wallet integration
- `VITE_FEATURE_MOCK_WALLET` - Use mock wallet for testing

## TypeScript Types

AP2 protocol types are manually transpiled from Python Pydantic models:

- Source: `../../src/ap2/types/`
- TypeScript: `./src/types/ap2/`

Types are synchronized manually and include references to Python source files.

## Architecture

This project follows an incremental development approach with:
- Feature flags for progressive feature rollout
- Mock mode for rapid development
- Vertical slices (each iteration = complete feature)
- Regression testing after each change

See [DEVELOPMENT_PLAN.md](../docs/DEVELOPMENT_PLAN.md) for full roadmap.

## Current Status

- ✅ Iteration 0: Infrastructure Setup
- 📋 Iteration 1: Telegram Mini App Shell (planned)
- 📋 Iteration 2: A2A Client Mock Mode (planned)

## Documentation

- [Development Plan](../docs/DEVELOPMENT_PLAN.md) - Full roadmap
- [Tech Stack Analysis](../docs/TECH_STACK_ANALYSIS_REPORT.md) - Technical details
- [Insights](../docs/INSIGHTS.md) - Best practices and learnings
- [Quick Start Guide](../docs/QUICKSTART_DEVELOPMENT.md) - Getting started
- [History](../docs/HISTORY.md) - Development history

## License

Apache License, Version 2.0 (inherited from AP2 Protocol)
