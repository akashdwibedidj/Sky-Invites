import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Image as ImageIcon, LogOut, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COPY } from '../content/copy';
import * as api from '../services/siteApi';
import type { InvitationItem, InvitationStatus } from '../types';

function StatusIndicator({ status }: { status: InvitationStatus }) {
  if (status === 'Ready') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-peacock">
        <ImageIcon className="h-3.5 w-3.5 text-gold-dark" />
        <span>{COPY.dashboard.statuses.ready}</span>
      </span>
    );
  }
  if (status === 'Video coming soon') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-dark">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{COPY.dashboard.statuses.videoComingSoon}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <Clock className="h-3.5 w-3.5" />
      <span>{COPY.dashboard.statuses.draft}</span>
    </span>
  );
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    api
      .listMyInvitations()
      .then((res) => {
        if (active) setInvitations(res.items);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : COPY.dashboard.loadingError);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-5 rounded-xl border border-peacock/12 bg-ivory/82 p-6 backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div>
          <p className="text-xs font-medium text-gold-dark">{COPY.dashboard.eyebrow}</p>
          <h1 className="mt-1.5 font-site-serif text-3xl font-semibold text-peacock sm:text-4xl">
            {user
              ? `${COPY.dashboard.headingPrefix} ${user.name}`
              : COPY.dashboard.headingFallback}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">{COPY.dashboard.subline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/editor/create"
            className="btn-glass-peacock inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
          >
            <Plus className="h-4 w-4" />
            {COPY.dashboard.createButton}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-full border border-peacock/15 bg-ivory-card/90 px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-peacock whitespace-nowrap"
          >
            <LogOut className="h-4 w-4" />
            {COPY.dashboard.signOutButton}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-96 animate-pulse rounded-xl border border-white/50 bg-ivory/65 backdrop-blur-sm"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-12 rounded-xl border border-peacock/15 bg-ivory-card/90 p-8 text-center backdrop-blur-md">
          <p className="text-sm font-medium text-[#9B1C1C]">{error}</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="mt-12 rounded-xl border border-peacock/15 bg-ivory-card/90 p-12 text-center backdrop-blur-md">
          <Sparkles className="mx-auto h-8 w-8 text-gold-dark" />
          <h2 className="mt-4 font-site-serif text-2xl font-semibold text-peacock">
            {COPY.dashboard.emptyHeading}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            {COPY.dashboard.emptySubline}
          </p>
          <Link
            to="/editor/create"
            className="btn-glass-peacock mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
          >
            <Plus className="h-4 w-4" />
            {COPY.dashboard.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {invitations.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-peacock/12 bg-ivory-card/92 shadow-[var(--shadow-editorial)] backdrop-blur-md transition-colors duration-150 hover:border-gold-warm/60"
            >
              <div
                className={`relative aspect-[9/16] w-full overflow-hidden bg-gradient-to-b ${item.gradientClass}`}
              >
                {item.posterImage && (
                  <img
                    src={item.posterImage}
                    alt={`${item.category} invitation for ${item.title.split('—')[0].trim()}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                )}
                {!item.hasEmbeddedCalligraphy && (
                  <>
                    <div
                      className={`absolute inset-0 ${
                        item.theme === 'dark' ? 'bg-peacock-deep/45' : 'bg-ivory/25'
                      }`}
                      aria-hidden="true"
                    />
                    <div
                      className={`relative z-10 flex h-full flex-col items-center justify-center p-5 text-center ${
                        item.theme === 'dark' ? 'text-ivory' : 'text-peacock-deep'
                      }`}
                    >
                      <p className="text-[10px] tracking-[0.18em] uppercase opacity-75">
                        {item.category}
                      </p>
                      <h3 className="mt-2 font-site-script text-3xl leading-tight text-balance">
                        {item.title.split('—')[0].trim()}
                      </h3>
                      <p className="mt-2 text-xs opacity-80">
                        {item.dateText} · {item.venueText}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <p className="text-xs text-ink-muted">
                    {item.category}
                    {item.moodWord ? ` · ${item.moodWord}` : ''} · {item.updatedAt}
                  </p>
                  <h2 className="mt-2 font-site-serif text-xl font-semibold text-peacock leading-snug">
                    {item.title}
                  </h2>
                  <div className="mt-2.5">
                    <StatusIndicator status={item.status} />
                  </div>
                </div>

                <Link
                  to={`/create?category=${encodeURIComponent(item.category)}&id=${encodeURIComponent(item.id)}`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-peacock/25 bg-ivory-soft px-4 py-2.5 text-sm font-medium text-peacock transition-colors hover:bg-peacock hover:text-ivory whitespace-nowrap"
                >
                  {COPY.dashboard.openButton}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
