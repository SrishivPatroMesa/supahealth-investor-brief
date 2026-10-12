"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { BriefForm } from "@/components/BriefForm";
import { ProfilePanel } from "@/components/ProfilePanel";
import { BriefView, type TabId } from "@/components/BriefView";
import { Compare, Features, Footer, GettingStarted, HowItWorks, Meetings, RecentList, StatsStrip, type Meeting } from "@/components/HomeSections";
import { sampleMeetings } from "@/lib/samples";
import { CalendarCard, Leaderboard, NextActions, PipelineBands, RoundCoverage } from "@/components/Dashboard";
import { Directory } from "@/components/Directory";
import type { Action } from "@/lib/insights";
import type { Preset } from "@/components/BriefForm";
import { ResearchLedger, initialLedger, type LedgerState } from "@/components/ResearchLedger";
import type { Brief, ProgressEvent } from "@/lib/types";
import { defaultProfile, Profile } from "@/lib/startup-profile";

type View =
  | { kind: "idle" }
  | { kind: "running"; investor: string; firm: string }
  | { kind: "done"; brief: Brief; tab?: TabId }
  | { kind: "error"; message: string; investor: string; firm: string };

const RECENT_KEY = "supahealth:recent-briefs-v2";
const PROFILE_KEY = "supahealth:profile";
const MEETINGS_KEY = "supahealth:meetings";

function loadMeetings(): Meeting[] {
  try { return JSON.parse(localStorage.getItem(MEETINGS_KEY) || "[]"); } catch { return []; }
}

