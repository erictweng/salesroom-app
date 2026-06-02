/** Shared domain types mirroring the CRM API shapes plus our local entities. */

export type Role = "rep" | "buyer";

export interface CrmUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Account {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employee_count: number;
  annual_revenue: string;
  hq_location: string;
  account_stage: string;
  account_owner: string;
  tech_stack: string[];
  recent_news: string;
  icp_fit_score: number;
  created_at: string;
}

export interface Contact {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  role: string; // Champion | Economic Buyer | Technical Evaluator | End User | Executive Sponsor
  seniority: string; // C-Suite | VP | Director | Manager | IC
  phone: string;
  linkedin_url: string;
  last_activity_date: string;
  engagement_score: number;
  is_primary: boolean;
}

export interface Opportunity {
  id: string;
  account_id: string;
  name: string;
  stage: string;
  amount: number;
  currency: string;
  close_date: string;
  type: string;
  owner: string;
  products: string[];
  next_step: string;
  created_at: string;
  days_in_stage: number;
  competitors: string[];
}

export type ContentType = "video" | "document" | "case_study" | "one_pager";

export interface Content {
  id: string;
  title: string;
  type: ContentType;
  url: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  category: string;
  tags: string[];
  description: string;
}

export interface Enrichment {
  account_id: string;
  technologies: string[];
  compliance_frameworks: string[];
  funding_stage: string;
  hiring_signals: string[];
  web_traffic_trend: string;
  social_presence: Record<string, number>;
}

/** Local (SQLite) entities. */

export type RoomStatus = "draft" | "published";

export interface Room {
  id: number;
  slug: string;
  account_id: string;
  title: string;
  status: RoomStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoomResource {
  id: number;
  room_id: number;
  content_id: string;
  position: number;
  hidden: number; // 0/1 (sqlite boolean)
  created_at: string;
}

export interface EventRecord {
  id: number;
  room_id: number;
  type: string;
  content_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  metadata: string | null; // JSON string
  created_at: string;
}
