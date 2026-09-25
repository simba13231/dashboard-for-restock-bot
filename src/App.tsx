import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  supabase,
  FUNCTIONS_URL,
  generateAgentKey,
  sha256Hex,
} from "@/lib/supabase";

type IconName =
  | "bolt"
  | "box"
  | "chart"
  | "chevron"
  | "clock"
  | "cog"
  | "discord"
  | "grid"
  | "help"
  | "play"
  | "plus"
  | "search"
  | "shield"
  | "sparkles"
  | "copy"
  | "logout"
  | "globe";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    bolt: <path d="m13 2-9 11h7l-1 9 9-12h-7l1-8Z" />,
    box: (
      <>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="m4 7 8 4 8-4v10l-8 4-8-4V7Zm8 4v10" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
        <path d="m3 7 6-4 6 6 6-5" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    cog: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.7V21h-4v-.1a1.8 1.8 0 0 0-1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H3v-4h.1a1.8 1.8 0 0 0 1.7-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V3h4v.1a1.8 1.8 0 0 0 1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1H21v4h-.1a1.8 1.8 0 0 0-1.5.8Z" />
      </>
    ),
    discord: <path d="M8 8.5c2.5-1.1 5.5-1.1 8 0M9 15c2 1 4 1 6 0m-6.5-3h.01m6.99 0h.01M7 5.5A17 17 0 0 1 10 5l.6 1.2m6.4-.7A17 17 0 0 0 14 5l-.6 1.2M7 5.5c-2 2.7-2.5 5.3-2.2 8.7A12 12 0 0 0 8.5 16l1-1.5m7.5-9c2 2.7 2.5 5.3 2.2 8.7a12 12 0 0 1-3.7 1.8l-1-1.5" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.3 2.3 0 1 1 3.1 2.2c-.7.3-.9.8-.9 1.8m0 3h.01" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 5 5" />
      </>
    ),
    shield: <path d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Zm-3 9 2 2 4-5" />,
    sparkles: <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 14l.9 2.6L9.5 18l-2.6.9L6 21l-.9-2.1-2.6-.9 2.6-1.4L6 14Z" />,
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 3.8 6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-6-3.8-9s1.3-6.5 3.8-9Z" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  );
}

function ActionButton({
  children,
  className = "",
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button className={className} onClick={onClick} disabled={disabled} type="button">
      {children}
    </button>
  );
}

// ============================================================
// AUTH GATE — everything below this line only renders once we
// know whether there's a logged-in session.
// ============================================================

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="boot-screen">Loading...</div>;
  }

  if (session === null) {
    return <LoginScreen />;
  }

  return <ProfileGate session={session} />;
}

// ============================================================
// PROFILE GATE — makes sure a display name exists before the
// rest of the app renders. Discord sign-ins get one filled in
// automatically (no prompt); anyone else picks one once. Either
// way it's editable later from Settings.
// ============================================================

type Profile = { display_name: string };

function discordDisplayName(session: Session): string {
  const meta = session.user.user_metadata ?? {};
  return (
    meta.full_name ??
    meta.custom_claims?.global_name ??
    meta.name ??
    meta.user_name ??
    session.user.email ??
    "Discord user"
  );
}

function ProfileGate({ session }: { session: Session }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  const reload = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile(data ?? null);
  };

  useEffect(() => {
    reload();
  }, [session.user.id]);

  // First-ever login via Discord: create the profile silently, using
  // their Discord name, and never show a name-entry step for it.
  useEffect(() => {
    if (profile !== null) return;
    if (session.user.app_metadata?.provider !== "discord") return;

    supabase
      .from("profiles")
      .insert({ id: session.user.id, display_name: discordDisplayName(session) })
      .then(() => reload());
  }, [profile, session.user.id]);

  if (profile === undefined) {
    return <div className="boot-screen">Loading...</div>;
  }

  if (profile === null) {
    if (session.user.app_metadata?.provider === "discord") {
      // The effect above is creating it right now.
      return <div className="boot-screen">Setting up your account...</div>;
    }
    return <NameEntryScreen session={session} onDone={reload} />;
  }

  return <BotGate session={session} profile={profile} onProfileChanged={reload} />;
}

