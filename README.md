# K-LMS (Coursera-Style Learning Platform)

Production-ready LMS monorepo with:
- Next.js 14 frontend (App Router + Tailwind)
- Node.js + Express backend REST API
- MySQL schema/migrations compatible with Aiven MySQL
- JWT access + refresh token auth
- Strict sequential video unlock logic

## Architecture

- `frontend/` : Next.js 14 app
- `backend/` : Express REST API under `/api`
- `backend/migrations/` : SQL migrations

## Features Implemented

- User registration/login/logout
- JWT Access Token (15m by default)
- Refresh token in HTTP-only cookie (30d), revocable and hashed in DB
- Subject listing and subject detail
- Subject enrollment
- Subject tree endpoint with section/video hierarchy
- Per-video lock/completion flags
- Strict unlock sequencing by section order then video order
- Video progress tracking (`last_position_seconds`, completion, timestamps)
- Resume playback from last saved position
- Auto complete on video end + auto-advance to next unlocked video
- Subject progress summary endpoints
- Health endpoint for deployment checks

## Folder Structure

```text
backend/
  migrations/
    001_initial_schema.sql
  src/
    app.js
    server.js
    config/
      db.js
      env.js
    middleware/
      authMiddleware.js
      errorHandler.js
    modules/
      auth/
        auth.routes.js
        auth.service.js
      progress/
        progress.routes.js
        progress.service.js
      sections/
      subjects/
        subjects.routes.js
        subjects.service.js
      users/
      videos/
        unlock.service.js
        videos.routes.js
        videos.service.js
    routes/
      index.js
    utils/
      crypto.js
      errors.js
      jwt.js
      runMigrations.js

frontend/
  app/
    login/page.tsx
    register/page.tsx
    subjects/
      page.tsx
      [subjectId]/
        page.tsx
        video/[videoId]/page.tsx
    profile/page.tsx
    progress/page.tsx
    layout.tsx
    page.tsx
  components/
    ProgressBar.tsx
    Sidebar.tsx
    VideoPlayer.tsx
  lib/
    apiClient.ts
    authStore.ts
  styles/
    globals.css
```

## Backend API

Base path: `/api`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Subjects
- `GET /api/subjects`
- `GET /api/subjects/:subjectId`
- `GET /api/subjects/:subjectId/tree` (auth)
- `POST /api/subjects/:subjectId/enroll` (auth)
- `GET /api/subjects/:subjectId/first-video` (auth)

### Videos
- `GET /api/videos/:videoId` (auth)

### Progress
- `GET /api/progress/subjects/:subjectId` (auth)
- `GET /api/progress/videos/:videoId` (auth)
- `POST /api/progress/videos/:videoId` (auth)

### Health
- `GET /api/health` -> `{ "status": "ok" }`

## Unlock Logic

Global ordering within a subject uses:
1. `sections.order_index ASC`
2. `videos.order_index ASC`

A video is unlocked if:
1. It is the first video in global order, or
2. The previous global video is completed

If locked, backend returns reason: `Complete the previous video to unlock this content.`

## Environment Variables

### Backend (`backend/.env`)
Use `backend/.env.example` as template.

Required:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_ORIGIN`

Example Aiven value:

```env
DATABASE_URL=mysql://avnadmin:YOUR_PASSWORD@mysql-1d11440d-movieland.i.aivencloud.com:17674/defaultdb?ssl-mode=REQUIRED
DB_SSL=true
```

### Frontend (`frontend/.env.local`)
Use `frontend/.env.example` as template.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

## Local Setup

### 1) Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Configure env files

- Create `backend/.env` from `backend/.env.example`
- Create `frontend/.env.local` from `frontend/.env.example`

### 3) Run backend migrations + API

```bash
cd backend
npm run migrate
npm run dev
```

If `AUTO_RUN_MIGRATIONS=true`, server startup also checks/applies migrations.

### 4) Run frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Deployment (Vercel)

Deploy as **two Vercel projects**:
1. Backend project rooted at `backend/`
2. Frontend project rooted at `frontend/`

### 1) Deploy Backend to Vercel

1. In Vercel, click **Add New Project**.
2. Select this repo and set **Root Directory** to `backend`.
3. Keep framework as **Other**.
4. Add environment variables:
  - `NODE_ENV=production`
  - `DATABASE_URL=mysql://avnadmin:<password>@mysql-1d11440d-movieland.i.aivencloud.com:17674/defaultdb?ssl-mode=REQUIRED`
  - `DB_SSL=true`
  - `JWT_ACCESS_SECRET=<strong-secret>`
  - `JWT_REFRESH_SECRET=<strong-secret>`
  - `JWT_ACCESS_EXPIRES_IN=15m`
  - `JWT_REFRESH_EXPIRES_IN=30d`
  - `REFRESH_COOKIE_NAME=refresh_token`
  - `REFRESH_COOKIE_SECURE=true`
  - `AUTO_RUN_MIGRATIONS=false`
  - `FRONTEND_ORIGIN=https://<your-frontend-project>.vercel.app`
5. Deploy.

Backend Vercel routing is handled by `backend/vercel.json`, and API remains under `/api/*`.

Health check URL:
- `https://<your-backend-project>.vercel.app/api/health`

### 2) Run Migrations for Production Database

Run once from your machine (or CI):

```bash
cd backend
npm install
npm run migrate
npm run seed
```

### 3) Deploy Frontend to Vercel

1. In Vercel, click **Add New Project**.
2. Select this repo and set **Root Directory** to `frontend`.
3. Framework preset: **Next.js**.
4. Add env var:
  - `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-project>.vercel.app/api`
5. Deploy.

### 4) Final CORS Update

After frontend deploy, copy the exact frontend URL and update backend env:
- `FRONTEND_ORIGIN=https://<your-frontend-project>.vercel.app`

Redeploy backend after this update.

### Aiven MySQL

1. Keep SSL required (`ssl-mode=REQUIRED` in URI + `DB_SSL=true`).
2. Confirm inbound network access from backend host.
3. Run migrations once per environment.

## Security Notes

- Passwords hashed with `bcrypt`.
- Refresh tokens stored hashed (`sha256`) and revocable.
- Access tokens short-lived by design.
- Refresh tokens in HTTP-only cookie.
- CORS restricted to configured frontend domain.

## Recommended Next Improvements

- Add rate limiting and brute-force protection for auth routes.
- Add email verification and password reset flow.
- Add integration tests for unlock/progress edge cases.
- Add admin dashboard for content management.
