/**
 * Sky Invites Site API Service
 * USE_MOCK = true only for waitlist, contact, and business enquiry.
 * Auth and invitation listing are real (Plan 4).
 */

import { COPY } from '../content/copy';
import { MOCK_INVITATIONS } from '../mock/data';
import type {
  AuthResponse,
  BusinessEnquiryRequest,
  BusinessEnquiryResponse,
  ContactRequest,
  ContactResponse,
  GoogleAuthRequest,
  ListInvitationsResponse,
  LoginRequest,
  SignupRequest,
  User,
  WaitlistRequest,
  WaitlistResponse,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'sky_invites_token';

let memoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      memoryToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/** Clears token and redirects to /login (global 401 handler). */
function handleUnauthorized(path: string): void {
  // Don't redirect when already on auth pages
  const authPaths = ['/login', '/signup'];
  if (authPaths.some((p) => window.location.pathname.startsWith(p))) return;
  setAuthToken(null);
  window.location.replace('/login?session=expired');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Global 401 handler — skip for auth endpoints themselves
  if (response.status === 401) {
    const authEndpoints = ['/api/auth/login', '/api/auth/signup', '/api/auth/google'];
    const isAuthEndpoint = authEndpoints.some((ep) => path.startsWith(ep));
    if (!isAuthEndpoint) {
      handleUnauthorized(path);
      // Throw so callers see an error
      throw new Error('Session expired. Please log in again.');
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    const message =
      (data && typeof data === 'object' && ('detail' in data ? data.detail : data.message)) ||
      (typeof data === 'string' && data) ||
      `Something went wrong (${response.status}). Please try again.`;
    throw new Error(String(message));
  }

  return data as T;
}

function mockDelay(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Auth — REAL (USE_MOCK = false for these) ──────────────────────────────────

export async function signup(payload: SignupRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function googleLogin(payload: GoogleAuthRequest = {}): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<User> {
  return request<User>('/api/auth/me', {
    method: 'GET',
  });
}

export async function listMyInvitations(): Promise<ListInvitationsResponse> {
  return request<ListInvitationsResponse>('/api/invitations', {
    method: 'GET',
  });
}

// ── Lead capture — REAL ───────────────────────────────────────────────────────

export async function joinWaitlist(payload: WaitlistRequest): Promise<WaitlistResponse> {
  return request<WaitlistResponse>('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendContactMessage(payload: ContactRequest): Promise<ContactResponse> {
  return request<ContactResponse>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendBusinessEnquiry(
  payload: BusinessEnquiryRequest,
): Promise<BusinessEnquiryResponse> {
  return request<BusinessEnquiryResponse>('/api/business/enquiry', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