function NameEntryScreen({
  session,
  onDone,
}: {
  session: Session;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name first.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("profiles")
      .insert({ id: session.user.id, display_name: trimmed });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark large"><Icon name="sparkles" size={24} /></div>
        <div className="brand-name">Pick a display name</div>
        <p className="auth-copy">
          This is what shows up on your dashboard. You can change it later
          from Settings.
        </p>
        <input
          className="name-input"
          placeholder="e.g. RestockBoss"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && save()}
          maxLength={32}
          autoFocus
        />
        <ActionButton className="discord-button" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Continue"}
        </ActionButton>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </main>
  );
}

function LoginScreen() {
  const [error, setError] = useState("");

  const signIn = async (provider: "discord" | "google") => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) setError(error.message);
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark large"><Icon name="bolt" size={26} /></div>
        <div className="brand-name">PS99 Restock Bot</div>
        <p className="auth-copy">
          Sign in to connect your own bot and watch it live from anywhere —
          it still runs on your PC, this just gives it a dashboard.
        </p>
        <ActionButton className="discord-button" onClick={() => signIn("discord")}>
          <Icon name="discord" size={18} /> Continue with Discord
        </ActionButton>
        <ActionButton className="google-button" onClick={() => signIn("google")}>
          <Icon name="globe" size={16} /> Continue with Google
        </ActionButton>
        {error && <p className="auth-error">{error}</p>}
        <p className="auth-disclaimer">
          Automating Roblox this way is against Roblox's Terms of Service and
          can get an account banned. That risk is yours to take on your own
          account — this dashboard doesn't change it either way.
        </p>
      </div>
    </main>
  );
}

// ============================================================
// BOT GATE — once logged in, check whether this user has
// connected a bot yet. If not, run onboarding instead of the
// dashboard.
// ============================================================

type BotRow = { id: string; name: string; markup_percent: number };

function BotGate({
  session,
  profile,
  onProfileChanged,
}: {
  session: Session;
  profile: Profile;
  onProfileChanged: () => void;
}) {
  const [bot, setBot] = useState<BotRow | null | undefined>(undefined);

  const reload = async () => {
    const { data } = await supabase
      .from("bots")
      .select("id, name, markup_percent")
      .eq("user_id", session.user.id)
      .maybeSingle();
    setBot(data ?? null);
  };

  useEffect(() => {
    reload();
  }, [session.user.id]);

  if (bot === undefined) {
    return <div className="boot-screen">Loading your bot...</div>;
  }

  if (bot === null) {
    return <OnboardingScreen session={session} onConnected={reload} />;
  }

  return (
    <Dashboard
      session={session}
      bot={bot}
      profile={profile}
      onBotChanged={reload}
      onProfileChanged={onProfileChanged}
    />
  );
}

