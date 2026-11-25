import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  CalendarHeart,
  CheckCircle2,
  ChevronDown,
  Palette,
  Sparkles,
} from 'lucide-react';
import { COPY } from '../content/copy';
import * as api from '../services/siteApi';
import type { BusinessTypeOption, MonthlyVolumeOption } from '../types';
import { BotanicalDivider } from '../components/Ornaments';

const AUDIENCE_ICONS = [Sparkles, CalendarHeart, Building2, Palette];

export function BusinessPage() {
  const enquirySectionRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);

  const [openFaqId, setOpenFaqId] = useState<string>(COPY.businessPage.faq.items[0].id);

  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [businessType, setBusinessType] = useState<BusinessTypeOption>(
    COPY.businessPage.enquiry.businessTypes[0],
  );
  const [monthlyVolume, setMonthlyVolume] = useState<MonthlyVolumeOption>(
    COPY.businessPage.enquiry.volumes[1],
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollToEnquiry = () => {
    enquirySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!businessName.trim() || !contactName.trim() || !message.trim()) {
      setError(COPY.businessPage.enquiry.errorRequired);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(workEmail.trim())) {
      setError(COPY.businessPage.enquiry.errorEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.sendBusinessEnquiry({
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        workEmail: workEmail.trim(),
        whatsapp: whatsapp.trim() || undefined,
        businessType,
        monthlyVolume,
        message: message.trim(),
      });
      setSuccess(response.message);
      setBusinessName('');
      setContactName('');
      setWorkEmail('');
      setWhatsapp('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : COPY.businessPage.enquiry.errorFallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-x-hidden">
      {/* 1. BUSINESS HERO */}
      <section className="px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-white/55 bg-ivory/75 px-6 py-10 shadow-[var(--shadow-editorial)] backdrop-blur-md sm:px-12 sm:py-12"
          >
            <p className="text-xs font-medium text-gold-dark">{COPY.businessPage.hero.eyebrow}</p>
            <h1 className="mx-auto mt-3 max-w-2xl font-site-serif text-4xl leading-[1.08] font-semibold tracking-tight text-peacock sm:text-5xl text-balance">
              {COPY.businessPage.hero.heading}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              {COPY.businessPage.hero.subline}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <button
                type="button"
                onClick={scrollToEnquiry}
                className="btn-glass-peacock inline-flex w-full items-center justify-center gap-2 px-7 py-3.5 text-sm font-medium sm:w-auto whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
              >
                {COPY.businessPage.hero.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="btn-glass-light inline-flex w-full items-center justify-center px-7 py-3.5 text-sm font-medium sm:w-auto whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
              >
                {COPY.businessPage.hero.ctaSecondary}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. WHO WE HELP */}
      <section className="border-y border-white/50 bg-ivory/82 py-16 backdrop-blur-md sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
              {COPY.businessPage.whoWeHelp.heading}
            </h2>
            <p className="mt-3 text-sm text-ink-muted sm:text-base">
              {COPY.businessPage.whoWeHelp.subline}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COPY.businessPage.whoWeHelp.cards.map((card, index) => {
              const Icon = AUDIENCE_ICONS[index % AUDIENCE_ICONS.length];
              return (
                <div
                  key={card.title}
                  className="flex flex-col rounded-xl border border-hairline bg-ivory-card/95 p-6 shadow-[var(--shadow-editorial)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 bg-ivory text-peacock">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-4 font-site-serif text-xl font-semibold text-peacock">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. BENEFITS */}
      <section className="bg-ivory/74 py-20 backdrop-blur-md sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
                {COPY.businessPage.benefits.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
                {COPY.businessPage.benefits.subline}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8">
              {COPY.businessPage.benefits.items.map((item) => (
                <div key={item.index} className="border-t border-hairline pt-5">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-xs font-medium text-gold-dark tabular-nums">
                      {item.index}
                    </span>
                    <h3 className="font-site-serif text-xl font-semibold text-peacock">
                      {item.title}
                    </h3>
                    {'badge' in item && item.badge && (
                      <span className="text-xs font-medium text-gold-dark">
                        · {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS FOR BUSINESSES */}
      <section
        id="business-how-it-works"
        ref={howItWorksRef}
        className="border-y border-white/50 bg-ivory/82 py-20 backdrop-blur-md sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <BotanicalDivider className="mb-5" />
            <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
              {COPY.businessPage.howItWorks.heading}
            </h2>
            <p className="mt-3 text-sm text-ink-muted sm:text-base">
              {COPY.businessPage.howItWorks.subline}
            </p>
          </div>

          <div className="relative mt-14">
            <div
              className="pointer-events-none absolute top-6 right-12 left-12 hidden h-px bg-hairline lg:block"
              aria-hidden="true"
            />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {COPY.businessPage.howItWorks.steps.map((step) => (
                <div key={step.number} className="relative flex flex-col items-center text-center">
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

      {/* 5. BUSINESS FAQ */}
      <section className="bg-ivory/74 py-20 backdrop-blur-md sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <BotanicalDivider className="mb-5" />
            <h2 className="font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
              {COPY.businessPage.faq.heading}
            </h2>
          </div>

          <div className="mt-10 divide-y divide-hairline border-y border-hairline">
            {COPY.businessPage.faq.items.map((item) => {
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

      {/* 6. BUSINESS ENQUIRY FORM */}
      <section
        id="enquiry"
        ref={enquirySectionRef}
        className="border-t border-white/50 bg-ivory/82 py-16 backdrop-blur-md sm:py-24"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-hairline bg-ivory-card/95 p-7 shadow-[var(--shadow-editorial)] sm:p-12">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-medium text-gold-dark">
                {COPY.businessPage.enquiry.eyebrow}
              </p>
              <h2 className="mt-2 font-site-serif text-3xl font-semibold text-peacock sm:text-4xl text-balance">
                {COPY.businessPage.enquiry.heading}
              </h2>
              <p className="mt-3 text-sm text-ink-muted sm:text-base">
                {COPY.businessPage.enquiry.subline}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mx-auto mt-8 max-w-xl space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="biz-name" className="block text-xs font-medium text-peacock">
                    {COPY.businessPage.enquiry.businessNameLabel}{' '}
                    <span className="text-gold-dark">*</span>
                  </label>
                  <input
                    id="biz-name"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={COPY.businessPage.enquiry.businessNamePlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  />
                </div>

                <div>
                  <label htmlFor="biz-contact" className="block text-xs font-medium text-peacock">
                    {COPY.businessPage.enquiry.contactNameLabel}{' '}
                    <span className="text-gold-dark">*</span>
                  </label>
                  <input
                    id="biz-contact"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={COPY.businessPage.enquiry.contactNamePlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="biz-email" className="block text-xs font-medium text-peacock">
                    {COPY.businessPage.enquiry.workEmailLabel}{' '}
                    <span className="text-gold-dark">*</span>
                  </label>
                  <input
                    id="biz-email"
                    type="email"
                    required
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder={COPY.businessPage.enquiry.workEmailPlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  />
                </div>

                <div>
                  <label htmlFor="biz-whatsapp" className="block text-xs font-medium text-peacock">
                    {COPY.businessPage.enquiry.whatsappLabel}{' '}
                    <span className="text-ink-muted">
                      {COPY.businessPage.enquiry.whatsappOptional}
                    </span>
                  </label>
                  <input
                    id="biz-whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder={COPY.businessPage.enquiry.whatsappPlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="biz-type" className="block text-xs font-medium text-peacock">
                    {COPY.businessPage.enquiry.businessTypeLabel}
                  </label>
                  <select
                    id="biz-type"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessTypeOption)}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  >
                    {COPY.businessPage.enquiry.businessTypes.map((typeOption) => (
                      <option key={typeOption} value={typeOption}>
                        {typeOption}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="biz-volume" className="block text-xs font-medium text-peacock">
                    {COPY.businessPage.enquiry.volumeLabel}
                  </label>
                  <select
                    id="biz-volume"
                    value={monthlyVolume}
                    onChange={(e) => setMonthlyVolume(e.target.value as MonthlyVolumeOption)}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                  >
                    {COPY.businessPage.enquiry.volumes.map((volOption) => (
                      <option key={volOption} value={volOption}>
                        {volOption}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="biz-message" className="block text-xs font-medium text-peacock">
                  {COPY.businessPage.enquiry.messageLabel}{' '}
                  <span className="text-gold-dark">*</span>
                </label>
                <textarea
                  id="biz-message"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={COPY.businessPage.enquiry.messagePlaceholder}
                  className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-[#9B1C1C]">
                  {error}
                </p>
              )}

              {success && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-lg border border-gold/50 bg-ivory-soft p-3.5 text-sm text-peacock"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-glass-peacock w-full px-6 py-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {isSubmitting
                  ? COPY.businessPage.enquiry.submittingLabel
                  : COPY.businessPage.enquiry.submitLabel}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
