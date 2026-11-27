export type InvitationCategory =
  | 'Wedding'
  | 'Engagement'
  | 'Birthday'
  | 'Baby Shower'
  | 'Anniversary'
  | 'Corporate';

export type CardVisualLayout =
  | 'mughal'
  | 'floral'
  | 'minimal'
  | 'vintage'
  | 'peacock-dark';

export type InvitationStatus = 'Draft' | 'Ready' | 'Video coming soon';

export type AccountType = 'individual' | 'business';

export type BusinessTypeOption =
  | 'Invitation company'
  | 'Wedding planner'
  | 'Event agency'
  | 'Print studio'
  | 'Other';

export type MonthlyVolumeOption =
  | 'Under 10'
  | '10 to 50'
  | '50 to 200'
  | '200+';

export interface CategoryInfo {
  name: InvitationCategory;
  folioNumber: string;
  tagline: string;
  sampleIdea: string;
}

export interface InvitationExample {
  id: string;
  category: InvitationCategory;
  cardLayout: CardVisualLayout;
  moodWord: string;
  title: string;
  eyebrow: string;
  names: string;
  monogram?: string;
  dateText: string;
  venueText: string;
  rsvpLine?: string;
  posterImage?: string;
  /**
   * Set true when the card image already includes printed calligraphy.
   */
  hasEmbeddedCalligraphy?: boolean;
  /**
   * Video URL slot for when video invitations launch.
   */
  videoUrl?: string;
  gradientClass: string;
  theme: 'light' | 'dark';
}

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export interface FeatureItem {
  id: string;
  index: string;
  title: string;
  description: string;
}

export interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  priceLabel: string;
  cadence: string;
  description: string;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
  comingSoon?: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface InvitationItem {
  id: string;
  title: string;
  category: InvitationCategory;
  moodWord?: string;
  status: InvitationStatus;
  updatedAt: string;
  posterImage?: string;
  hasEmbeddedCalligraphy?: boolean;
  videoUrl?: string;
  gradientClass: string;
  theme: 'light' | 'dark';
  dateText: string;
  venueText: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  accountType?: AccountType;
}

/* ---------------- API Request & Response Types ---------------- */

export interface WaitlistRequest {
  name: string;
  email: string;
  whatsapp?: string;
  eventType: InvitationCategory;
  website?: string;
}

export interface WaitlistResponse {
  success: boolean;
  message: string;
  position?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  accountType?: AccountType;
}

export interface GoogleAuthRequest {
  idToken?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ListInvitationsResponse {
  items: InvitationItem[];
}

export interface ContactRequest {
  name: string;
  email: string;
  reason?: string;
  subject: string;
  message: string;
  website?: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export interface BusinessEnquiryRequest {
  businessName: string;
  contactName: string;
  workEmail: string;
  whatsapp?: string;
  businessType: BusinessTypeOption;
  monthlyVolume: MonthlyVolumeOption;
  message: string;
  website?: string;
}

export interface BusinessEnquiryResponse {
  success: boolean;
  message: string;
}
