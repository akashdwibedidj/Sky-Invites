import { getAuthToken } from '../site/services/siteApi';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function creditsFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface CreditBalances {
  image: number;
  video: number;
}

export interface CreditLedgerEntry {
  id: number;
  credit_type: 'image' | 'video';
  amount: number;
  reason: string;
  invitation_id: string | null;
  scene_index: number | null;
  note: string | null;
  created_at: string | null;
}

export interface CreditsSummary {
  balances: CreditBalances;
  history: CreditLedgerEntry[];
}

export interface PlanItem {
  id: string;
  name: string;
  description: string;
  image_credits: number;
  video_credits: number;
  card_count: number;
  fixed_card_count: boolean;
  amount_paise: number;
  original_amount_paise: number | null;
  discount_paise: number;
  discount_label: string | null;
  currency: string;
}

export interface PlansResponse {
  plans: PlanItem[];
  unit_prices_paise: { image: number; video: number };
  free_tier_credits: { image: number; video: number };
  credits_expire: boolean;
  rules: {
    image_initial_cost: number;
    image_free_regenerations_per_card: number;
    image_regeneration_cost: number;
    video_initial_cost: number;
  };
}

export async function fetchCredits(): Promise<CreditsSummary> {
  return creditsFetch<CreditsSummary>('/api/credits');
}

export async function fetchPlans(): Promise<PlansResponse> {
  return creditsFetch<PlansResponse>('/api/plans');
}
