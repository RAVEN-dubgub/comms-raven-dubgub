# Cohort Comms Platform â€” RAVEN-dubgub

Hult Cohort Developer Program Â· **Project 2 Â· Internal communications platform**.

**Purpose:** replace Discord as the cohort's primary channel â€” public channels, 1:1 DMs, announcements, in-app notifications, search, and PM deep links.

## Production URL

_Pending first deploy â€” set after Vercel + Neon are wired._

## Quick start

```bash
npm install
cp .env.example .env
# Fill DATABASE_URL + AUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open http://localhost:3000 â†’ **Sign up with the same email as the PM platform**.

### Seed admin (announcements posting)

```bash
# Windows PowerShell
$env:SEED_ADMIN_EMAIL="your@email.com"
$env:SEED_ADMIN_PASSWORD="your-password"
$env:SEED_ADMIN_NAME="Joshua Scotland"
npm run db:seed
```

## Mandatory features shipped

| Requirement | Status |
|-------------|--------|
| â‰¥3 public channels (general, announcements, reviews) | Yes â€” seeded |
| Create / rename / archive channels | Create + archive/rename via API |
| 1:1 DMs | Yes |
| Message persistence | Postgres |
| Announcements (admin-only post) | Yes (`User.role = ADMIN`) |
| Notifications (@mention + DM) | In-app |
| Search | Keyword search API + UI |
| Same email as PM platform | Enforced in signup copy + submission notes |
| PM deep links | Detects `PM_PLATFORM_URL` links in messages |
| Deploy | Vercel (see DEPLOY.md) |

## Architecture

```
Browser (Next.js App Router)
  â†’ API routes (/api/auth, /api/channels, /api/dms, /api/search, /api/notifications)
  â†’ Prisma ORM
  â†’ PostgreSQL (Neon)
```

Polling â‰¤ 4s for new messages (MVP real-time without websockets).

## PM platform integration

- Use **the same email** as [pm-raven-dubgub](https://pm-raven-dubgub.vercel.app) for identity match.
- Set `PM_PLATFORM_URL` so pasted task/dashboard/project URLs unfurl as chips.
- Header link: "Open PM platform".

## Agent usage

Scaffolded and implemented with Cursor agent from Project 1 patterns (JWT auth, Prisma, Vercel).

## Grader smoke test

1. Sign up with PM email â†’ land in `/app`
2. See `#general`, `#announcements`, `#reviews`
3. Post in `#general`
4. Open DM with another user
5. Search a keyword
6. As admin, post in `#announcements`; as member, confirm blocked

