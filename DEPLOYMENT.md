# Deploying & Load-Balancing IdeaBridge

IdeaBridge is designed as a **stateless, horizontally scalable full-stack web application** that runs identically across:
1. **Vercel Edge CDN + Auto-Scaling Serverless Functions** (`/api/index.ts` + `dist/`)
2. **Multi-Core Node.js Cluster** (`npm run start:cluster`) behind an **Nginx / Cloud Load Balancer** (`nginx.conf`, AWS ALB, Cloudflare, or GCP Load Balancer)

---

## Load-Balanced Architecture

- **Stateless Bearer Token Authentication (`server/auth.ts`)**: Sessions use HMAC-SHA256 signed Bearer tokens verified independently by every worker/instance with zero sticky-session requirement. Set the same `SESSION_SECRET` across all nodes in production.
- **Shared Database State (`MONGODB_URI` + `server/models/`)**:
  - `UserModel` — student accounts, skills, portfolio links, points balance
  - `IdeaModel` — marketplace ideas and search index
  - `PointTransactionModel` — points ledger entries (`+10` points per posted idea)
  - `RateLimitModel` — MongoDB TTL-indexed distributed rate-limiter counters shared across all load-balanced nodes
- **Health & Readiness Probes (`GET /healthz`, `GET /api/health`)**: Returns `{ ok: true, status: "healthy", loadBalancedReady: true, workerPid, instanceId, database }` with `Cache-Control: no-store` for automated load-balancer health checks.
- **Upstream Keepalive & Graceful Draining (`server.ts`)**: Configures `keepAliveTimeout = 65000ms` / `headersTimeout = 66000ms` (preventing `502 Bad Gateway` errors behind Nginx/ALB) and drains active HTTP connections cleanly on `SIGTERM`/`SIGINT`.

---

## Option 1: Multi-Core Cluster + Nginx Load Balancer

### 1. Build Static Frontend & Start Multi-Worker Cluster
```bash
npm run build
NODE_ENV=production CLUSTER_WORKERS=4 SESSION_SECRET=<hex-secret> MONGODB_URI=<atlas-uri> npm run start:cluster
```
`server/cluster.ts` spawns worker processes balanced across port `3000` and automatically replaces any crashed worker.

### 2. Run Nginx Reverse Proxy Load Balancer (`nginx.conf`)
The included `nginx.conf` defines an upstream pool (`upstream ideabridge_cluster`) with:
- **`least_conn`** routing across backend nodes
- **Passive failover** (`max_fails=3 fail_timeout=15s`, `proxy_next_upstream error timeout http_502 http_503 http_504`)
- **Health endpoint** (`/healthz`)
- **Gzip compression** and **1-year immutable caching** for `/assets/`
- **`X-Real-IP` / `X-Forwarded-For`** headers consumed by `server/rateLimit.ts`

To scale across multiple servers or containers, list each backend node inside `upstream ideabridge_cluster` in `nginx.conf`:
```nginx
upstream ideabridge_cluster {
  least_conn;
  server 10.0.1.11:3000 max_fails=3 fail_timeout=15s;
  server 10.0.1.12:3000 max_fails=3 fail_timeout=15s;
  keepalive 64;
}
```

---

## Option 2: Vercel Global Edge + Auto-Scaling Serverless

Vercel automatically load-balances static `dist/` assets across its global Anycast Edge Network and horizontally scales `/api/index.ts` across concurrent requests.

### Environment Variables in Vercel
| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes (Production) | MongoDB Atlas SRV string for shared Users, Ideas, Points & distributed rate limits |
| `SESSION_SECRET` | Yes | Shared 64-char hex secret (`openssl rand -hex 32`) across serverless instances |
| `GEMINI_API_KEY` | Optional | Server-side Gemini API key for SIH Unique Ideas & Bridgey AI |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Browser-restricted Google Maps API key for College Profile maps |
| `ADMIN_PASSCODE` | Optional | Server-side passcode to claim admin access for SIH imports |

### Deploy
```bash
npm install -g vercel
vercel login
vercel --prod
```

Verify health on the deployed URL:
```text
GET https://your-app-name.vercel.app/healthz
```
