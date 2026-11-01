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
};
export type CampaignSettings = {
  name: string;
  timezone: "Asia/Kolkata";
  windowStart: "07:00";
  windowEnd: "10:00";
  dailyLimit: number;
  sendingDays: number[];
};
