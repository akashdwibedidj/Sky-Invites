import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_LIST,
  FAQ_ITEMS,
  FEATURES,
  HOW_IT_WORKS_STEPS,
  PRICING_TIERS,
  WAITLIST_INITIAL_COUNT,
} from '../mock/data';
import { COPY } from '../content/copy';
import { SAMPLE_EXAMPLES, type SampleExample } from '../content/examples';
import * as api from '../services/siteApi';
import type { InvitationCategory } from '../types';
import { SampleCard } from '../components/SampleCard';
import { BotanicalDivider, OccasionMotif } from '../components/Ornaments';
import { ExamplePreviewModal } from '../components/ExamplePreviewModal';
import { FlowingPeacock } from '../components/FlowingPeacock';
import { PricingCards } from '../components/PricingCards';

/**
 * Manual position & size controls for the Hero peacock.
 * Edit these values directly to adjust where the peacock sits and its size.
 */
const HERO_DECOR_POSITIONS = {
  peacock: {
    // Positive offsetX moves right, negative moves left; negative offsetY moves up
    offsetX: '100px',
    offsetY: '-150px',
    // Set width directly (e.g. '350px', '500px', '750px') and/or scale (e.g. 1.2, 0.8)
    width: '800px',
    scale: 1,
    // Set to true to mirror the peacock horizontally
    flipHorizontal: false,
  },
};