function loadProfile(): Profile {
  try {
    const r = Profile.safeParse(JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"));
    return r.success ? r.data : defaultProfile;
  } catch { return defaultProfile; }
}

function loadRecent(): Brief[] {
  try { return (JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as Brief[]).filter((b) => b?.analysis && b?.prediction); } catch { return []; }
}
function saveRecent(b: Brief) {
  try {
    const key = (x: Brief) => `${x.investor.name}|${x.investor.firm}`.toLowerCase().replace(/[^a-z|]/g, "");
    const list = [b, ...loadRecent().filter((x) => x.meta.generatedAt !== b.meta.generatedAt && key(x) !== key(b))].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

type HomeTab = "dashboard" | "briefs" | "meetings" | "compare" | "directory";
const BOOKING_KEY = "supahealth:calcom";

export default function Home() {
  const [view, setView] = useState<View>({ kind: "idle" });
  const [ledger, setLedger] = useState<LedgerState>(initialLedger);
  const [recent, setRecent] = useState<Brief[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [homeTab, setHomeTab] = useState<HomeTab>("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [booking, setBooking] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRecent(loadRecent()); setProfile(loadProfile()); setMeetings(loadMeetings());
    try { setBooking(localStorage.getItem(BOOKING_KEY) || ""); } catch {}
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    setMounted(true);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [view.kind, homeTab]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("supahealth:theme", next); } catch {}
  }
  function saveProfile(p: Profile) {
    setProfile(p);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
  }
  function saveMeetings(list: Meeting[]) {
    setMeetings(list);
    try { localStorage.setItem(MEETINGS_KEY, JSON.stringify(list)); } catch {}
  }
  function loadSamples() {
    saveMeetings([...meetings.filter((m) => m.source !== "sample"), ...sampleMeetings()]);
  }
  function clearSamples() {
    saveMeetings(meetings.filter((m) => m.source !== "sample"));
  }
  function saveBooking(u: string) {
    setBooking(u);
    try { localStorage.setItem(BOOKING_KEY, u); } catch {}
  }
  function removeBrief(b: Brief) {
    const list = loadRecent().filter((x) => x.meta.generatedAt !== b.meta.generatedAt);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
    setRecent(list);
  }
  function goTab(tab: HomeTab) {
    if (view.kind === "running") return;
    setView({ kind: "idle" });
    setHomeTab(tab);
  }
  function prepare(investor: string, firm: string) {
    setView({ kind: "idle" });
    setHomeTab("dashboard");
    setPreset({ investor, firm, nonce: Date.now() });
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
  }
  const openBrief = (b: Brief, tab?: TabId) => setView({ kind: "done", brief: b, tab });
  function onAction(a: Action) {
    if (!a.cta) return;
    if (a.cta.kind === "prepare") prepare(a.cta.investor ?? "", a.cta.firm ?? "");
    else if (a.cta.kind === "open" && a.cta.brief) openBrief(a.cta.brief);
    else if (a.cta.kind === "meetings") goTab("meetings");
    else if (a.cta.kind === "directory") goTab("directory");
  }

  function apply(e: ProgressEvent) {
    if (e.type === "stage") {
      setLedger((l) => ({ ...l, stages: { ...l.stages, [e.stage]: { status: e.status, detail: e.detail } } }));
    } else if (e.type === "track") {
      setLedger((l) => ({ ...l, tracks: { ...l.tracks, [e.track]: { status: e.status, sources: e.sources, detail: e.detail } } }));
    }
  }

  async function run(investor: string, firm: string) {
    setLedger(initialLedger());
    setView({ kind: "running", investor, firm });
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investor, firm, profile }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `The server returned ${res.status}.`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let finished = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as ProgressEvent;
          if (ev.type === "result") {
            saveRecent(ev.brief);
            setRecent(loadRecent());
            setView({ kind: "done", brief: ev.brief });
            finished = true;
          } else if (ev.type === "error") {
            throw new Error(ev.message);
          } else apply(ev);
        }
      }
      if (!finished) throw new Error("The connection closed before the brief was ready. Run it again.");
    } catch (err) {
      setView({ kind: "error", message: (err as Error).message, investor, firm });
    }
  }

  const upcoming = meetings.filter((m) => new Date(m.when).getTime() > Date.now()).length;
  const NAV: { id: HomeTab; label: string; count?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "briefs", label: "Briefs", count: recent.length },
    { id: "meetings", label: "Meetings", count: upcoming },
    { id: "compare", label: "Compare" },
    { id: "directory", label: "Investor directory" },
  ];
  const activeNav: HomeTab | null = view.kind === "idle" || view.kind === "error" ? homeTab : view.kind === "done" ? "briefs" : null;
  const PAGE_HEAD: Record<Exclude<HomeTab, "dashboard">, [string, string]> = {
    briefs: ["Briefs", "Every brief you've prepared, saved in this browser."],
    meetings: ["Meetings and calendar", "Plan this week's investor meetings, import them from your calendar, and prepare each brief the day before."],
    compare: ["Compare investors", "Rank your pipeline by odds and compare up to three investors side by side."],
    directory: ["Investor directory", "Indian investors relevant to a seed-stage consumer health brand. Filter, then prepare a live brief."],
  };

  return (
    <div className="shell">
      <header className="topbar no-print">
        <button className="topbar-home" onClick={() => goTab("dashboard")} aria-label="Go to the dashboard">
          <Logo />
        </button>
        <nav className="topnav" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} className={`navpill ${activeNav === n.id ? "is-active" : ""}`} aria-current={activeNav === n.id ? "page" : undefined} onClick={() => goTab(n.id)} disabled={view.kind === "running"}>
              {n.label}{n.count ? <span className="navcount">{n.count}</span> : null}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <button className="icon-btn icon-btn-dark" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark"
              ? <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`} />)}</g></svg>
              : <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" /></svg>}
          </button>
          <button className="workspace-btn" onClick={() => setDrawer(true)} aria-haspopup="dialog">
            <span className="avatar-sm" aria-hidden="true">{profile.founderName.slice(0, 1)}</span>
            <span className="topbar-who strong">{profile.founderName}&apos;s workspace</span>
            <span className="caret" aria-hidden="true" />
          </button>
        </div>
      </header>

      {drawer && (
        <div className="drawer-scrim no-print" onClick={() => setDrawer(false)}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Edit workspace profile" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div className="drawer-id">
                <span className="avatar-lg">{profile.founderName.slice(0, 1)}</span>
                <div><strong>{profile.founderName}&apos;s workspace</strong><small>{profile.company}, {profile.stage}, raising ₹{profile.raiseAmountCr} Cr</small></div>
              </div>
              <button className="drawer-x" onClick={() => setDrawer(false)} aria-label="Close">×</button>
            </div>
            <ProfilePanel profile={profile} onSave={saveProfile} startEditing onClose={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {view.kind === "done" ? (
        <BriefView key={view.brief.meta.generatedAt + (view.tab ?? "")} brief={view.brief} initialTab={view.tab} onNew={() => goTab("dashboard")}
          onRerun={() => run(view.brief.meta.input.investor, view.brief.meta.input.firm)} />
      ) : view.kind === "running" ? (
        <>
          <section className="hero hero-run"><div className="hero-inner"><p className="hero-kicker">Researching across the live web</p></div></section>
          <main className="main run">
            <ResearchLedger state={ledger} investor={view.investor} firm={view.firm} />
          </main>
        </>
      ) : homeTab === "dashboard" ? (
        <>
          {mounted && (
            <div className="quickstart no-print" role="region" aria-label="Start here">
              <div className="qs-inner">
                <span className="qs-label"><span className="qs-pulse" />Start here</span>
                <p className="qs-text">Try the full workflow in three clicks. Only the meetings are samples; every brief is researched live.</p>
                <div className="qs-btns">
                  {meetings.some((m) => m.source === "sample")
                    ? <button className="btn btn-sm qs-btn qs-done" onClick={clearSamples}>✓ Sample meetings loaded · Clear</button>
                    : <button className="btn btn-sm qs-btn" onClick={loadSamples}>1. Load sample meetings</button>}
                  <button className="btn btn-sm qs-btn qs-main" onClick={() => run("Kanwaljit Singh", "Fireside Ventures")}>2. Run a live sample brief</button>
                  <button className="btn btn-sm qs-btn qs-ghost" onClick={() => goTab("meetings")}>3. See the calendar</button>
                </div>
              </div>
            </div>
          )}
          <section className="hero hero-home">
            <div className="hero-inner home-grid">
              <div className="intro">
                <p className="hero-kicker">{mounted ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${profile.founderName}` : "Pre-meeting investor intelligence"}</p>
                <h1 className="headline">Know who&apos;s across the table.</h1>
                <p className="dek">
                  Enter an investor and their firm. Get a sourced brief on their recent deals, what they
                  believe, how they&apos;ll compare you to their portfolio, your odds, and how to open.
                </p>
                <BriefForm onSubmit={run} preset={preset} />
                {view.kind === "error" && (
                  <div className="alert" role="alert">
                    <strong>The brief for {view.investor} couldn&apos;t be prepared.</strong>
                    <p>{view.message}</p>
                    <button className="btn btn-sm btn-quiet" onClick={() => run(view.investor, view.firm)}>Try again</button>
                  </div>
                )}
              </div>
              <ProfilePanel key={JSON.stringify(profile)} profile={profile} onSave={saveProfile} />
            </div>
          </section>

          {mounted && <main className="main">
            <GettingStarted hasMeetings={meetings.length > 0} hasBriefs={recent.length > 0} onLoadSamples={loadSamples}
              onTry={() => { setPreset({ investor: "Kanwaljit Singh", firm: "Fireside Ventures", nonce: Date.now() }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            <StatsStrip briefs={recent} meetings={meetings} />
            <div className="grid dash-row">
              <div className="span-7"><CalendarCard meetings={meetings} briefs={recent} onOpen={(b) => openBrief(b)} /></div>
              <div className="span-5"><NextActions briefs={recent} meetings={meetings} raise={profile.raiseAmountCr} onAction={onAction} /></div>
            </div>
            {recent.length > 0 && <div className="grid dash-row">
              <div className="span-5"><RoundCoverage briefs={recent} raise={profile.raiseAmountCr} /></div>
              <div className="span-3"><PipelineBands briefs={recent} /></div>
              <div className="span-4"><Leaderboard briefs={recent} onOpen={(b) => openBrief(b)} /></div>
            </div>}

            <h2 className="section-title">Investors to consider <button className="link-btn" onClick={() => goTab("directory")}>Open directory</button></h2>
            <Directory briefs={recent} onPrepare={prepare} onOpen={(b) => openBrief(b)} compact />

            <h2 className="section-title">What&apos;s in every brief <span className="muted">click to see it on your latest brief</span></h2>
            <Features latest={recent[0]} onOpen={(b, tab) => openBrief(b, tab)} />
            <h2 className="section-title">How it works</h2>
            <HowItWorks />
          </main>}
        </>
      ) : (
        <>
          <section className="hero hero-page">
            <div className="hero-inner">
              <h1 className="page-title">{PAGE_HEAD[homeTab][0]}</h1>
              <p className="page-sub">{PAGE_HEAD[homeTab][1]}</p>
            </div>
          </section>
          {mounted && <main className="main">
            {homeTab === "briefs" && <RecentList briefs={recent} onOpen={(b) => openBrief(b)} onRemove={removeBrief} />}
            {homeTab === "meetings" && (
              <>
                <div className="grid dash-row first">
                  <div className="span-12"><CalendarCard meetings={meetings} briefs={recent} onOpen={(b) => openBrief(b)} /></div>
                </div>
                <h2 className="section-title">All meetings</h2>
                <Meetings
                  meetings={meetings} briefs={recent}
                  onAdd={(m) => saveMeetings([...meetings, m])}
                  onImport={(ms) => saveMeetings([...meetings.filter((m) => !ms.some((x) => x.id === m.id)), ...ms])}
                  onRemove={(id) => saveMeetings(meetings.filter((m) => m.id !== id))}
                  onPrepare={prepare}
                  onOpen={(b) => openBrief(b)}
                  bookingUrl={booking} onBookingUrl={saveBooking}
                  onLoadSamples={loadSamples} onClearSamples={clearSamples}
                />
              </>
            )}
            {homeTab === "compare" && <Compare briefs={recent} onOpen={(b) => openBrief(b)} />}
            {homeTab === "directory" && <Directory briefs={recent} onPrepare={prepare} onOpen={(b) => openBrief(b)} />}
          </main>}
        </>
      )}

      <Footer onTab={(t) => goTab(t as HomeTab)} />
    </div>
  );
}
