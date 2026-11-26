import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COPY } from '../content/copy';
import { FAQ_ITEMS } from '../mock/data';
import { BotanicalDivider } from '../components/Ornaments';
import { PricingCards } from '../components/PricingCards';
import { fetchPlans, type PlansResponse } from '../../services/creditsApi';
import type { PricingTier } from '../types';

const FALLBACK_PACKS: PricingTier[] = [
  {
    id: 'image_pack_5',
    name: 'Image Pack',
    priceLabel: '₹249',
    cadence: '5 image credits',
    description: '5 image credits for your invitation cards. Credits never expire.',
    features: ['5 card image credits', '1 free regeneration per card', 'Credits never expire'],
    ctaLabel: 'Coming soon',
    comingSoon: true,
  },
  {
    id: 'video_invite_30s',
    name: 'Video Invite 30 sec',
    badge: 'Popular',
    priceLabel: '₹899',
    cadence: '3 cards (images + videos)',
    description: '3 cards with both images and 10-second videos. Credits never expire.',
    features: ['3 image credits + 3 video credits', '3-card animated invitation', 'Credits never expire'],
    ctaLabel: 'Coming soon',
    highlighted: true,
    comingSoon: true,
  },
  {
    id: 'video_invite_1m',
    name: 'Video Invite 1 min',
    priceLabel: '₹1,799',
    cadence: '6 cards (fixed)',
    description: '6 cards with both images and 10-second videos. Fixed 6-card invite.',
    features: ['6 image credits + 6 video credits', 'Fixed 6-card animated invitation', 'Credits never expire'],
    ctaLabel: 'Coming soon',
    comingSoon: true,
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'individuals' | 'businesses'>('individuals');
  const [plansData, setPlansData] = useState<PlansResponse | null>(null);

  useEffect(() => {
    fetchPlans()
      .then(setPlansData)
      .catch(() => {});
  }, []);

  const individualTiers: PricingTier[] = plansData
    ? plansData.plans.map((p) => ({
        id: p.id,
        name: p.name,
        badge: p.id === 'video_invite_30s' ? 'Popular' : undefined,
        priceLabel: `₹${(p.amount_paise / 100).toLocaleString('en-IN')}`,
        cadence: p.fixed_card_count ? `${p.card_count} cards (fixed)` : `${p.image_credits} image credits`,
        description: `${p.description}. Credits never expire.`,
        features: [
          p.video_credits > 0
            ? `${p.image_credits} image credits + ${p.video_credits} video credits`
            : `${p.image_credits} card image credits`,
          p.fixed_card_count ? `Fixed ${p.card_count}-card invitation` : '1 free regeneration per card',
          'Credits never expire',
        ],
        ctaLabel: 'Coming soon',
        highlighted: p.id === 'video_invite_30s',
        comingSoon: true,
      }))
    : FALLBACK_PACKS;

  const handleNotifyIndividuals = () => {
    navigate('/');
    window.setTimeout(() => {
      document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTalkToUsBusiness = () => {
    navigate('/business');
    window.setTimeout(() => {
      document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/55 bg-ivory/78 px-6 py-8 text-center shadow-[var(--shadow-editorial)] backdrop-blur-md sm:px-10">
        <p className="text-xs font-medium text-gold-dark">{COPY.pricingPage.eyebrow}</p>
        <h1 className="mt-3 font-site-serif text-4xl font-semibold text-peacock sm:text-5xl text-balance">
          {COPY.pricingPage.heading}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted sm:text-base">
          {COPY.pricingPage.subline}
        </p>

        {/* Audience Switch Tabs */}
        <div
          role="tablist"
          aria-label="Pricing plans by audience"
          className="mt-7 inline-flex items-center rounded-full border border-peacock/15 bg-ivory-soft/90 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'individuals'}
            onClick={() => setActiveTab('individuals')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'individuals'
                ? 'bg-peacock text-ivory shadow-sm'
                : 'text-ink-muted hover:text-peacock'
            }`}
          >
            {COPY.pricingPage.tabs.individuals}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'businesses'}
            onClick={() => setActiveTab('businesses')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'businesses'
                ? 'bg-peacock text-ivory shadow-sm'
                : 'text-ink-muted hover:text-peacock'
            }`}
          >
            {COPY.pricingPage.tabs.businesses}
          </button>
        </div>
      </div>

      {activeTab === 'individuals' ? (
        <>
          <div className="mt-12">
            <PricingCards tiers={individualTiers} onNotifyClick={handleNotifyIndividuals} />
            <p className="mt-6 text-center text-xs text-ink-muted">
              Unit prices: ₹{(plansData?.unit_prices_paise.image ?? 5000) / 100} per card image · ₹{(plansData?.unit_prices_paise.video ?? 29900) / 100} per 10-second card video · Credits never expire.
            </p>
          </div>

          <BotanicalDivider className="my-16" />

          <div className="mx-auto max-w-4xl rounded-xl border border-peacock/15 bg-ivory-card/90 p-7 shadow-[var(--shadow-editorial)] backdrop-blur-md sm:p-10">
            <h2 className="font-site-serif text-2xl font-semibold text-peacock sm:text-3xl">
              {COPY.pricingPage.individualsDetails.heading}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {COPY.pricingPage.individualsDetails.items.map((item) => (
                <div key={item.title}>
                  <h3 className="font-site-serif text-xl font-semibold text-peacock">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-hairline pt-6">
              <h3 className="font-site-serif text-xl font-semibold text-peacock">
                {COPY.pricingPage.individualsDetails.billingHeading}
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {FAQ_ITEMS.slice(4, 6).map((item) => (
                  <div key={item.id}>
                    <p className="text-sm font-medium text-peacock">{item.question}</p>
                    <p className="mt-1 text-sm text-ink-muted">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/editor/create"
                className="btn-glass-peacock inline-flex items-center justify-center px-6 py-3 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
              >
                {COPY.pricingPage.individualsDetails.tryCta}
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab('businesses')}
                className="text-sm font-medium text-peacock underline decoration-gold underline-offset-4 hover:text-peacock-deep"
              >
                {COPY.pricingPage.individualsDetails.businessLink}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-peacock/15 bg-ivory-card/90 p-8 text-center shadow-[var(--shadow-editorial)] backdrop-blur-md sm:p-12">
          <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl">
            {COPY.pricingPage.businessesDetails.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
            {COPY.pricingPage.businessesDetails.subline}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleTalkToUsBusiness}
              className="btn-glass-peacock inline-flex items-center justify-center px-7 py-3 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
            >
              {COPY.pricingPage.businessesDetails.talkCta}
            </button>
            <Link
              to="/business"
              className="btn-glass-light inline-flex items-center justify-center px-7 py-3 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
            >
              {COPY.home.businessCallout.cta}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
