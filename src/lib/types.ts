export type ProspectStatus = "new" | "researched" | "draft_ready" | "approved" | "rejected" | "sent" | "suppressed";
export type Prospect = {
  id: string;
  companyName: string;
  website?: string;
  contactName?: string;
  role?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;
  notes?: string;
  status: ProspectStatus;
  createdAt: number;
  research?: ProspectResearch;
  draft?: ProspectDraft;
};
export type CampaignSettings = {
  name: string;
  timezone: "Asia/Kolkata";
  windowStart: string;
  windowEnd: string;
  dailyLimit: number;
  sendingDays: number[];
};

export type ProspectResearch = {
  overview: string;
  services: string[];
  creativeSignals: string[];
  notableWork: { name: string; detail: string; sourceUrl: string }[];
  publicContactDetails: string[];
  outreachAngles: string[];
  claimsToVerify: string[];
  confidence: "high" | "medium" | "low";
  sources: { url: string; title: string; retrievedAt: string }[];
  researchedAt: string;
  researchedBy: string;
};

export type ProspectDraft = {
  subject: string;
  body: string;
  personalisationBasis: string[];
  claimsToVerify: string[];
  status: "draft" | "approved" | "rejected";
  generatedAt: string;
  approvedAt?: string;
  editedAt?: string;
};
