# Reviewer guide — Cohort Comms Platform

**Production:** https://comms-raven-dubgub.vercel.app  
**Time budget:** ~5 minutes

## Demo access

1. Open https://comms-raven-dubgub.vercel.app
2. **Sign up** with the **same email** you use on the [PM platform](https://pm-raven-dubgub.vercel.app) (identity alignment is part of the brief).
3. Or log in if you already have an account.

Local seed (optional admin for `#announcements`):

```bash
cp .env.example .env
npx prisma migrate dev --name init
$env:SEED_ADMIN_EMAIL="your@email.com"
$env:SEED_ADMIN_PASSWORD="your-password"
npm run db:seed
npm run dev
```

## 5-minute smoke checklist

1. Sign up / log in → land in `/app`.
2. Confirm seeded channels: `#general`, `#announcements`, `#reviews`.
3. Post a message in `#general` → appears after poll (≤4s).
4. Open a **DM** with another user → send a message both ways.
5. **Search** a keyword from a message you just posted.
6. Paste a PM platform URL (`https://pm-raven-dubgub.vercel.app/...`) → link chip unfurls.
7. Header **Open PM platform** link works.
8. (Admin only) Post in `#announcements`; as member, confirm posting is blocked.

## What to expect

| Area | Notes |
|------|-------|
| Real-time | Polling MVP (~4s), not websockets |
| PM integration | Same email as PM app; `PM_PLATFORM_URL` link detection |
| Notifications | In-app @mention + DM |
| Not included | Slack-style threads, file uploads, mobile push |

## Known gaps (call out in review)

- Production DB must be migrated + seeded once after first Vercel deploy (`npm run db:seed` with prod `DATABASE_URL`).
- Announcements require a user with `role = ADMIN` (via seed env vars).

See [README.md](../README.md) and [DEPLOY.md](../DEPLOY.md) for deploy steps.
