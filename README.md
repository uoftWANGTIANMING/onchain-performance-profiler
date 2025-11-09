# On-chain Performance Profiler

Lightweight multi-chain performance metrics measurement and visualization system.

## Features

- Collect performance data from Solana, Ethereum, Arbitrum, Base
- Calculate metrics: TPS, block time, confirmation delay
- Real-time dashboard visualization

## Quick Start

### Install Dependencies

```bash
npm install
```

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

## Deploy to Vercel

1. Merge collector and api into serverless functions
2. Build frontend with Vite and deploy to Vercel
3. Use Supabase or Vercel KV for data storage

