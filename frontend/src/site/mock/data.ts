import { COPY } from '../content/copy';
import type {
  CategoryInfo,
  FaqItem,
  FeatureItem,
  HowItWorksStep,
  InvitationCategory,
  InvitationItem,
  PricingTier,
  User,
} from '../types';

export const CATEGORY_LIST: InvitationCategory[] = [
  'Wedding',
  'Engagement',
  'Birthday',
  'Baby Shower',
  'Anniversary',
  'Corporate',
];

export const CATEGORIES: CategoryInfo[] = COPY.categoriesList;


export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = COPY.howItWorksSteps;



export const FEATURES: FeatureItem[] = COPY.featuresList;

/**
 * Keep null/hidden unless populated by real live backend data.
 */
export const WAITLIST_INITIAL_COUNT: number | null = null;

/**
 * Individuals pricing tier: Free Invite only.
 */
export const PRICING_TIERS: PricingTier[] = COPY.individualPlans;

export const FAQ_ITEMS: FaqItem[] = COPY.faqItems;

export const MOCK_USER: User = {
  id: 'usr_demo_01',
  name: 'Meera Kapoor',
  email: 'meera@skyinvites.demo',
  accountType: 'individual',
};

export const MOCK_INVITATIONS: InvitationItem[] = [
  {
    id: 'inv_101',
    title: 'Celia & Elias — Engagement',
    category: 'Engagement',
    moodWord: 'Golden',
    status: 'Video coming soon',
    updatedAt: 'Updated 2 hours ago',
    posterImage: '/assets/images/invite_peacock_gold_1795537607655.jpg',
    hasEmbeddedCalligraphy: true,
    gradientClass: 'from-[#0E3A3C] via-[#134648] to-[#082628]',
    theme: 'dark',
    dateText: '21 September',
    venueText: 'Laurel Oaks Estate',
  },
  {
    id: 'inv_102',
    title: 'Aarav & Meera — Wedding',
    category: 'Wedding',
    moodWord: 'Garden',
    status: 'Ready',
    updatedAt: 'Updated yesterday',
    posterImage: '/assets/images/invite_watercolor_garden_1795456528903.jpg',
    gradientClass: 'from-[#FAF7F0] via-[#EFE4D2] to-[#E2CEB0]',
    theme: 'light',
    dateText: '22 – 24 November',
    venueText: 'Udaipur',
  },
  {
    id: 'inv_103',
    title: 'Tara’s 30th Dinner',
    category: 'Birthday',
    moodWord: 'Joyful',
    status: 'Ready',
    updatedAt: 'Updated 3 days ago',
    posterImage: '/assets/images/invite_birthday_soiree_1795454546471.jpg',
    gradientClass: 'from-[#F8F1E5] via-[#EFE1CA] to-[#DFC8A6]',
    theme: 'light',
    dateText: '6 December',
    venueText: 'New Delhi',
  },
  {
    id: 'inv_104',
    title: 'Rajesh & Sunita — 25th Anniversary',
    category: 'Anniversary',
    moodWord: 'Classic',
    status: 'Draft',
    updatedAt: 'Updated 5 days ago',
    posterImage: '/assets/images/invite_vintage_wax_1795456527179.jpg',
    gradientClass: 'from-[#FBF6F1] via-[#F4E6DD] to-[#E8D2C3]',
    theme: 'light',
    dateText: '21 December',
    venueText: 'Jaipur',
  },
];
