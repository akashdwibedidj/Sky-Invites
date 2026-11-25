import React, { useState } from 'react';
import { CheckCircle2, Mail, MessageCircle } from 'lucide-react';
import { COPY } from '../content/copy';
import * as api from '../services/siteApi';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState<string>(COPY.contactPage.reasons[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !subject.trim() || !message.trim()) {
      setError(COPY.contactPage.errorRequired);
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setError(COPY.contactPage.errorEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        reason,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess(res.message);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : COPY.contactPage.errorFallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        <div className="rounded-xl border border-white/55 bg-ivory/82 p-7 shadow-[var(--shadow-editorial)] backdrop-blur-md sm:p-9 lg:col-span-5">
          <p className="text-xs font-medium text-gold-dark">{COPY.contactPage.eyebrow}</p>
          <h1 className="mt-2 font-site-serif text-4xl font-semibold text-peacock">
            {COPY.contactPage.heading}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted sm:text-base">
            {COPY.contactPage.subline}
          </p>

          <div className="mt-8 space-y-4 border-t border-hairline pt-6 text-sm text-ink-muted">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gold-dark" />
              <span>{COPY.contactPage.emailAddress}</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-gold-dark" />
              <span>{COPY.contactPage.whatsappNote}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-peacock/15 bg-ivory-card/90 p-7 shadow-[var(--shadow-editorial)] backdrop-blur-md sm:p-10 lg:col-span-7">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-medium text-peacock">
                  {COPY.contactPage.nameLabel}
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={COPY.contactPage.namePlaceholder}
                  className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-medium text-peacock">
                  {COPY.contactPage.emailLabel}
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={COPY.contactPage.emailPlaceholder}
                  className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-reason" className="block text-xs font-medium text-peacock">
                {COPY.contactPage.reasonLabel}
              </label>
              <select
                id="contact-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
              >
                {COPY.contactPage.reasons.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contact-subject" className="block text-xs font-medium text-peacock">
                {COPY.contactPage.subjectLabel}
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={COPY.contactPage.subjectPlaceholder}
                className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-xs font-medium text-peacock">
                {COPY.contactPage.messageLabel}
              </label>
              <textarea
                id="contact-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={COPY.contactPage.messagePlaceholder}
                className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
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
              className="btn-glass-peacock w-full px-6 py-3 text-sm font-medium disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {isSubmitting ? COPY.contactPage.submittingLabel : COPY.contactPage.submitLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
