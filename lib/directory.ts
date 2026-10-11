/**
 * Starter directory of Indian venture investors relevant to a consumer / D2C
 * health brand. Pre-loaded from public information as a starting point; people
 * and focus areas change, so the app tells users to run a live brief to verify.
 */
export type DirEntry = {
  firm: string;
  people: string[];
  type: "Consumer specialist" | "Generalist VC" | "Seed fund" | "Family office / angels";
  stages: string[];
  focus: string[];
  consumerBets: string[];
  city: string;
  note: string;
};

export const DIRECTORY: DirEntry[] = [
  { firm: "Fireside Ventures", people: ["Kanwaljit Singh"], type: "Consumer specialist", stages: ["Seed", "Series A"], focus: ["Consumer brands", "Health and wellness", "Food"], consumerBets: ["Mamaearth", "boAt", "Yoga Bar"], city: "Bengaluru", note: "India's best-known consumer-brand fund; backs brand-first founders early." },
  { firm: "DSG Consumer Partners", people: ["Deepak Shahdadpuri"], type: "Consumer specialist", stages: ["Seed", "Series A"], focus: ["Consumer brands", "Food and beverage"], consumerBets: [], city: "Singapore / Mumbai", note: "Early-stage consumer specialist focused on India and Southeast Asia." },
  { firm: "Sauce.vc", people: ["Manu Chandra"], type: "Consumer specialist", stages: ["Seed", "Series A"], focus: ["Consumer brands", "Food and beverage", "Personal care"], consumerBets: ["Sleepy Owl"], city: "Delhi NCR", note: "Consumer-only fund that backs digital-first brands." },
  { firm: "Sixth Sense Ventures", people: ["Nikhil Vora"], type: "Consumer specialist", stages: ["Series A", "Series B"], focus: ["Consumer brands", "Health and wellness"], consumerBets: [], city: "Mumbai", note: "Consumer-focused fund writing growth-stage cheques." },
  { firm: "Rukam Capital", people: ["Archana Jahagirdar"], type: "Consumer specialist", stages: ["Seed", "Series A"], focus: ["Consumer brands", "Personal care", "Food"], consumerBets: ["Pilgrim"], city: "Mumbai", note: "Early-stage consumer fund with a strong brand-building lens." },
  { firm: "Titan Capital", people: ["Kunal Bahl", "Rohit Bansal"], type: "Seed fund", stages: ["Pre-seed", "Seed"], focus: ["Consumer internet", "Consumer brands"], consumerBets: ["Mamaearth"], city: "Delhi NCR", note: "Operator-led seed fund that moves fast on early rounds." },
  { firm: "Stellaris Venture Partners", people: ["Alok Goyal", "Ritesh Banglani", "Rahul Chowdhri"], type: "Generalist VC", stages: ["Seed", "Series A"], focus: ["Consumer brands", "SaaS", "Fintech"], consumerBets: ["Mamaearth"], city: "Bengaluru", note: "Early-stage generalist with consumer-brand experience." },
  { firm: "A91 Partners", people: ["Gautam Mago", "Abhay Pandey"], type: "Generalist VC", stages: ["Series B", "Growth"], focus: ["Consumer brands", "Healthcare", "Fintech"], consumerBets: ["SUGAR Cosmetics"], city: "Mumbai", note: "Growth-stage fund; relevant for later rounds rather than seed." },
  { firm: "Peak XV Partners", people: ["Shailendra Singh"], type: "Generalist VC", stages: ["Seed", "Series A", "Growth"], focus: ["Consumer brands", "Consumer internet", "SaaS"], consumerBets: ["Mamaearth"], city: "Bengaluru", note: "Formerly Sequoia India; runs the Surge early-stage programme." },
  { firm: "Kalaari Capital", people: ["Vani Kola"], type: "Generalist VC", stages: ["Seed", "Series A"], focus: ["Consumer internet", "Health", "Deep tech"], consumerBets: ["Myntra"], city: "Bengaluru", note: "Early-stage generalist with a long consumer track record." },
  { firm: "Elevation Capital", people: ["Mukul Arora"], type: "Generalist VC", stages: ["Seed", "Series A"], focus: ["Consumer internet", "Consumer brands", "Fintech"], consumerBets: ["Swiggy"], city: "Delhi NCR", note: "Early-stage generalist active in consumer businesses." },
  { firm: "Blume Ventures", people: ["Karthik Reddy", "Sanjay Nath"], type: "Seed fund", stages: ["Seed", "Series A"], focus: ["Consumer internet", "SaaS", "Fintech"], consumerBets: [], city: "Mumbai", note: "Large seed platform; consumer brands are a smaller share of the book." },
  { firm: "3one4 Capital", people: ["Pranav Pai", "Siddarth Pai"], type: "Generalist VC", stages: ["Seed", "Series A"], focus: ["Consumer brands", "Fintech", "Media"], consumerBets: ["Licious"], city: "Bengaluru", note: "Bengaluru generalist that has backed food and consumer brands." },
  { firm: "Anicut Capital", people: [], type: "Generalist VC", stages: ["Series A", "Growth"], focus: ["Consumer brands", "Lifestyle"], consumerBets: ["DailyObjects"], city: "Chennai", note: "Mix of equity and structured capital; co-led DailyObjects' Series C." },
  { firm: "Accel", people: ["Prashanth Prakash"], type: "Generalist VC", stages: ["Seed", "Series A", "Growth"], focus: ["Consumer internet", "SaaS", "Consumer brands"], consumerBets: ["Swiggy", "Flipkart"], city: "Bengaluru", note: "Large multi-stage fund; consumer brand deals are selective." },
  { firm: "Z47", people: ["Avnish Bajaj"], type: "Generalist VC", stages: ["Seed", "Series A"], focus: ["Consumer internet", "Fintech", "SaaS"], consumerBets: ["Ola"], city: "Mumbai", note: "Formerly Matrix Partners India." },
];
