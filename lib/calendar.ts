/** Minimal .ics import / export for meetings. Works with Cal.com, Google Calendar and Outlook exports. */
export type CalMeeting = { id: string; investor: string; firm: string; when: string; source?: "manual" | "calendar" };

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function parseIcsDate(v: string): Date | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "09", mi = "00", s = "00", z] = m;
  return z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

/** "Rahul Sharma (Acme Ventures)", "Rahul Sharma - Acme Ventures", "Priya <> Rahul Sharma | Acme" */
function splitTitle(title: string): { investor: string; firm: string } {
  let t = title.replace(/\\,/g, ",").replace(/\s+/g, " ").trim();
  t = t.replace(/^((intro|investor|quick|first)\s+)?(meeting|call|intro|catch[- ]up|chat)\s*(with|:)?\s*/i, "").replace(/\b(priya|supahealth)\s*(<>|x|&|and|\/)\s*/i, "");
  const paren = t.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (paren) return { investor: paren[1].trim(), firm: paren[2].trim() };
  const parts = t.split(/\s+[-–|@]\s+|\s+at\s+/i);
  if (parts.length >= 2) return { investor: parts[0].trim(), firm: parts.slice(1).join(" ").trim() };
  return { investor: t, firm: "" };
}

export function parseIcs(text: string, now = new Date()): CalMeeting[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out: CalMeeting[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (key: string) => body.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, "m"))?.[1]?.trim() ?? "";
    const start = parseIcsDate(get("DTSTART"));
    const summary = get("SUMMARY");
    if (!start || !summary || start.getTime() < now.getTime() - 24 * 3600 * 1000) continue;
    const { investor, firm } = splitTitle(summary);
    const uid = get("UID") || `${summary}-${start.toISOString()}`;
    out.push({ id: `ics-${uid}`, investor, firm, when: toLocalInput(start), source: "calendar" });
  }
  return out.sort((a, b) => a.when.localeCompare(b.when));
}

export function meetingIcs(m: CalMeeting, appUrl: string): string {
  const start = new Date(m.when);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[,;\\]/g, (c) => `\\${c}`);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SupaHealth//Investor Briefs//EN", "BEGIN:VEVENT",
    `UID:${m.id}@supahealth-briefs`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:${esc(`${m.investor}${m.firm ? ` (${m.firm})` : ""}`)}`,
    `DESCRIPTION:${esc(`Investor meeting. Prepare the brief: ${appUrl}`)}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Prepare the investor brief", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
