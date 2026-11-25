import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COPY } from '../content/copy';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSectionLink = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-ivory/65 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark in Cormorant Garamond */}
        <Link
          to="/"
          className="font-site-serif text-2xl font-semibold tracking-tight text-peacock whitespace-nowrap shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
        >
          {COPY.brand.name}
        </Link>

        {/* Zone 2: Center navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-peacock/85 lg:gap-7"
        >
          <a
            href="#how-it-works"
            onClick={(e) => handleSectionLink(e, 'how-it-works')}
            className="hover:text-peacock transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            {COPY.nav.howItWorks}
          </a>
          <a
            href="#examples"
            onClick={(e) => handleSectionLink(e, 'examples')}
            className="hover:text-peacock transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            {COPY.nav.examples}
          </a>
          <Link
            to="/pricing"
            className="hover:text-peacock transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            {COPY.nav.pricing}
          </Link>
          <Link
            to="/business"
            className="hover:text-peacock transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            {COPY.nav.business}
          </Link>
          <a
            href="#faq"
            onClick={(e) => handleSectionLink(e, 'faq')}
            className="hover:text-peacock transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            {COPY.nav.faq}
          </a>
        </nav>

        {/* Zone 3: Right side Login + Peacock Glass Create button */}
        <div className="flex items-center gap-4 shrink-0">
          {user ? (
            <Link
              to="/editor"
              className="hidden md:inline-flex text-sm font-medium text-peacock/90 hover:text-peacock transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {COPY.nav.dashboard}
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden md:inline-flex text-sm font-medium text-peacock/90 hover:text-peacock transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {COPY.nav.login}
            </Link>
          )}

          <Link
            to="/editor/create"
            className="btn-glass-peacock hidden sm:inline-flex items-center justify-center px-5 py-2 text-sm font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
          >
            {COPY.nav.createCta}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? COPY.nav.closeMenuLabel : COPY.nav.openMenuLabel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-ivory/60 text-peacock backdrop-blur-md md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="border-t border-white/50 bg-ivory/92 px-4 py-5 backdrop-blur-md md:hidden">
          <nav className="flex flex-col space-y-3 text-base font-medium text-peacock">
            <a
              href="#how-it-works"
              onClick={(e) => handleSectionLink(e, 'how-it-works')}
              className="py-1.5"
            >
              {COPY.nav.howItWorks}
            </a>
            <a
              href="#examples"
              onClick={(e) => handleSectionLink(e, 'examples')}
              className="py-1.5"
            >
              {COPY.nav.examples}
            </a>
            <Link to="/pricing" onClick={() => setMobileOpen(false)} className="py-1.5">
              {COPY.nav.pricing}
            </Link>
            <Link to="/business" onClick={() => setMobileOpen(false)} className="py-1.5">
              {COPY.nav.business}
            </Link>
            <a href="#faq" onClick={(e) => handleSectionLink(e, 'faq')} className="py-1.5">
              {COPY.nav.faq}
            </a>
            {user ? (
              <Link to="/editor" onClick={() => setMobileOpen(false)} className="py-1.5">
                {COPY.nav.dashboard}
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="py-1.5">
                {COPY.nav.login}
              </Link>
            )}
            <Link
              to="/editor/create"
              onClick={() => setMobileOpen(false)}
              className="btn-glass-peacock mt-2 inline-flex items-center justify-center px-5 py-3 text-center text-sm font-medium"
            >
              {COPY.nav.createCta}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