export function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<'All' | InvitationCategory>('All');
  const [activePreview, setActivePreview] = useState<SampleExample | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string>(FAQ_ITEMS[0].id);

  // Waitlist form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [eventType, setEventType] = useState<InvitationCategory>('Wedding');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState<string | null>(null);
  const [website, setWebsite] = useState('');

  const galleryScrollRef = useRef<HTMLDivElement>(null);
  const waitlistRef = useRef<HTMLElement>(null);

  const availableCategories = useMemo(() => {
    const seen = new Set<InvitationCategory>();
    const list: InvitationCategory[] = [];
    for (const item of SAMPLE_EXAMPLES) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        list.push(item.category);
      }
    }
    return list;
  }, []);

  const filteredExamples = useMemo(() => {
    if (selectedCategory === 'All') return SAMPLE_EXAMPLES;
    return SAMPLE_EXAMPLES.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollGallery = (direction: 'left' | 'right') => {
    if (!galleryScrollRef.current) return;
    const offset = direction === 'left' ? -300 : 300;
    galleryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setWaitlistSuccess(null);

    if (!name.trim()) {
      setFormError(COPY.home.waitlist.errorEmptyName);
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setFormError(COPY.home.waitlist.errorInvalidEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.joinWaitlist({
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim() || undefined,
        eventType,
        website,
      });
      setWaitlistSuccess(response.message);
      setName('');
      setEmail('');
      setWhatsapp('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : COPY.home.waitlist.errorFallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-x-hidden">
      {/* 2. SKY HERO: RIGHT-SIDE PEACOCK, TYPOGRAPHY & HORIZONTAL INVITATION STRIP */}
      <section className="relative pt-14 pb-20 sm:pt-20 sm:pb-24">
        <div className="relative z-20 mx-auto max-w-3xl px-4 text-center sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl bg-ivory/35 px-4 py-6 backdrop-blur-[2px] sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none"
          >
            <h1 className="mx-auto max-w-3xl font-site-display-script text-5xl leading-[1.15] font-normal tracking-normal text-peacock sm:text-6xl lg:text-[4.5rem] text-balance drop-shadow-[0_1px_12px_rgba(255,253,248,0.65)]">
              {COPY.home.hero.headline}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-peacock/90 sm:text-lg drop-shadow-[0_1px_8px_rgba(255,253,248,0.6)]">
              {COPY.home.hero.subline}
            </p>

            <div className="mt-8 flex items-center justify-center">
              <Link
                to="/editor/create"
                className="btn-glass-peacock inline-flex w-full items-center justify-center gap-2 px-8 py-3.5 text-sm font-medium sm:w-auto whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
              >
                {COPY.home.hero.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Peacock Positioned on the Right Side */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none relative z-10 mx-auto -mt-2 flex max-w-6xl justify-center px-4 sm:-mt-10 sm:justify-end sm:px-8 lg:-mt-14"
          aria-hidden="true"
        >
          <FlowingPeacock
            src="/assets/aistudio/Layer_6_772b865e.png"
            width={HERO_DECOR_POSITIONS.peacock.width}
            offsetX={HERO_DECOR_POSITIONS.peacock.offsetX}
            offsetY={HERO_DECOR_POSITIONS.peacock.offsetY}
            scale={HERO_DECOR_POSITIONS.peacock.scale}
            flipHorizontal={HERO_DECOR_POSITIONS.peacock.flipHorizontal}
            className="sm:mr-4 lg:mr-10"
          />
        </motion.div>

        {/* Horizontal Invitation Strip */}
        <div className="relative z-20 mx-auto mt-6 max-w-7xl px-4 sm:-mt-8 sm:px-6 lg:-mt-12 lg:px-8">
          {SAMPLE_EXAMPLES.length === 0 ? (
            <div className="flex justify-center pb-4">
              <div className="aspect-[9/16] w-44 rounded-2xl border border-hairline bg-ivory-card shadow-[var(--shadow-paper)] sm:w-48" />
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar lg:justify-center">
              {SAMPLE_EXAMPLES.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex shrink-0 snap-start flex-col items-center"
                >
                  <SampleCard
                    sample={item}
                    size="sm"
                    onSelect={setActivePreview}
                  />
                  <div className="mt-3 rounded-full bg-ivory/78 px-4 py-1.5 text-center backdrop-blur-sm">
                    <p className="font-site-serif text-sm font-semibold text-peacock">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {item.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. OCCASION CATEGORIES */}
      <section className="border-y border-white/50 bg-ivory/82 py-16 backdrop-blur-md sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
              {COPY.home.categories.heading}
            </h2>
            <p className="mt-3 text-sm text-ink-muted sm:text-base">
              {COPY.home.categories.subline}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <Link
                key={category.name}
                to="/editor/create"
                className="group flex h-full items-start gap-4 rounded-xl border border-hairline bg-ivory-card/92 p-6 transition-colors duration-150 hover:border-gold-warm/60 hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
              >
                <OccasionMotif
                  category={category.name}
                  className="h-10 w-10 shrink-0 text-peacock transition-colors duration-150 group-hover:text-gold-dark"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-site-serif text-xl font-semibold text-peacock">
                      {category.name}
                    </h3>
                    <span className="text-xs font-medium text-gold-dark tabular-nums">
                      {category.folioNumber}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {category.tagline}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Compact Business Bridge Callout */}
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-xl border border-peacock/15 bg-ivory-card/90 p-6 shadow-[var(--shadow-editorial)] sm:flex-row sm:items-center sm:px-8">
            <div className="flex items-start gap-4">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-peacock/20 bg-ivory text-peacock sm:flex">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-site-serif text-2xl font-semibold text-peacock">
                  {COPY.home.businessCallout.heading}
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {COPY.home.businessCallout.subline}
                </p>
              </div>
            </div>
            <Link
              to="/business"
              className="btn-glass-peacock inline-flex shrink-0 items-center gap-2 px-6 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
            >
              {COPY.home.businessCallout.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="bg-ivory/74 py-20 backdrop-blur-md sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <BotanicalDivider className="mb-5" />
            <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
              {COPY.home.howItWorks.heading}
            </h2>
            <p className="mt-3 text-sm text-ink-muted sm:text-base">
              {COPY.home.howItWorks.subline}
            </p>
          </div>

          <div className="relative mt-14">
            <div
              className="pointer-events-none absolute top-6 right-12 left-12 hidden h-px bg-hairline lg:block"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-gold/60 bg-ivory text-peacock">
                    <span className="font-site-serif text-base font-semibold tabular-nums">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 font-site-serif text-xl font-semibold text-peacock">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. INVITATION EXAMPLES GALLERY */}
      <section id="examples" className="border-y border-white/50 bg-ivory/82 py-20 backdrop-blur-md sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
                {COPY.home.examples.heading}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-muted sm:text-base">
                {COPY.home.examples.subline}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollGallery('left')}
                aria-label={COPY.home.examples.scrollLeftLabel}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-ivory-card text-peacock transition-colors hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollGallery('right')}
                aria-label={COPY.home.examples.scrollRightLabel}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-ivory-card text-peacock transition-colors hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {SAMPLE_EXAMPLES.length > 0 && (
            <>
              {availableCategories.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Filter invitation examples by occasion"
                  className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
                >
                  {([COPY.home.examples.allFilter, ...availableCategories] as const).map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock ${
                          active
                            ? 'bg-peacock text-ivory'
                            : 'border border-hairline bg-ivory-card text-ink-muted hover:text-peacock'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}

              <div
                ref={galleryScrollRef}
                className="mt-8 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar"
              >
                {filteredExamples.map((example) => (
                  <div
                    key={example.id}
                    className="flex shrink-0 snap-start flex-col items-center"
                  >
                    <SampleCard
                      sample={example}
                      size="lg"
                      onSelect={setActivePreview}
                    />
                    <div className="mt-4 w-60 text-center">
                      <h3 className="font-site-serif text-lg font-semibold text-peacock truncate">
                        {example.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {example.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 6. FEATURES */}
      <section className="bg-ivory/74 py-20 backdrop-blur-md sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
                {COPY.home.features.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
                {COPY.home.features.subline}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8">
              {FEATURES.map((feat) => (
                <div
                  key={feat.id}
                  className="border-t border-hairline pt-5"
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xs font-medium text-gold-dark tabular-nums">
                      {feat.index}
                    </span>
                    <h3 className="font-site-serif text-xl font-semibold text-peacock">
                      {feat.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. WAITLIST SECTION */}
      <section
        id="waitlist"
        ref={waitlistRef}
        className="bg-ivory/74 py-16 backdrop-blur-md sm:py-24"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-hairline bg-ivory-card/95 p-7 shadow-[var(--shadow-editorial)] sm:p-12">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-medium text-gold-dark">{COPY.home.waitlist.eyebrow}</p>
              <h2 className="mt-2 font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
                {COPY.home.waitlist.heading}
              </h2>
              <p className="mt-3 text-sm text-ink-muted sm:text-base">
                {COPY.home.waitlist.subline}
              </p>
            </div>

            <form onSubmit={handleWaitlistSubmit} noValidate className="mx-auto mt-8 max-w-xl space-y-4">
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                aria-hidden="true"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="waitlist-name" className="block text-xs font-medium text-peacock">
                    {COPY.home.waitlist.nameLabel} <span className="text-gold-dark">*</span>
                  </label>
                  <input
                    id="waitlist-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={COPY.home.waitlist.namePlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  />
                </div>

                <div>
                  <label htmlFor="waitlist-email" className="block text-xs font-medium text-peacock">
                    {COPY.home.waitlist.emailLabel} <span className="text-gold-dark">*</span>
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={COPY.home.waitlist.emailPlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="waitlist-whatsapp" className="block text-xs font-medium text-peacock">
                    {COPY.home.waitlist.whatsappLabel}{' '}
                    <span className="text-ink-muted">{COPY.home.waitlist.optionalHint}</span>
                  </label>
                  <input
                    id="waitlist-whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder={COPY.home.waitlist.whatsappPlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  />
                </div>

                <div>
                  <label htmlFor="waitlist-event" className="block text-xs font-medium text-peacock">
                    {COPY.home.waitlist.eventLabel}
                  </label>
                  <select
                    id="waitlist-event"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as InvitationCategory)}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  >
                    {CATEGORY_LIST.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-sm font-medium text-[#9B1C1C]">
                  {formError}
                </p>
              )}

              {waitlistSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-lg border border-gold/50 bg-ivory-soft p-3.5 text-sm text-peacock"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                  <span>{waitlistSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-glass-peacock w-full px-6 py-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {isSubmitting ? COPY.home.waitlist.submittingLabel : COPY.home.waitlist.submitLabel}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 9. PRICING PREVIEW (Individuals: Free Invite) */}
      <section id="pricing" className="border-t border-white/50 bg-ivory/82 py-20 backdrop-blur-md sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
              {COPY.home.pricingPreview.heading}
            </h2>
            <p className="mt-3 text-sm text-ink-muted sm:text-base">
              {COPY.home.pricingPreview.subline}
            </p>
          </div>

          <div className="mt-12">
            <PricingCards tiers={PRICING_TIERS} onNotifyClick={scrollToWaitlist} />
          </div>
        </div>
      </section>

      {/* 10. FAQ ACCORDION */}
      <section id="faq" className="bg-ivory/74 py-20 backdrop-blur-md sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <BotanicalDivider className="mb-5" />
            <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
              {COPY.home.faq.heading}
            </h2>
          </div>

          <div className="mt-10 divide-y divide-hairline border-y border-hairline">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
                  >
                    <span className="font-site-serif text-xl font-semibold text-peacock">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-gold-dark transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-5 pr-8 text-sm leading-relaxed text-ink-muted sm:text-base">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. FINAL CALL-TO-ACTION BANNER */}
      <section className="bg-ivory/74 pb-20 backdrop-blur-md sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-peacock/95 px-6 py-14 text-center text-ivory shadow-[var(--shadow-editorial)] ring-1 ring-gold/30 sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-2xl font-site-serif text-3xl font-semibold sm:text-5xl text-balance">
              {COPY.home.finalCta.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-ivory/80 sm:text-base">
              {COPY.home.finalCta.subline}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                to="/editor/create"
                className="btn-glass-light inline-flex w-full items-center justify-center gap-2 px-7 py-3.5 text-sm font-medium sm:w-auto whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory"
              >
                {COPY.home.finalCta.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={scrollToWaitlist}
                className="inline-flex w-full items-center justify-center rounded-full border border-ivory/40 px-7 py-3.5 text-sm font-medium text-ivory transition-colors hover:bg-ivory/10 sm:w-auto whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {COPY.home.finalCta.ctaSecondary}
              </button>
            </div>
          </div>
        </div>
      </section>

      <ExamplePreviewModal
        sample={activePreview}
        onClose={() => setActivePreview(null)}
      />
    </div>
  );
}
