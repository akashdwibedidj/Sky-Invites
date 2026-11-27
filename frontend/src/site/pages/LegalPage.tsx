import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { COPY } from '../content/copy';

interface LegalPageProps {
  type: 'terms' | 'privacy' | 'refund';
}

const CONTACT_EMAIL = 'skyinvitesofficial@gmail.com';

function renderBodyWithEmail(body: string) {
  if (!body.includes(CONTACT_EMAIL)) return body;
  const parts = body.split(CONTACT_EMAIL);
  return parts.map((part, idx) => (
    <React.Fragment key={idx}>
      {part}
      {idx < parts.length - 1 && (
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-peacock underline underline-offset-2 hover:text-gold-dark"
        >
          {CONTACT_EMAIL}
        </a>
      )}
    </React.Fragment>
  ));
}

export function LegalPage({ type }: LegalPageProps) {
  const doc = COPY.legal[type];

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-ivory/78 px-4 py-1.5 text-sm font-medium text-peacock backdrop-blur-sm transition-colors hover:bg-ivory"
      >
        <ArrowLeft className="h-4 w-4" />
        {COPY.legal.backHome}
      </Link>

      <article className="mt-6 rounded-xl border border-peacock/15 bg-ivory-card/90 p-8 shadow-[var(--shadow-editorial)] backdrop-blur-md sm:p-12">
        <p className="text-xs font-medium text-gold-dark">{doc.updated}</p>
        <h1 className="mt-2 font-site-serif text-4xl font-semibold text-peacock">{doc.title}</h1>

        <div className="mt-8 space-y-8 border-t border-hairline pt-8">
          {doc.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="font-site-serif text-2xl font-semibold text-peacock">{section.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">
                {renderBodyWithEmail(section.body)}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
