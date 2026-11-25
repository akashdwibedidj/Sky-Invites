import React, { useState } from 'react';
import { Play } from 'lucide-react';
import type { InvitationExample } from '../types';
import { MughalJharokhaFrame } from './Ornaments';

interface InvitationArtworkProps {
  invitation: InvitationExample;
  onPlay?: (invitation: InvitationExample) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InvitationArtwork({
  invitation,
  onPlay,
  size = 'md',
  className = '',
}: InvitationArtworkProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const widthClass =
    size === 'sm'
      ? 'w-48 sm:w-52'
      : size === 'lg'
        ? 'w-60 sm:w-64'
        : 'w-56 sm:w-60';

  const isDark = invitation.theme === 'dark';

  const renderCardContent = () => {
    // Card artwork that already includes printed calligraphy
    if (invitation.hasEmbeddedCalligraphy && invitation.posterImage && !imgFailed) {
      return null;
    }

    switch (invitation.cardLayout) {
      case 'mughal':
        return (
          <div className="relative flex h-full w-full flex-col items-center justify-between bg-[#FAF4E8] px-6 py-11 text-center text-peacock">
            <MughalJharokhaFrame className="absolute inset-0 h-full w-full" />
            <div className="relative z-10 mt-3">
              <p className="text-[9px] font-medium tracking-[0.24em] text-gold-dark uppercase">
                {invitation.monogram || 'Shubh Vivaha'}
              </p>
            </div>
            <div className="relative z-10 my-auto space-y-2.5 px-2">
              <p className="font-site-serif text-xs italic text-ink-muted">{invitation.eyebrow}</p>
              <h4 className="font-site-script text-[2rem] leading-[1.08] text-peacock text-balance">
                {invitation.names}
              </h4>
              <div className="mx-auto flex items-center justify-center gap-2">
                <span className="h-px w-6 bg-gold-warm/70" />
                <span className="h-1.5 w-1.5 rotate-45 bg-peacock/75" />
                <span className="h-px w-6 bg-gold-warm/70" />
              </div>
              <p className="font-site-serif text-[11px] font-semibold tracking-[0.12em] text-peacock uppercase">
                {invitation.dateText}
              </p>
              <p className="text-[11px] leading-snug text-ink-muted">{invitation.venueText}</p>
            </div>
            <p className="relative z-10 mb-2 text-[9px] tracking-[0.18em] text-gold-dark uppercase">
              {invitation.rsvpLine || 'Blessings & Dinner'}
            </p>
          </div>
        );

      case 'minimal':
        return (
          <div className="relative flex h-full w-full flex-col justify-between bg-[#F7F3EA] p-6 text-left text-ink">
            <div
              className="pointer-events-none absolute -top-12 -right-12 h-52 w-52 rotate-12 bg-gradient-to-br from-peacock/8 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute inset-4 border border-hairline" />

            <div className="relative z-10 flex items-center justify-between pt-2 px-2">
              <span className="text-[9px] font-medium tracking-[0.2em] text-peacock uppercase">
                {invitation.category}
              </span>
              <span className="font-site-serif text-[10px] tracking-[0.18em] text-gold-dark">
                {invitation.monogram || '2026'}
              </span>
            </div>

            <div className="relative z-10 my-auto space-y-3.5 px-2">
              <p className="text-[10px] tracking-[0.14em] text-ink-muted uppercase">
                {invitation.eyebrow}
              </p>
              <h4 className="font-site-serif text-[1.65rem] leading-[1.08] font-medium tracking-tight text-peacock text-balance">
                {invitation.names}
              </h4>
              <div className="h-px w-10 bg-gold-warm/70" />
              <div className="space-y-1 text-[11px]">
                <p className="font-medium text-peacock">{invitation.dateText}</p>
                <p className="text-ink-muted">{invitation.venueText}</p>
              </div>
            </div>

            <div className="relative z-10 pb-2 px-2">
              <p className="text-[9.5px] tracking-[0.16em] text-ink-muted uppercase">
                {invitation.rsvpLine || 'Kindly Reply'}
              </p>
            </div>
          </div>
        );

      case 'vintage':
        return (
          <div className="relative flex h-full w-full flex-col items-center justify-between px-6 pt-11 pb-20 text-center text-peacock-deep">
            <div className="space-y-1">
              <p className="font-site-serif text-[10px] tracking-[0.22em] text-gold-dark uppercase">
                {invitation.monogram || 'R · S'}
              </p>
              <p className="font-site-serif text-[11px] italic text-ink-muted">{invitation.eyebrow}</p>
            </div>

            <div className="my-auto space-y-2.5 px-2">
              <h4 className="font-site-script text-[2.1rem] leading-[1.05] text-peacock text-balance">
                {invitation.names}
              </h4>
              <div className="mx-auto h-px w-12 bg-gold-warm/60" />
              <p className="font-site-serif text-xs font-semibold tracking-wide text-peacock">
                {invitation.dateText}
              </p>
              <p className="text-[10.5px] leading-snug text-ink-muted">{invitation.venueText}</p>
            </div>

            <p className="text-[9px] tracking-[0.18em] text-ink-muted uppercase">
              {invitation.rsvpLine || 'Family Celebration'}
            </p>
          </div>
        );

      case 'peacock-dark':
        return (
          <div className="relative flex h-full w-full flex-col items-center justify-between px-6 py-10 text-center text-ivory">
            <p className="text-[9.5px] font-medium tracking-[0.22em] text-gold uppercase">
              {invitation.monogram || invitation.category}
            </p>
            <div className="my-auto space-y-3 px-1">
              <p className="font-site-serif text-xs italic text-ivory/80">{invitation.eyebrow}</p>
              <h4 className="font-site-script text-[2.15rem] leading-[1.08] text-gold text-balance">
                {invitation.names}
              </h4>
              <div className="mx-auto h-px w-10 bg-gold/65" />
              <p className="text-[11px] font-medium text-ivory">{invitation.dateText}</p>
              <p className="text-[10.5px] leading-snug text-ivory/75">{invitation.venueText}</p>
            </div>
            <p className="text-[9px] tracking-[0.2em] text-ivory/65 uppercase">
              {invitation.category} · {invitation.moodWord}
            </p>
          </div>
        );

      case 'floral':
      default:
        return (
          <div
            className={`relative flex h-full w-full flex-col items-center justify-center px-6 py-14 text-center ${
              isDark ? 'text-ivory' : 'text-peacock-deep'
            }`}
          >
            <div className="space-y-2.5">
              <p
                className={`text-[9px] font-medium tracking-[0.2em] uppercase ${
                  isDark ? 'text-gold' : 'text-gold-dark'
                }`}
              >
                {invitation.category}
              </p>
              <p className="font-site-serif text-xs italic opacity-85">{invitation.eyebrow}</p>
              <h4 className="font-site-script text-[2.15rem] leading-[1.06] text-balance">
                {invitation.names}
              </h4>
              <div
                className={`mx-auto h-px w-10 ${isDark ? 'bg-gold/60' : 'bg-peacock/30'}`}
                aria-hidden="true"
              />
              <p className="text-[11px] font-medium">{invitation.dateText}</p>
              <p className="text-[10.5px] leading-snug opacity-80">{invitation.venueText}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`group relative aspect-[9/16] ${widthClass} shrink-0 overflow-hidden rounded-lg bg-gradient-to-b ${invitation.gradientClass} shadow-[var(--shadow-paper)] ring-1 ring-peacock/12 ${className}`}
    >
      {invitation.videoUrl ? (
        <video
          src={invitation.videoUrl}
          poster={invitation.posterImage}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        invitation.posterImage &&
        !imgFailed && (
          <img
            src={invitation.posterImage}
            alt={`${invitation.category} invitation for ${invitation.names}`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )
      )}

      {invitation.posterImage && !imgFailed && !invitation.hasEmbeddedCalligraphy && (
        <div
          className={`absolute inset-0 ${
            isDark
              ? 'bg-gradient-to-b from-peacock-deep/45 via-peacock-deep/35 to-peacock-deep/70'
              : 'bg-gradient-to-b from-ivory/15 via-ivory/20 to-ivory/25'
          }`}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 h-full w-full">{renderCardContent()}</div>

      {onPlay && (
        <button
          type="button"
          onClick={() => onPlay(invitation)}
          aria-label={`Preview ${invitation.names} invitation`}
          className="absolute right-3 bottom-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-peacock-deep/90 px-3 py-1.5 text-[11px] font-medium text-ivory shadow-sm ring-1 ring-white/30 transition-colors duration-150 hover:bg-peacock focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Preview</span>
        </button>
      )}
    </div>
  );
}
