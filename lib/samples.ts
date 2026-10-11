import type { CalMeeting } from "./calendar";

/** Example meetings for demos. Only the meetings are samples; every brief is still researched live. */
const PEOPLE: [string, string, number, number, number][] = [
  // investor, firm, days from today, hour, minute
  ["Kanwaljit Singh", "Fireside Ventures", 1, 11, 0],
  ["Manu Chandra", "Sauce.vc", 2, 15, 0],
  ["Archana Jahagirdar", "Rukam Capital", 3, 16, 30],
  ["Vani Kola", "Kalaari Capital", 5, 10, 30],
];

const pad = (n: number) => String(n).padStart(2, "0");
const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const at = (now: Date, days: number, h: number, m: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);

export function sampleMeetings(now = new Date()): CalMeeting[] {
  return PEOPLE.map(([investor, firm, days, h, m], i) => ({
    id: `sample-${i}`, investor, firm, when: local(at(now, days, h, m)), source: "sample" as const,
  }));
}

/** A small .ics file with the same meetings, for testing the calendar import. */
export function sampleIcs(now = new Date()): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = PEOPLE.map(([investor, firm, days, h, m], i) => {
    const start = at(now, days, h, m);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    return ["BEGIN:VEVENT", `UID:sample-ics-${i}@supahealth-briefs`, `DTSTAMP:${f(now)}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${investor} (${firm})`, "DESCRIPTION:Sample investor meeting", "END:VEVENT"].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SupaHealth//Investor Briefs Sample//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function downloadText(name: string, text: string, type = "text/calendar") {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
