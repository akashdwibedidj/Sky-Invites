import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PRICING_TIERS } from '../mock/data';
import type { PricingTier } from '../types';

interface PricingCardsProps {
  onNotifyClick: () => void;
  onBuyClick?: (tier: PricingTier) => void;
  buyingPackId?: string | null;
  tiers?: PricingTier[];
}

export function PricingCards({
  onNotifyClick,
  onBuyClick,
  buyingPackId = null,
  tiers = PRICING_TIERS,
}: PricingCardsProps) {
  const gridClass =
    tiers.length === 1
      ? 'mx-auto grid max-w-md grid-cols-1'
      : tiers.length === 2
        ? 'mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch'
        : 'grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch';

  return (
    <div className={gridClass}>
      {tiers.map((tier) => {
        const isHighlighted = Boolean(tier.highlighted);
        return (
          <div
            key={tier.id}
            className={`flex flex-col justify-between rounded-xl p-7 sm:p-8 transition-colors duration-150 ${
              isHighlighted
                ? 'bg-peacock/95 text-ivory shadow-[var(--shadow-editorial)] ring-1 ring-gold/40'
                : 'border border-hairline bg-ivory-card/95 text-ink'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={`font-site-serif text-2xl font-semibold ${
                    isHighlighted ? 'text-ivory' : 'text-peacock'
                  }`}
                >
                  {tier.name}
                </h3>
                {tier.badge && (
                  <span
                    className={`text-xs font-medium ${
                      isHighlighted ? 'text-gold' : 'text-gold-dark'
                    }`}
                  >
                    {tier.badge}
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-baseline gap-2.5">
                <span
                  className={`font-site-serif text-4xl font-semibold tabular-nums ${
                    isHighlighted ? 'text-ivory' : 'text-peacock'
                  }`}
                >
                  {tier.priceLabel}
                </span>
                <span
                  className={`text-xs ${
                    isHighlighted ? 'text-ivory/75' : 'text-ink-muted'
                  }`}
                >
                  · {tier.cadence}
                </span>
              </div>

              <p
                className={`mt-4 text-sm leading-relaxed ${
                  isHighlighted ? 'text-ivory/85' : 'text-ink-muted'
                }`}
              >
                {tier.description}
              </p>

              <ul className="mt-6 space-y-3 border-t border-current/15 pt-6 text-sm">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isHighlighted ? 'text-gold' : 'text-gold-dark'
                      }`}
                    />
                    <span className={isHighlighted ? 'text-ivory/90' : 'text-ink'}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              {tier.comingSoon ? (
                <button
                  type="button"
                  disabled
                  className={`w-full px-5 py-3 text-sm font-medium whitespace-nowrap opacity-60 cursor-not-allowed ${
                    isHighlighted
                      ? 'btn-glass-light'
                      : 'btn-glass-peacock'
                  }`}
                >
                  Coming soon
                </button>
              ) : onBuyClick ? (
                <button
                  type="button"
                  disabled={buyingPackId === tier.id}
                  onClick={() => onBuyClick(tier)}
                  className={`w-full px-5 py-3 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock disabled:opacity-60 ${
                    isHighlighted
                      ? 'btn-glass-light'
                      : 'btn-glass-peacock'
                  }`}
                >
                  {buyingPackId === tier.id ? 'Processing…' : tier.ctaLabel}
                </button>
              ) : (
                <Link
                  to="/editor/create"
                  className="btn-glass-peacock inline-flex w-full items-center justify-center px-5 py-3 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
                >
                  {tier.ctaLabel}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
