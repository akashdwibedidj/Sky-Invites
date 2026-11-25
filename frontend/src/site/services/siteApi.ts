/**
 * Sky Invites API Service
 * =======================
 * Currently configured with USE_MOCK = true so the frontend runs standalone.
 *
 * When connecting to your FastAPI backend (default http://localhost:8000):
 * 1. Set VITE_API_URL in your .env file (e.g. VITE_API_URL=http://localhost:8000).
 * 2. Flip USE_MOCK below from `true` to `false`.
 * 3. Ensure your backend implements these endpoints:
 *    - joinWaitlist         -> POST /api/waitlist
 *    - signup               -> POST /api/auth/signup
 *    - login                -> POST /api/auth/login
 *    - googleLogin          -> POST /api/auth/google
 *    - getMe                -> GET  /api/auth/me
 *    - listMyInvitations    -> GET  /api/invitations
 *    - sendContactMessage   -> POST /api/contact
 *    - sendBusinessEnquiry  -> POST /api/business/enquiry
 */

import { COPY } from '../content/copy';
import { MOCK_INVITATIONS, MOCK_USER } from '../mock/data';
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

export const USE_MOCK = true;

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

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
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

export async function joinWaitlist(payload: WaitlistRequest): Promise<WaitlistResponse> {
  if (USE_MOCK) {
    await mockDelay(500);
    return {
      success: true,
      message: COPY.home.waitlist.successMessage,
    };
  }

  return request<WaitlistResponse>('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function signup(payload: SignupRequest): Promise<AuthResponse> {
  if (USE_MOCK) {
    await mockDelay(500);
    const token = 'mock_jwt_sky_invites_' + Date.now();
    return {
      access_token: token,
      token_type: 'bearer',
      user: {
        id: 'usr_' + Date.now(),
        name: payload.name.trim() || 'Guest Host',
        email: payload.email.trim(),
        accountType: payload.accountType || 'individual',
      },
    };
  }

  return request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  if (USE_MOCK) {
    await mockDelay(450);
    if (!payload.email.includes('@') || payload.password.length < 6) {
      throw new Error(COPY.auth.errors.genericAuth);
    }
    const token = 'mock_jwt_sky_invites_' + Date.now();
    return {
      access_token: token,
      token_type: 'bearer',
      user: {
        ...MOCK_USER,
        email: payload.email.trim(),
      },
    };
  }

  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function googleLogin(payload: GoogleAuthRequest = {}): Promise<AuthResponse> {
  if (USE_MOCK) {
    await mockDelay(450);
    const token = 'mock_google_jwt_sky_invites_' + Date.now();
    return {
      access_token: token,
      token_type: 'bearer',
      user: MOCK_USER,
    };
  }

  return request<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<User> {
  if (USE_MOCK) {
    await mockDelay(200);
    return MOCK_USER;
  }

  return request<User>('/api/auth/me', {
    method: 'GET',
  });
}

export async function listMyInvitations(): Promise<ListInvitationsResponse> {
  if (USE_MOCK) {
    await mockDelay(350);
    return {
      items: MOCK_INVITATIONS,
    };
  }

  return request<ListInvitationsResponse>('/api/invitations', {
    method: 'GET',
  });
}

export async function sendContactMessage(payload: ContactRequest): Promise<ContactResponse> {
  if (USE_MOCK) {
    await mockDelay(450);
    return {
      success: true,
      message: COPY.contactPage.successMessage,
    };
  }

  return request<ContactResponse>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendBusinessEnquiry(
  payload: BusinessEnquiryRequest,
): Promise<BusinessEnquiryResponse> {
  if (USE_MOCK) {
    await mockDelay(450);
    return {
      success: true,
      message: COPY.businessPage.enquiry.successMessage,
    };
  }

  return request<BusinessEnquiryResponse>('/api/business/enquiry', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
