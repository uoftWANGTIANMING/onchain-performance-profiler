# Deployment Guide

This guide explains how to deploy the On-chain Performance Profiler to Vercel.

## Prerequisites

- Vercel account
- GitHub repository (optional, but recommended)
- Node.js 18+ installed locally

## Deployment Steps

### 1. Prepare Environment Variables

Before deploying, you need to set up environment variables in Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
ETHEREUM_RPC_URL=https://eth.llamarpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BASE_RPC_URL=https://mainnet.base.org
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NODE_ENV=production
```

### 2. Deploy via Vercel CLI

Install Vercel CLI:

```bash
npm i -g vercel
```

Login to Vercel:

```bash
vercel login
```

Deploy:

```bash
vercel
```

Follow the prompts to link your project and deploy.

### 3. Deploy via GitHub Integration

1. Push your code to GitHub
2. Import your repository in Vercel dashboard
3. Vercel will automatically detect the project settings
4. Add environment variables in project settings
5. Deploy

### 4. Configure Build Settings

Vercel will automatically detect:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 5. API Routes

The API routes are configured as serverless functions:
- `/api/*` routes are handled by `api/index.ts`
- Functions have 1024MB memory and 30s timeout

### 6. Data Storage

**Note**: The current implementation uses local file system (`data/` directory), which is not persistent on Vercel serverless functions.

For production deployment, consider:
- **Supabase**: PostgreSQL database for storing block data
- **Vercel KV**: Redis-compatible key-value store
- **Upstash**: Serverless Redis

### 7. Collector Service

The collector runs continuously in development but needs to be adapted for serverless:

**Option A: Vercel Cron Jobs**
- Create `vercel.json` cron configuration
- Run collector as scheduled function

**Option B: External Service**
- Deploy collector separately (e.g., Railway, Render)
- Or use a dedicated RPC service with built-in indexing

### 8. Post-Deployment

After deployment:

1. Verify API endpoints:
   - `https://your-project.vercel.app/api/health`
   - `https://your-project.vercel.app/api/metrics`

2. Check frontend:
   - `https://your-project.vercel.app`

3. Monitor function logs in Vercel dashboard

## Troubleshooting

### Build Errors

- Ensure all dependencies are in `package.json`
- Check Node.js version (18+)
- Verify TypeScript compilation passes

### Runtime Errors

- Check environment variables are set correctly
- Verify RPC URLs are accessible
- Check function logs in Vercel dashboard

### API Timeout

- Increase function timeout in `vercel.json`
- Optimize data processing logic
- Consider caching strategies

## Production Considerations

1. **Data Persistence**: Implement database storage instead of file system
2. **Rate Limiting**: Adjust rate limits based on usage
3. **Caching**: Configure CDN caching for static assets
4. **Monitoring**: Set up error tracking (e.g., Sentry)
5. **Collector**: Deploy collector as separate service or cron job

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | `https://eth.llamarpc.com` |
| `ARBITRUM_RPC_URL` | Arbitrum RPC endpoint | `https://arb1.arbitrum.io/rpc` |
| `BASE_RPC_URL` | Base RPC endpoint | `https://mainnet.base.org` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |

