# Deploy — Cohort Comms (RAVEN-dubgub)

## 1. Neon database

1. Create a **new** Neon project (do not reuse the PM database).
2. Copy the connection string into `DATABASE_URL`.

## 2. Local migrate + seed

```bash
cp .env.example .env
# set DATABASE_URL, AUTH_SECRET, PM_PLATFORM_URL
npx prisma migrate dev --name init
npm run db:seed
```

## 3. GitHub + Vercel

```bash
gh repo create RAVEN-dubgub/comms-raven-dubgub --public --source=. --remote=origin --push
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add AUTH_SECRET production
npx vercel env add PM_PLATFORM_URL production
npx vercel --prod
```

After first deploy, run migrate against production:

```bash
npx prisma migrate deploy
```

Or add a Vercel build command: `prisma migrate deploy && prisma generate && next build` if preferred.

## 4. Seed production channels

With production `DATABASE_URL` set locally:

```bash
npm run db:seed
```

## 5. Cohort submission PR

Open PR on the cohort monorepo titled:

`[Project 2] Submission — raven-dubgub`

Body must include: Production URL, PM platform integration notes, Agent usage.
