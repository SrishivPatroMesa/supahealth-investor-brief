import { z } from "zod";

/**
 * The founder's startup and personal profile. Every brief is tailored to this.
 * The defaults below are assumptions for the assignment; Priya can edit them
 * in the app (saved in her browser) and the edited version is sent with each request.
 */
export const Profile = z.object({
  company: z.string().max(80),
  oneLiner: z.string().max(300),
  sector: z.string().max(200),
  location: z.string().max(100),
  stage: z.string().max(60),
  raise: z.string().max(120),
  raiseAmountCr: z.coerce.number().min(0).max(10000),
  revenueCr: z.coerce.number().min(0).max(100000),
  traction: z.string().max(500),
  channels: z.string().max(300),
  differentiators: z.string().max(500),
  useOfFunds: z.string().max(400),
  founderName: z.string().max(80),
  founderEducation: z.string().max(300),
  founderCareer: z.string().max(400),
  founderNetwork: z.string().max(500),
});
export type Profile = z.infer<typeof Profile>;

export const defaultProfile: Profile = {
  company: "SupaHealth",
  oneLiner: "Protein supplements built for Indian diets, with a lab report published for every batch.",
  sector: "D2C consumer health and nutrition (whey protein, plant protein, protein bars)",
  location: "Bengaluru, India",
  stage: "Seed",
  raise: "₹10 Cr seed round (pre-Series A)",
  raiseAmountCr: 10,
  revenueCr: 2.4,
  traction: "₹2.4 Cr ARR; ~15% month-on-month growth; 45% repeat purchase rate; 60,000+ customers; founded 2023",
  channels: "Own website 55%, Amazon 25%, quick commerce (Blinkit, Zepto) 20%",
  differentiators:
    "Batch-level third-party lab reports published openly (the category's trust problem); formulations for Indian vegetarian diets; FSSAI compliant, clean label",
  useOfFunds: "Expand quick-commerce distribution; launch a women's protein line; build in-house R&D and clinical testing",
  founderName: "Priya",
  founderEducation: "B.Tech, NIT Trichy; MBA, IIM Bangalore",
  founderCareer: "Brand manager in the nutrition portfolio at Hindustan Unilever; growth lead at a Bengaluru D2C wellness startup",
  founderNetwork:
    "IIM Bangalore alumni network; Bengaluru consumer founders community; operator angels from consumer brands",
};

export function profileAsText(p: Profile): string {
  return [
    `Company: ${p.company} — ${p.oneLiner}`,
    `Sector: ${p.sector}`,
    `Location: ${p.location}`,
    `Stage: ${p.stage}; raising ${p.raise} (₹${p.raiseAmountCr} Cr)`,
    `Traction: ${p.traction}`,
    `Channels: ${p.channels}`,
    `Differentiators: ${p.differentiators}`,
    `Use of funds: ${p.useOfFunds}`,
    `Founder: ${p.founderName}. Education: ${p.founderEducation}. Career: ${p.founderCareer}. Network: ${p.founderNetwork}`,
  ].join("\n");
}

export function resolveProfile(input: unknown): Profile {
  const r = Profile.safeParse(input);
  return r.success ? r.data : defaultProfile;
}