function OnboardingScreen({
  session,
  onConnected,
}: {
  session: Session;
  onConnected: () => void;
}) {
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const createBot = async () => {
    setBusy(true);
    setError("");

    const key = generateAgentKey();
    const keyHash = await sha256Hex(key);

    const { data: newBot, error: botError } = await supabase
      .from("bots")
      .insert({ user_id: session.user.id, agent_key_hash: keyHash })
      .select("id")
      .single();

    if (botError || !newBot) {
      setError(botError?.message ?? "Could not create bot.");
      setBusy(false);
      return;
    }

    const { error: statusError } = await supabase
      .from("bot_status")
      .insert({ bot_id: newBot.id });

    if (statusError) {
      setError(statusError.message);
      setBusy(false);
      return;
    }

    setRawKey(key);
    setBusy(false);
  };

  return (
    <main className="auth-shell">
      <div className="auth-card wide">
        <div className="brand-mark large"><Icon name="box" size={24} /></div>
        <div className="brand-name">Connect your bot</div>

        {!rawKey && (
          <>
            <p className="auth-copy">
              This creates a personal key for your local bot to authenticate
              with. It's shown once — copy it straight into your bot's{" "}
              <code>.env</code> file.
            </p>
            <ActionButton className="discord-button" onClick={createBot} disabled={busy}>
              {busy ? "Generating..." : "Generate my agent key"}
            </ActionButton>
            {error && <p className="auth-error">{error}</p>}
          </>
        )}

        {rawKey && (
          <>
            <p className="auth-copy warning">
              Copy this now — it will not be shown again. If you lose it,
              regenerate a new one from Settings (this one will stop working).
            </p>
            <div className="key-box">
              <code>{rawKey}</code>
              <ActionButton
                className="icon-button"
                onClick={() => {
                  navigator.clipboard.writeText(rawKey);
                  setCopied(true);
                }}
              >
                <Icon name="copy" size={15} />
              </ActionButton>
            </div>
            {copied && <p className="copied-note">Copied.</p>}

            <div className="setup-steps">
              <div className="setup-title">Add to your bot's setup:</div>
              <ol>
                <li>
                  Add <code>SUPABASE_AGENT_KEY=</code>(the full key above) to
                  your <code>.env</code> file.
                </li>
                <li>
                  Add <code>SUPABASE_FUNCTIONS_URL={FUNCTIONS_URL}</code> to
                  the same file.
                </li>
                <li>
                  Drop <code>ps99_supabase_client.py</code> next to your bot
                  script and import it as shown in{" "}
                  <code>INTEGRATION_NOTES.md</code>.
                </li>
                <li>Restart your bot — the dashboard will show it as connected.</li>
              </ol>
            </div>

            <ActionButton className="discord-button" onClick={onConnected}>
              Done — take me to the dashboard
            </ActionButton>
          </>
        )}
      </div>
    </main>
  );
}

// ============================================================
// DASHBOARD — real data from here down. No fixture arrays.
// ============================================================

type BotStatusRow = {
  connected: boolean;
  bot_user: string | null;
  booth_full: boolean;
  booth_last_read: string | null;
  last_event: string;
  queue_length: number;
  updated_at: string;
};

