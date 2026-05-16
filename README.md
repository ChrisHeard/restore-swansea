# Restore Swansea

Restore Swansea is a private member platform for coordinating Restore Britain activity in Swansea, including ward dashboards, street-level leafletting progress, member access, and local campaign operations.

## Current features

- Supabase authentication
- Protected dashboard
- Ward-level progress overview
- Street-level delivery status tracking
- Mission planner / route shortlist
- Ward context and local election data
- Ward message board where enabled

## Local development

1. Copy environment template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in `.env.local` with your Supabase project values:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

## Production checks

```bash
npm run lint
npm run build
```

## Supabase setup

For stable local development, enable password auth and use a fixed development user:

1. In Supabase Dashboard, go to **Authentication → Providers → Email**.
2. Enable **Email** provider with **email/password sign-in** enabled.
3. Go to **Authentication → Users** and manually create a development user.
4. Sign in locally using that email/password on `/`.

> Magic links can hit Supabase email rate limits during rapid local testing. Keep them as optional fallback rather than your primary local auth flow.

## Database schema notes

Detailed, code-observed database object expectations are documented in:

- `docs/database-schema.md`

## Auth and permissions design notes

Planned roles and permissions design (pre-implementation) is documented in:

- `docs/auth-and-permissions.md`

## Migration note

This repository supersedes `ChrisHeard/leafletting-app`, which is now treated as retired/historical. Active development should continue here in `ChrisHeard/restore-swansea`.
