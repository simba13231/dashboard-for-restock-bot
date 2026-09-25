# Deploying the multi-user PS99 Restock dashboard

Three services, all free at hobby scale: **Supabase** (database + auth +
the two edge functions), **Vercel or Netlify** (the website itself), and
**Discord Developer Portal** (login button). Each user's actual bot
keeps running on their own PC — see `agent/INTEGRATION_NOTES.md`.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign up, click **New project**.
2. Once it's ready, open **SQL Editor** and paste the contents of
   `supabase/migrations/0001_init.sql`, then run it. This creates the
   `bots`, `bot_status`, `restock_events`, and `commands` tables with
   row-level security already locked down per-user.
3. Go to **Project Settings -> API** and copy:
   - **Project URL** -> becomes `VITE_SUPABASE_URL`
   - **anon public key** -> becomes `VITE_SUPABASE_ANON_KEY`
   - **service_role key** -> you'll need this in step 3, do NOT put it
     in the frontend, ever.

## 2. Set up Discord login

1. In the **Discord Developer Portal** (https://discord.com/developers/applications),
   create a **new application** — separate from any bot application
   you already made for the restock bot itself. This one is just "log
   into the website."
2. Under **OAuth2**, add this redirect URL (Supabase will show you the
   exact one under Authentication -> Providers -> Discord once you get
   there — copy it from there to be safe):
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client Secret** from this Discord app.
4. In Supabase: **Authentication -> Providers -> Discord**, paste both
   in, and toggle it on.

### Also enabling Google sign-in

1. In the **Google Cloud Console** (https://console.cloud.google.com),
   create an **OAuth client ID** (Application type: **Web application**).
2. Add this as an authorized redirect URI (same pattern as Discord):
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client Secret**.
4. In Supabase: **Authentication -> Providers -> Google**, paste both
   in, toggle it on.

Discord sign-ins get their display name automatically (pulled from
their Discord profile) with no extra step. Google sign-ins are asked
to pick a display name once, right after their first login — both
are editable later from Settings either way.

## 3. Deploy the two edge functions

You'll need the Supabase CLI (`npm install -g supabase`).

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy agent-report
supabase functions deploy agent-commands
supabase secrets set SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-step-1
```

The service role key lives only in Supabase's function environment —
it's never shipped to the browser or to any user's local bot.

## 4. Deploy the frontend

Push this project to a GitHub repo, then on **Vercel** (or Netlify):

1. **New Project -> Import** your repo.
2. Framework preset: **Vite**.
3. Add environment variables (from `.env.example`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. You'll get a real `https://your-app.vercel.app` URL — not
   localhost, reachable from any device, and each visitor logs in with
   their own Discord account and only ever sees their own bot's data
   (enforced by the RLS policies from step 1, not just by the UI).

## 5. What each new user does

1. Visit your deployed URL, click **Continue with Discord**.
2. On first login, click **Generate my agent key** — copy the key shown.
3. Download your bot's files (`ps99_restock_bot.py`, `requirements.txt`,
   `run.bat`, plus the two new files: `ps99_supabase_client.py` and this
   repo's `agent/INTEGRATION_NOTES.md`).
4. Add `SUPABASE_AGENT_KEY` and `SUPABASE_FUNCTIONS_URL` to their `.env`
   (the onboarding screen shows both values).
5. Run the bot as usual — the dashboard now shows it as connected.

Each person needs their **own** Discord bot token and **own** BIG Games
OAuth app too (same setup your README already walks through) — this
dashboard doesn't share or proxy those; it only relays status and
pause/resume/markup commands.

## Costs at this scale

Supabase's free tier covers this comfortably for a small user base
(500MB database, generous edge function invocations). Vercel/Netlify's
free tier covers the frontend. You'd only need to pay if this grows to
a meaningfully large number of concurrent users.
