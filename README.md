# CivicLens

**See Your City. Understand Your Community.**  
*Because Understanding Your City Is the First Step Towards Improving It.*

CivicLens is an AI-powered Civic Intelligence and Community Awareness Platform designed for Indian citizens, launching with a flagship pilot in **Bengaluru, Karnataka** and architected for pan-India expansion.

---

## Key Capabilities

- **Explore India Interactive Map** — Powered by MapLibre GL JS and OpenStreetMap/CARTO dark raster tiles with state/city/locality drill-down, category-coded issue markers, project layers, Map/List view, and consent-gated geolocation.
- **3D Smart City Visualization** — Procedural Three.js urban model with `RoomEnvironment` PBR reflections, instanced city skyline, and elevated rapid transit corridor.
- **Locality Intelligence Dashboards** — Dedicated pages per locality/city with coverage indicators, issue analytics (Recharts), local departments, infrastructure overview, and official announcements.
- **5-Step Civic Issue Reporting System** — Category selection, structured description, interactive MapLibre pin picker, validated multi-photo evidence upload, unique Tracking ID generation, and transparent status history timelines.
- **CivicLens AI (Multilingual Civic Assistant)** — Secure server-side `@google/genai` (`gemini-4-hydrogen`) integration supporting English, Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, and Bengali with 7-part structured civic guidance and official portal citations.
- **Government Directory & Development Project Tracker** — Searchable Indian municipal, state, and central authority directory and documented public infrastructure tracker with official source links.
- **Civic Community & Knowledge Hub** — Constructive neighborhood discussions, threaded comments, moderation flags, and multilingual civic governance guides with reading progress and bookmarks.
- **Citizen Dashboard & Protected Administration Console** — Server-enforced RBAC (`citizen`, `moderator`, `content_admin`, `super_admin`), issue verification workflow, content publishing, user role management, and immutable audit logs.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, MapLibre GL JS, Three.js, Recharts, Lucide React, React Router
- **Backend**: Node.js, Express, Zod validation, scrypt password hashing, HMAC-SHA256 Bearer authentication, sliding-window rate limiting
- **AI**: Google Gemini API via server-side `@google/genai` SDK
- **Database**: Atomic local relational store (`data/civiclens-db.json`) for instant zero-credential preview + complete 17-table PostgreSQL / Supabase migration schema (`database/schema.sql`) with Row Level Security (RLS)

---

## Environment Variables

Copy `.env.example` to `.env` for local development (or configure via **Settings > Secrets** in AI Studio):

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
ADMIN_PASSCODE=""
```

- `GEMINI_API_KEY`: Required server-side for **CivicLens AI** (`/api/ai/ask`). Never exposed to browser code.
- `ADMIN_PASSCODE` *(optional)*: Sets a server-verified passcode to unlock the Super Administrator role at `/admin`. If left unset, an authenticated user can claim the one-time first-run Super Administrator role inside `/admin`.

---

## Running Locally

```bash
npm install
npm run dev
```

The Express + Vite server listens on `http://localhost:3000`.

## Building for Production

```bash
npm run build
npm start
```

## PostgreSQL / Supabase Migration

To deploy with an external PostgreSQL or Supabase instance, run `database/schema.sql` against your database. It provisions all 17 relational tables (`users`, `locations`, `civic_issues`, `issue_media`, `issue_updates`, `departments`, `projects`, `project_updates`, `discussions`, `comments`, `reactions`, `notifications`, `knowledge_articles`, `sources`, `ai_conversations`, `ai_messages`, `audit_logs`), indexes, constraints, and Row Level Security policies.

---

## Data Trustworthiness

CivicLens clearly distinguishes four data origins:
1. **Citizen Submitted**
2. **AI Generated**
3. **Independently Verified**
4. **Officially Published or Confirmed**

Sample Bengaluru and pan-India demonstration records are explicitly tagged as **Demonstration Data**, and CivicLens never claims an external government grievance has been filed without a verified official reference.
