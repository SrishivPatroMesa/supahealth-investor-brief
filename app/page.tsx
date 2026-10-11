"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { BriefForm } from "@/components/BriefForm";
import { ProfilePanel } from "@/components/ProfilePanel";
import { BriefView, type TabId } from "@/components/BriefView";
import { Compare, Features, Footer, HowItWorks, Meetings, RecentList, StatsStrip, type Meeting } from "@/components/HomeSections";
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
    const list = [b, ...loadRecent().filter((x) => x.meta.generatedAt !== b.meta.generatedAt)].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

export default function Home() {
  const [view, setView] = useState<View>({ kind: "idle" });
  const [ledger, setLedger] = useState<LedgerState>(initialLedger);
  const [recent, setRecent] = useState<Brief[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [homeTab, setHomeTab] = useState<"overview" | "recent" | "meetings" | "compare">("overview");
  const [drawer, setDrawer] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);

  useEffect(() => { setRecent(loadRecent()); setProfile(loadProfile()); setMeetings(loadMeetings()); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [view.kind]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  function saveProfile(p: Profile) {
    setProfile(p);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
  }
  function saveMeetings(list: Meeting[]) {
    setMeetings(list);
    try { localStorage.setItem(MEETINGS_KEY, JSON.stringify(list)); } catch {}
  }
  function removeBrief(b: Brief) {
    const list = loadRecent().filter((x) => x.meta.generatedAt !== b.meta.generatedAt);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
    setRecent(list);
  }
  function goHome(tab: typeof homeTab = "overview") {
    setView({ kind: "idle" });
    setHomeTab(tab);
    setTimeout(() => document.getElementById("home-tabs")?.scrollIntoView({ behavior: "smooth" }), 60);
  }
  function prepareFromMeeting(investor: string, firm: string) {
    setHomeTab("overview");
    setPreset({ investor, firm, nonce: Date.now() });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  const HOME_TABS = [
    { id: "overview" as const, label: "Overview" },
    { id: "recent" as const, label: "Recent briefs", count: recent.length },
    { id: "meetings" as const, label: "Meetings", count: upcoming },
    { id: "compare" as const, label: "Compare investors", count: recent.length >= 2 ? recent.length : 0 },
  ];

  return (
    <div className="shell">
      <header className="topbar no-print">
        <button className="topbar-home" onClick={() => goHome()} aria-label="Go to the home page">
          <Logo />
        </button>
        <div className="topbar-right">
          <span className="live-pill"><span className="live-dot" aria-hidden="true" />Live web research</span>
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
        <BriefView key={view.brief.meta.generatedAt + (view.tab ?? "")} brief={view.brief} initialTab={view.tab} onNew={() => goHome()} />
      ) : view.kind === "running" ? (
        <>
          <section className="hero hero-run"><div className="hero-inner"><p className="hero-kicker">Researching across the live web</p></div></section>
          <main className="main run">
            <ResearchLedger state={ledger} investor={view.investor} firm={view.firm} />
          </main>
        </>
      ) : (
        <>
          <section className="hero hero-home">
            <div className="hero-inner home-grid">
              <div className="intro">
                <p className="hero-kicker">Pre-meeting investor intelligence</p>
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

          <nav className="tabs no-print" id="home-tabs" role="tablist" aria-label="Workspace">
            <div className="tabs-inner">
              {HOME_TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={homeTab === t.id} className={`tab ${homeTab === t.id ? "is-active" : ""}`} onClick={() => setHomeTab(t.id)}>
                  {t.label}{t.count ? <span className="tab-count">{t.count}</span> : null}
                </button>
              ))}
            </div>
          </nav>

          <main className="main">
            {homeTab === "overview" && (
              <div className="tabpanel is-active">
                <StatsStrip briefs={recent} meetings={meetings} />
                <h2 className="section-title">What&apos;s in every brief <span className="muted">click to see it on your latest brief</span></h2>
                <Features latest={recent[0]} onOpen={(b, tab) => setView({ kind: "done", brief: b, tab })} />
                <h2 className="section-title">How it works</h2>
                <HowItWorks />
                {recent.length > 0 && (
                  <>
                    <h2 className="section-title">Latest briefs <button className="link-btn" onClick={() => setHomeTab("recent")}>See all {recent.length}</button></h2>
                    <RecentList briefs={recent.slice(0, 3)} onOpen={(b) => setView({ kind: "done", brief: b })} onRemove={removeBrief} />
                  </>
                )}
              </div>
            )}
            {homeTab === "recent" && (
              <div className="tabpanel is-active">
                <h2 className="section-title first">Recent briefs <span className="muted">saved in this browser</span></h2>
                <RecentList briefs={recent} onOpen={(b) => setView({ kind: "done", brief: b })} onRemove={removeBrief} />
              </div>
            )}
            {homeTab === "meetings" && (
              <div className="tabpanel is-active">
                <h2 className="section-title first">This week&apos;s meetings <span className="muted">prepare each brief the day before</span></h2>
                <Meetings
                  meetings={meetings} briefs={recent}
                  onAdd={(m) => saveMeetings([...meetings, m])}
                  onRemove={(id) => saveMeetings(meetings.filter((m) => m.id !== id))}
                  onPrepare={prepareFromMeeting}
                  onOpen={(b) => setView({ kind: "done", brief: b })}
                />
              </div>
            )}
            {homeTab === "compare" && (
              <div className="tabpanel is-active">
                <h2 className="section-title first">Compare investors <span className="muted">decide where to spend your time</span></h2>
                <Compare briefs={recent} onOpen={(b) => setView({ kind: "done", brief: b })} />
              </div>
            )}
          </main>
        </>
      )}

      <Footer onTab={(t) => goHome(t as typeof homeTab)} />
    </div>
  );
}
