import { getAuthToken } from '../site/services/siteApi';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export interface CreateOrderResponse {
  order_id: string;
  gateway_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
}

export interface OrderRecord {
  id: string;
  pack_id: string;
  amount_paise: number;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function paymentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export function createOrder(packId: string): Promise<CreateOrderResponse> {
  return paymentFetch<CreateOrderResponse>('/api/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ pack_id: packId }),
  });
}

export function verifyPayment(payload: VerifyPaymentPayload): Promise<OrderRecord> {
  return paymentFetch<OrderRecord>('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchOrder(orderId: string): Promise<OrderRecord> {
  return paymentFetch<OrderRecord>(`/api/orders/${encodeURIComponent(orderId)}`);
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
