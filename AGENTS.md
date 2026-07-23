# Agent notes — comms-raven-dubgub

## Stack

Next.js 16 App Router · Prisma · PostgreSQL · JWT cookie auth · Tailwind 4

## Do

- Keep email identity aligned with PM platform (`pm-raven-dubgub`)
- Prefer polling (≤5s) over websockets for MVP unless asked
- Announcements posting is ADMIN-only

## Don't

- Commit `.env` / secrets
- Share the PM database — use a separate Neon DB
- Break channel/DM separation in the Message model (exactly one of channelId / conversationId)

## Key paths

| Area | Path |
|------|------|
| Schema | `prisma/schema.prisma` |
| Auth | `src/lib/auth.ts` |
| Chat UI | `src/components/comms-workspace.tsx` |
| APIs | `src/app/api/**` |