type RestockEvent = {
  id: string;
  item_name: string;
  price: number | null;
  rap: number | null;
  price_basis: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Dashboard({
  session,
  bot,
  profile,
  onBotChanged,
  onProfileChanged,
}: {
  session: Session;
  bot: BotRow;
  profile: Profile;
  onBotChanged: () => void;
  onProfileChanged: () => void;
}) {
  const [active, setActive] = useState("Dashboard");
  const [toast, setToast] = useState("");
  const [status, setStatus] = useState<BotStatusRow | null>(null);
  const [events, setEvents] = useState<RestockEvent[]>([]);
  const [markupInput, setMarkupInput] = useState(String(bot.markup_percent));

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  // Initial load + realtime subscriptions. Both tables were added to
  // supabase_realtime in the migration, so inserts/updates push here
  // without any polling from the browser.
  useEffect(() => {
    supabase
      .from("bot_status")
      .select("*")
      .eq("bot_id", bot.id)
      .maybeSingle()
      .then(({ data }) => setStatus(data as BotStatusRow | null));

    supabase
      .from("restock_events")
      .select("*")
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setEvents((data ?? []) as RestockEvent[]));

    const channel = supabase
      .channel(`bot-${bot.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_status", filter: `bot_id=eq.${bot.id}` },
        (payload) => setStatus(payload.new as BotStatusRow),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "restock_events", filter: `bot_id=eq.${bot.id}` },
        (payload) => setEvents((prev) => [payload.new as RestockEvent, ...prev].slice(0, 10)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bot.id]);

  const sendCommand = async (type: "pause" | "resume" | "set_markup", payload?: object) => {
    const { error } = await supabase.from("commands").insert({ bot_id: bot.id, type, payload });
    if (error) {
      notify(`Command failed: ${error.message}`);
    } else {
      notify(
        type === "pause"
          ? "Pause command sent — the agent picks it up on its next poll"
          : type === "resume"
            ? "Resume command sent"
            : "Markup update sent",
      );
    }
  };

  const applyMarkup = async () => {
    const value = Number(markupInput);
    if (Number.isNaN(value) || value < 0 || value > 500) {
      notify("Markup must be between 0 and 500.");
      return;
    }
    await supabase.from("bots").update({ markup_percent: value }).eq("id", bot.id);
    await sendCommand("set_markup", { percent: value });
  };

  const connected = status?.connected ?? false;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="bolt" size={22} /></div>
          <div>
            <div className="brand-name">PS99</div>
            <div className="brand-subtitle">RESTOCK BOT</div>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {[
            ["Dashboard", "grid"],
            ["Activity Log", "clock"],
            ["Settings", "cog"],
          ].map(([label, icon]) => (
            <ActionButton
              className={`nav-item ${active === label ? "active" : ""}`}
              key={label}
              onClick={() => setActive(label)}
            >
              <Icon name={icon as IconName} />
              <span>{label}</span>
            </ActionButton>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">
              {profile.display_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="profile-name">{profile.display_name}</div>
              <div className="profile-plan">{bot.name}</div>
            </div>
            <ActionButton className="icon-button" onClick={() => supabase.auth.signOut()}>
              <Icon name="logout" size={16} />
            </ActionButton>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="crumbs">
            <span>PS99 Bot</span>
            <Icon name="chevron" size={14} />
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <div className={`status-chip ${connected ? "online" : ""}`}>
              <i />
              {connected ? "Agent online" : "Agent offline"}
            </div>
            <ActionButton
              className="pause-button"
              onClick={() => sendCommand("pause")}
              disabled={!connected}
            >
              Pause bot
            </ActionButton>
            <ActionButton
              className="pause-button"
              onClick={() => sendCommand("resume")}
              disabled={!connected}
            >
              Resume bot
            </ActionButton>
          </div>
        </header>

        <div className="content">
          {active === "Dashboard" && (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">
                    {connected ? "AGENT CONNECTED" : "WAITING FOR YOUR AGENT"}
                  </div>
                  <div className="page-title">
                    {status?.last_event ?? "No status yet — start your bot to see it here."}
                  </div>
                  <div className="page-subtitle">
                    {status?.updated_at
                      ? `Last update ${timeAgo(status.updated_at)} ago`
                      : "Follow the onboarding steps to connect your local bot."}
                  </div>
                </div>
              </div>

              <div className="stats-grid">
                <article className="stat-card featured">
                  <div className="stat-top">
                    <div className="stat-icon cyan"><Icon name="box" /></div>
                  </div>
                  <div className="stat-value">{status?.queue_length ?? 0}</div>
                  <div className="stat-label">Jobs in queue</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon purple"><Icon name="bolt" /></div>
                  </div>
                  <div className="stat-value">{events.length}</div>
                  <div className="stat-label">Recent restocks</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon yellow"><Icon name="clock" /></div>
                  </div>
                  <div className="stat-value">{status?.booth_last_read ?? "—"}</div>
                  <div className="stat-label">Booth capacity</div>
                  <div className="stat-note">{status?.booth_full ? "Full — paused" : "Has room"}</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon green"><Icon name="shield" /></div>
                  </div>
                  <div className="stat-value">{connected ? "Online" : "Offline"}</div>
                  <div className="stat-label">Agent status</div>
                </article>
              </div>

              <div className="dashboard-grid">
                <article className="panel restocks-panel">
                  <div className="panel-header">
                    <div>
                      <div className="panel-title">Recent restocks</div>
                      <div className="panel-subtitle">Live from your bot — not a demo feed</div>
                    </div>
                  </div>
                  <div className="restock-list">
                    {events.length === 0 && (
                      <div className="empty-state">
                        No restocks reported yet. They'll show up here the
                        moment your agent lists an item.
                      </div>
                    )}
                    {events.map((event) => (
                      <div className="restock-row" key={event.id}>
                        <div className="restock-info">
                          <div className="restock-name">{event.item_name}</div>
                          <div className="restock-meta">
                            {event.price_basis ? `Priced on ${event.price_basis}` : ""}
                          </div>
                        </div>
                        {event.price != null && (
                          <div className="price-block">
                            <span className="gem">◆</span>
                            <strong>{event.price.toLocaleString()}</strong>
                          </div>
                        )}
                        <div className="time-block">{timeAgo(event.created_at)} ago</div>
                      </div>
                    ))}
                  </div>
                </article>

                <aside className="side-column">
                  <article className="panel activity-panel">
                    <div className="panel-header compact">
                      <div>
                        <div className="panel-title">Markup</div>
                        <div className="panel-subtitle">Applies to the next listing, no restart needed</div>
                      </div>
                    </div>
                    <div className="markup-controls">
                      <input
                        className="markup-input"
                        type="number"
                        min={0}
                        max={500}
                        step={0.5}
                        value={markupInput}
                        onChange={(event) => setMarkupInput(event.target.value)}
                      />
                      <span>%</span>
                      <ActionButton className="primary-button" onClick={applyMarkup}>
                        Apply
                      </ActionButton>
                    </div>
                  </article>
                </aside>
              </div>
            </>
          )}

          {active === "Activity Log" && (
            <div className="panel activity-panel" style={{ padding: 24 }}>
              <div className="panel-title">Recent restocks (same feed as Dashboard)</div>
              <div className="timeline">
                {events.map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <span className="timeline-icon success"><Icon name="bolt" size={14} /></span>
                    <div>
                      <strong>Restocked</strong>
                      <p>{event.item_name}</p>
                    </div>
                    <time>{timeAgo(event.created_at)}</time>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === "Settings" && (
            <SettingsPanel
              session={session}
              bot={bot}
              profile={profile}
              onBotChanged={onBotChanged}
              onProfileChanged={onProfileChanged}
              notify={notify}
            />
          )}
        </div>
      </section>
      {toast && <div className="toast"><Icon name="shield" size={17} />{toast}</div>}
    </main>
  );
}

function SettingsPanel({
  session,
  bot,
  profile,
  onBotChanged,
  onProfileChanged,
  notify,
}: {
  session: Session;
  bot: BotRow;
  profile: Profile;
  onBotChanged: () => void;
  onProfileChanged: () => void;
  notify: (message: string) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(profile.display_name);
  const [savingName, setSavingName] = useState(false);

  const regenerateKey = async () => {
    setRegenerating(true);
    const key = generateAgentKey();
    const keyHash = await sha256Hex(key);
    const { error } = await supabase.from("bots").update({ agent_key_hash: keyHash }).eq("id", bot.id);
    setRegenerating(false);
    if (error) {
      notify(error.message);
      return;
    }
    setNewKey(key);
    onBotChanged();
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      notify("Name can't be empty.");
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", session.user.id);
    setSavingName(false);
    if (error) {
      notify(error.message);
      return;
    }
    notify("Display name updated.");
    onProfileChanged();
  };

  return (
    <>
      <div className="panel" style={{ padding: 24, maxWidth: 560, marginBottom: 16 }}>
        <div className="panel-title">Display name</div>
        <p className="panel-subtitle" style={{ marginTop: 8, marginBottom: 16 }}>
          Shown in the sidebar. Available to change no matter how you signed in.
        </p>
        <div className="markup-controls" style={{ padding: 0 }}>
          <input
            className="name-input inline"
            value={nameInput}
            maxLength={32}
            onChange={(event) => setNameInput(event.target.value)}
          />
          <ActionButton className="primary-button" onClick={saveName} disabled={savingName}>
            {savingName ? "Saving..." : "Save"}
          </ActionButton>
        </div>
      </div>

      <div className="panel" style={{ padding: 24, maxWidth: 560 }}>
        <div className="panel-title">Agent key</div>
        <p className="panel-subtitle" style={{ marginTop: 8, marginBottom: 16 }}>
          Regenerating immediately invalidates your bot's current key —
          update your <code>.env</code> file with the new one before
          restarting it.
        </p>
        {newKey ? (
          <div className="key-box">
            <code>{newKey}</code>
            <ActionButton className="icon-button" onClick={() => navigator.clipboard.writeText(newKey)}>
              <Icon name="copy" size={15} />
            </ActionButton>
          </div>
        ) : (
          <ActionButton className="pause-button" onClick={regenerateKey} disabled={regenerating}>
            {regenerating ? "Generating..." : "Regenerate agent key"}
          </ActionButton>
        )}
      </div>
    </>
  );
}
