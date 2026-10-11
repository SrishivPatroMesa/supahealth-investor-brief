"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { BriefForm } from "@/components/BriefForm";
import { ProfilePanel } from "@/components/ProfilePanel";
import { BriefView } from "@/components/BriefView";
import { ResearchLedger, initialLedger, type LedgerState } from "@/components/ResearchLedger";
import type { Brief, ProgressEvent } from "@/lib/types";
import { defaultProfile, Profile } from "@/lib/startup-profile";

type View =
  | { kind: "idle" }
  | { kind: "running"; investor: string; firm: string }
  | { kind: "done"; brief: Brief }
  | { kind: "error"; message: string; investor: string; firm: string };

const RECENT_KEY = "supahealth:recent-briefs-v2";
const PROFILE_KEY = "supahealth:profile";

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
    const list = [b, ...loadRecent().filter((x) => x.meta.generatedAt !== b.meta.generatedAt)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

export default function Home() {
  const [view, setView] = useState<View>({ kind: "idle" });
  const [ledger, setLedger] = useState<LedgerState>(initialLedger);
  const [recent, setRecent] = useState<Brief[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);

  useEffect(() => { setRecent(loadRecent()); setProfile(loadProfile()); }, []);

  function saveProfile(p: Profile) {
    setProfile(p);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
  }
  useEffect(() => { window.scrollTo({ top: 0 }); }, [view.kind]);

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

  return (
    <div className="shell">
      <header className="topbar no-print">
        <button className="topbar-home" onClick={() => setView({ kind: "idle" })} aria-label="Start a new brief">
          <Logo />
        </button>
        <span className="topbar-who">Priya&apos;s workspace</span>
      </header>

      <main className="main">
        {view.kind === "done" ? (
          <BriefView brief={view.brief} onNew={() => setView({ kind: "idle" })} />
        ) : view.kind === "running" ? (
          <div className="run">
            <ResearchLedger state={ledger} investor={view.investor} firm={view.firm} />
          </div>
        ) : (
          <div className="home">
            <section className="intro">
              <h1 className="headline">Know who&apos;s across the table.</h1>
              <p className="dek">
                Enter an investor and their firm. You get a sourced brief on their recent deals, what they
                believe, how they compare you to their portfolio, your odds, and how to open with {profile.company}.
              </p>

              {view.kind === "error" && (
                <div className="alert" role="alert">
                  <strong>The brief for {view.investor} couldn&apos;t be prepared.</strong>
                  <p>{view.message}</p>
                  <button className="btn btn-quiet" onClick={() => run(view.investor, view.firm)}>Try again</button>
                </div>
              )}

              <BriefForm onSubmit={run} />

              {recent.length > 0 && (
                <div className="recent">
                  <h2 className="recent-title">Recent briefs</h2>
                  <ul>
                    {recent.map((b) => (
                      <li key={b.meta.generatedAt}>
                        <button onClick={() => setView({ kind: "done", brief: b })}>
                          <span className="recent-name">{b.investor.name}</span>
                          <span className="recent-firm">{b.investor.firm}</span>
                          <span className="recent-fit">{b.prediction.index} fit index</span>
                          <span className="recent-date">
                            {new Date(b.meta.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            <ProfilePanel key={JSON.stringify(profile)} profile={profile} onSave={saveProfile} />
          </div>
        )}
      </main>
    </div>
  );
}
