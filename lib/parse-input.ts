/**
 * Layer 0: input parsing.
 * Each field accepts a plain name or a URL. We never fetch LinkedIn
 * (it requires login); we only read the name out of the profile URL.
 */

export type ParsedInvestor = {
  raw: string;
  kind: "name" | "linkedin" | "url";
  name: string;
  url?: string;
};

export type ParsedFirm = {
  raw: string;
  kind: "name" | "url";
  name: string;
  url?: string;
  domain?: string;
};

function looksLikeUrl(s: string): boolean {
  return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s.trim());
}

function toUrl(s: string): URL | null {
  try {
    const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    return new URL(withProto.trim());
  } catch {
    return null;
  }
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** "rahul-sharma-vc-4a1b2c3" -> "Rahul Sharma Vc" minus trailing ids */
function nameFromLinkedInSlug(slug: string): string {
  const parts = decodeURIComponent(slug)
    .split("-")
    .filter((p) => p && !/\d/.test(p)); // drop LinkedIn's numeric/hex suffixes
  return titleCase(parts.join(" "));
}

export function parseInvestor(input: string): ParsedInvestor {
  const raw = input.trim();
  if (looksLikeUrl(raw)) {
    const u = toUrl(raw);
    if (u && /linkedin\.com$/i.test(u.hostname.replace(/^www\./, "").split(".").slice(-2).join("."))) {
      const m = u.pathname.match(/\/in\/([^/]+)/i);
      const name = m ? nameFromLinkedInSlug(m[1]) : "";
      return { raw, kind: "linkedin", name, url: u.toString() };
    }
    if (u) return { raw, kind: "url", name: "", url: u.toString() };
  }
  return { raw, kind: "name", name: raw };
}

export function parseFirm(input: string): ParsedFirm {
  const raw = input.trim();
  if (looksLikeUrl(raw)) {
    const u = toUrl(raw);
    if (u) {
      const domain = u.hostname.replace(/^www\./, "");
      const base = domain.split(".")[0].replace(/[-_]/g, " ");
      return { raw, kind: "url", name: titleCase(base), url: u.toString(), domain };
    }
  }
  return { raw, kind: "name", name: raw };
}
