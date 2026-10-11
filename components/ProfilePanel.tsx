"use client";
import { useState } from "react";
import { defaultProfile, Profile } from "@/lib/startup-profile";

type Field = { key: keyof Profile; label: string; long?: boolean; number?: boolean };
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Company",
    fields: [
      { key: "company", label: "Company name" },
      { key: "oneLiner", label: "One-line description", long: true },
      { key: "sector", label: "Sector" },
      { key: "location", label: "City" },
      { key: "stage", label: "Stage" },
      { key: "raise", label: "Round you're raising" },
      { key: "raiseAmountCr", label: "Round size (₹ Cr)", number: true },
      { key: "revenueCr", label: "Annual revenue run-rate (₹ Cr)", number: true },
      { key: "traction", label: "Traction", long: true },
      { key: "channels", label: "Sales channels", long: true },
      { key: "differentiators", label: "What makes you different", long: true },
      { key: "useOfFunds", label: "Use of funds", long: true },
    ],
  },
  {
    title: "Founder (used to find connections)",
    fields: [
      { key: "founderName", label: "Your name" },
      { key: "founderEducation", label: "Education", long: true },
      { key: "founderCareer", label: "Past roles and companies", long: true },
      { key: "founderNetwork", label: "Angels, advisors, communities", long: true },
    ],
  },
];

export function ProfilePanel({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [error, setError] = useState("");

  if (editing) {
    return (
      <aside className="profile profile-edit" aria-labelledby="profile-edit-title">
        <h2 id="profile-edit-title" className="profile-title">Edit what briefs are tailored to</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const r = Profile.safeParse(draft);
            if (!r.success) { setError("Check the numbers: round size and revenue must be numbers."); return; }
            setError(""); onSave(r.data); setEditing(false);
          }}
        >
          {GROUPS.map((g) => (
            <fieldset key={g.title}>
              <legend>{g.title}</legend>
              {g.fields.map((f) => (
                <label key={f.key} className="pfield">
                  <span>{f.label}</span>
                  {f.long ? (
                    <textarea rows={2} value={String(draft[f.key])} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                  ) : (
                    <input
                      type={f.number ? "number" : "text"} step="0.1" min="0"
                      value={String(draft[f.key])}
                      onChange={(e) => setDraft({ ...draft, [f.key]: f.number ? e.target.value : e.target.value } as Profile)}
                    />
                  )}
                </label>
              ))}
            </fieldset>
          ))}
          {error && <p className="perror" role="alert">{error}</p>}
          <div className="pactions">
            <button type="submit" className="btn btn-light">Save profile</button>
            <button type="button" className="btn btn-dark-ghost" onClick={() => { setDraft(profile); setEditing(false); }}>Cancel</button>
            <button type="button" className="btn btn-dark-ghost" onClick={() => setDraft(defaultProfile)}>Reset to default</button>
          </div>
        </form>
      </aside>
    );
  }

  return (
    <aside className="profile" aria-labelledby="profile-title">
      <h2 id="profile-title" className="profile-title">Every brief is tailored to {profile.company}</h2>
      <p className="profile-line">{profile.oneLiner}</p>
      <dl className="profile-facts">
        <div><dt>Stage</dt><dd>{profile.stage}, raising ₹{profile.raiseAmountCr} Cr</dd></div>
        <div><dt>Traction</dt><dd>{profile.traction}</dd></div>
        <div><dt>Channels</dt><dd>{profile.channels}</dd></div>
        <div><dt>Founder</dt><dd>{profile.founderName}: {profile.founderEducation}</dd></div>
        <div><dt>Network</dt><dd>{profile.founderNetwork}</dd></div>
      </dl>
      <button className="btn btn-light" onClick={() => { setDraft(profile); setEditing(true); }}>Edit profile</button>
      <p className="profile-note">The founder details power the connections section. Use your real background for the best matches.</p>
    </aside>
  );
}
