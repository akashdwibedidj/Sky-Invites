/**
 * How to add or remove a sample invitation (3 steps):
 * 1. Drop your poster image (and optional .mp4 video) into `frontend/public/examples/`.
 * 2. Add or delete one entry in `SAMPLE_EXAMPLES` below (files are served at `/examples/<file>`).
 * 3. Save this file.
 */

import type { InvitationCategory } from '../types';

export interface SampleExample {
  id: string;
  title: string;
  category: InvitationCategory;
  posterImage: string;
  videoFile?: string;
  caption: string;
}

// TEMP: replace with real examples
export const SAMPLE_EXAMPLES: SampleExample[] = [
  {
    id: 'watercolor-garden',
    title: 'Watercolor Garden',
    category: 'Wedding',
    posterImage: '/examples/invite_watercolor_garden_1795456528903.jpg',
    caption: 'Soft botanical watercolor invitation style',
  },
  {
    id: 'peacock-gold',
    title: 'Peacock & Gold',
    category: 'Engagement',
    posterImage: '/examples/invite_peacock_gold_1795537607655.jpg',
    caption: 'Deep teal and gold foil motif',
  },
  {
    id: 'mughal-royal',
    title: 'Mughal Arch',
    category: 'Wedding',
    posterImage: '/examples/invite_mughal_royal_1795456528683.jpg',
    caption: 'Traditional arch framing with warm ivory tones',
  },
  {
    id: 'vintage-wax',
    title: 'Vintage Wax Seal',
    category: 'Anniversary',
    posterImage: '/examples/invite_vintage_wax_1795456527179.jpg',
    caption: 'Classic textured paper with wax seal detail',
  },
  {
    id: 'editorial-minimal',
    title: 'Editorial Minimal',
    category: 'Corporate',
    posterImage: '/examples/invite_editorial_minimal_1795456528848.jpg',
    caption: 'Clean typographic layout for formal gatherings',
  },
  {
    id: 'wedding-royal',
    title: 'Royal Crest',
    category: 'Wedding',
    posterImage: '/examples/invite_wedding_royal_1795454547231.jpg',
    caption: 'Ornate gold-bordered celebration card',
  },
  {
    id: 'engagement-twilight',
    title: 'Twilight Floral',
    category: 'Engagement',
    posterImage: '/examples/invite_engagement_twilight_1795454546591.jpg',
    caption: 'Evening floral palette for engagement announcements',
  },
  {
    id: 'birthday-soiree',
    title: 'Birthday Soirée',
    category: 'Birthday',
    posterImage: '/examples/invite_birthday_soiree_1795454546471.jpg',
    caption: 'Festive evening invitation design',
  },
  {
    id: 'baby-shower',
    title: 'Pastel Keepsake',
    category: 'Baby Shower',
    posterImage: '/examples/invite_baby_shower_1795454546120.jpg',
    caption: 'Gentle pastel illustration for baby showers',
  },
];
