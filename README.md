# On-chain Performance Profiler

Lightweight multi-chain performance metrics measurement and visualization system.

**Live Demo**: [https://profiler.tianming.online/](https://profiler.tianming.online/)

## Features

- Collect performance data from Solana, Ethereum, Arbitrum, Base
- Calculate metrics: TPS, block time, confirmation delay
- Real-time dashboard visualization

## Quick Start

### Install Dependencies

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure RPC URLs (optional, defaults are provided):

```bash
cp .env.example .env
```

Edit `.env` to customize RPC endpoints if needed.

### Run

Development mode (starts collector, API, and frontend together):

```bash
npm run dev
```

Or start separately:

```bash
npm run dev:collector
npm run dev:api
npm run dev:dashboard
```

### Build

```bash
npm run build
```

## Project Structure

```
src/
  collector/    Data collection layer
  processor/    Metrics calculation layer
  api/          API service
  dashboard/    Frontend visualization
  config/       Configuration
  types/        Type definitions
```

## Metrics Definition

- **TPS**: Transactions per second, calculated from last 100 blocks
- **Block Time**: Average time between blocks (seconds)
- **Confirmation Delay**: Average time interval between blocks (seconds)

## How It Works

- **Collector**: Continuously collects block data from all chains every 10 seconds and saves to `data/` directory
- **Processor**: Reads block data from files and calculates metrics
- **API**: Serves calculated metrics from processor
- **Dashboard**: Displays metrics with charts, refreshes every 10 seconds

## Local Development

The system uses local file system storage (`data/` directory) for block data. Make sure the collector is running to populate data.

## Deployment

### Local Deployment

Build the project:

```bash
npm run build
```

The built files will be in the `dist/` directory. You can serve them with any static file server:

```bash
npm run preview
```

Or use a simple HTTP server:

```bash
npx serve dist
```

### Production Deployment

The project is configured for Vercel deployment. The production build automatically includes static metrics data for display.

**Live Demo**: [https://profiler.tianming.online/](https://profiler.tianming.online/)

The production version displays a fixed 2-minute snapshot of performance metrics collected locally, providing a pure frontend demonstration without requiring backend services.

