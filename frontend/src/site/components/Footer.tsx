import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, MessageCircle } from 'lucide-react';
import { COPY } from '../content/copy';

export function Footer() {
  return (
    <footer className="border-t border-white/50 bg-ivory/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Link to="/" className="font-site-serif text-2xl font-semibold tracking-tight text-peacock">
              {COPY.brand.name}
            </Link>
            <p className="max-w-sm text-sm text-ink-muted">{COPY.brand.footerTagline}</p>
          </div>

          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted"
          >
            {COPY.footer.links.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-peacock transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Sky Invites on Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-ivory/90 text-peacock transition-colors hover:border-gold hover:text-gold-dark"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Sky Invites on WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-ivory/90 text-peacock transition-colors hover:border-gold hover:text-gold-dark"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <Link
              to="/contact"
              aria-label="Email Sky Invites"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-ivory/90 text-peacock transition-colors hover:border-gold hover:text-gold-dark"
            >
              <Mail className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-hairline pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {COPY.brand.name}. All rights reserved.</p>
          <p>{COPY.brand.footerBottomNote}</p>
        </div>
      </div>
    </footer>
  );
}
