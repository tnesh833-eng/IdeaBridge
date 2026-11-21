# Deploying IdeaBridge (Serverless Express + MongoDB + Firebase Auth + Vercel)

IdeaBridge compiles its client frontend into static HTML, CSS, and JavaScript (`dist/`) while serving all RESTful Express APIs (`/api/*`) as a Node.js **Vercel Serverless Function** (`/api/index.ts`).

---

## Architecture Overview

- **Frontend (Static HTML/CSS/JS)**: Built with `npm run build` into `dist/` and served from Vercel's global CDN.
- **Backend RESTful APIs (Express Serverless)**: Defined in `server/app.ts` and exposed through `api/index.ts` via `vercel.json` rewrites (`/api/(.*) -> /api/index.ts`).
- **Database (MongoDB + Mongoose)**:
  - `server/models/User.ts` (`UserModel`) — profiles, skills, bio/portfolio links, resume metadata, points balance.
  - `server/models/Idea.ts` (`IdeaModel`) — student project ideas with domain, difficulty, and tech stack.
  - `server/models/PointTransaction.ts` (`PointTransactionModel`) — points ledger entries (`+10` points when posting ideas, unlocks, bonuses).
  - `server/mongo.ts` — caches the Mongoose connection in `globalThis` across warm Vercel Serverless invocations (`bufferCommands: false`).
- **Authentication (Firebase Auth)**:
  - Client authenticates via Firebase Auth SDK (`src/firebase.ts`, `signInWithPopup` with Google).
  - Express backend verifies Firebase ID tokens server-side using `firebase-admin/auth` (`server/firebaseAuth.ts`) and exchanges them at `POST /api/auth/firebase`.

---

## Step 1: Set Up MongoDB Atlas

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create a database user with read/write access to your `ideabridge` database.
3. Under **Network Access**, allow connections from Vercel's dynamic serverless IPs (`0.0.0.0/0`, or use Atlas Private Endpoints on paid tiers).
4. Copy your SRV connection string (`MONGODB_URI`), including the database name:
   ```text
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ideabridge?retryWrites=true&w=majority
   ```

---

## Step 2: Configure Firebase Authentication

1. Open the [Firebase Console](https://console.firebase.google.com/) for project `ideabridge-dfa51`.
2. Go to **Build → Authentication → Sign-in method**:
   - Ensure **Google** is enabled.
   - *(Optional)* Enable **Email/Password** if you want Firebase-managed email accounts in addition to the Express email auth endpoint.
3. Go to **Build → Authentication → Settings → Authorized domains** and add your deployed Vercel domain(s), e.g.:
   - `your-app-name.vercel.app`
   - Any custom domain you attach in Vercel.

---

## Step 3: Configure Environment Variables in Vercel

In your Vercel project dashboard (**Settings → Environment Variables**), add:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes (Production) | MongoDB Atlas SRV connection string used by `server/mongo.ts` |
| `FIREBASE_PROJECT_ID` | Yes | `ideabridge-dfa51` (used by `firebase-admin/auth` to verify ID tokens) |
| `SESSION_SECRET` | Yes | Strong random string (`openssl rand -hex 32`) for email auth HMAC tokens |
| `GEMINI_API_KEY` | Optional | Server-side Gemini API key for SIH Unique Ideas & Bridgey AI |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Browser-restricted Google Maps API key for College Profile maps |
| `ADMIN_PASSCODE` | Optional | Passcode required to claim admin access for SIH spreadsheet imports |

> Never put secrets in client-side `VITE_*` variables (except public browser-scoped keys like `VITE_GOOGLE_MAPS_API_KEY`).

---

## Step 4: Deploy Frontend & Serverless Backend to Vercel

The included `vercel.json` handles both the static frontend build and Express serverless routing automatically:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Option A: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B: Deploy via GitHub Integration
1. Push this repository to GitHub.
2. In Vercel, click **Add New → Project** and import the repository.
3. Leave **Framework Preset** as **Vite** (`Build Command: npm run build`, `Output Directory: dist`).
4. Add the Environment Variables from Step 3 and click **Deploy**.

---

## Step 5: Verify Production Deployment

After deploying, visit:
```text
https://your-app-name.vercel.app/api/health
```
You should see:
```json
{
  "ok": true,
  "stage": 1,
  "database": "mongodb",
  "firebaseAuth": true,
  "serverlessReady": true
}
```
Sign in with **Continue with Google**, post a project idea, and open **Profile → Points Balance** to confirm `+10` points are persisted in MongoDB and returned by `GET /api/points`.
