import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COPY } from '../content/copy';
import { SAMPLE_EXAMPLES } from '../content/examples';
import type { AccountType } from '../types';
import { SampleCard } from '../components/SampleCard';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

export function AuthPage({ mode }: AuthPageProps) {
  const isSignup = mode === 'signup';
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignup && !name.trim()) {
      setError(COPY.auth.errors.missingName);
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setError(COPY.auth.errors.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(COPY.auth.errors.shortPassword);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        await signup({
          name: name.trim(),
          email: email.trim(),
          password,
          accountType,
        });
      } else {
        await login({ email: email.trim(), password });
      }
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : COPY.auth.errors.genericAuth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : COPY.auth.errors.googleAuth);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-peacock/15 bg-ivory-card/90 shadow-[var(--shadow-editorial)] backdrop-blur-md lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-center p-7 sm:p-12 lg:col-span-6">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-medium text-gold-dark">{COPY.auth.eyebrow}</p>
            <h1 className="mt-2 font-site-serif text-3xl font-semibold text-peacock sm:text-4xl">
              {isSignup ? COPY.auth.signupHeading : COPY.auth.loginHeading}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {isSignup ? COPY.auth.signupSubline : COPY.auth.loginSubline}
            </p>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogle}
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-lg border border-hairline bg-ivory px-4 py-3 text-sm font-medium text-peacock transition-colors hover:bg-ivory-soft disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              {COPY.auth.googleCta}
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
              <span className="h-px flex-1 bg-hairline" />
              <span>{COPY.auth.orEmail}</span>
              <span className="h-px flex-1 bg-hairline" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {isSignup && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-peacock">
                      {COPY.auth.nameLabel}
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={COPY.auth.namePlaceholder}
                      className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-peacock">
                      {COPY.auth.accountTypeLabel}{' '}
                      <span className="text-ink-muted">{COPY.auth.accountTypeOptional}</span>
                    </span>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountType('individual')}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          accountType === 'individual'
                            ? 'border-peacock bg-peacock text-ivory'
                            : 'border-hairline bg-ivory text-ink-muted hover:text-peacock'
                        }`}
                      >
                        {COPY.auth.accountTypeIndividual}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('business')}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          accountType === 'business'
                            ? 'border-peacock bg-peacock text-ivory'
                            : 'border-hairline bg-ivory text-ink-muted hover:text-peacock'
                        }`}
                      >
                        {COPY.auth.accountTypeBusiness}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-peacock">
                  {COPY.auth.emailLabel}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={COPY.auth.emailPlaceholder}
                  className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-peacock">
                  {COPY.auth.passwordLabel}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={COPY.auth.passwordPlaceholder}
                  className="mt-1.5 w-full rounded-lg border border-hairline bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-peacock focus:outline-none focus:ring-2 focus:ring-peacock/15"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-[#9B1C1C]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-glass-peacock w-full px-5 py-3 text-sm font-medium disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {isSubmitting
                  ? isSignup
                    ? COPY.auth.signupSubmitting
                    : COPY.auth.loginSubmitting
                  : isSignup
                    ? COPY.auth.signupSubmit
                    : COPY.auth.loginSubmit}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-muted">
              {isSignup ? COPY.auth.signupPrompt : COPY.auth.loginPrompt}
              <Link
                to={isSignup ? '/login' : '/signup'}
                className="font-medium text-peacock underline decoration-gold underline-offset-4 hover:text-peacock-deep"
              >
                {isSignup ? COPY.auth.signupLink : COPY.auth.loginLink}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-peacock p-8 text-center text-ivory sm:p-12 lg:col-span-6">
          {SAMPLE_EXAMPLES.length > 0 ? (
            <SampleCard sample={SAMPLE_EXAMPLES[1] ?? SAMPLE_EXAMPLES[0]} size="md" />
          ) : (
            <div className="aspect-[9/16] w-56 rounded-2xl border border-ivory/20 bg-peacock-deep/40 sm:w-64" />
          )}
          <p className="mt-6 max-w-xs font-site-serif text-xl italic text-ivory/90">
            {COPY.auth.sideQuote}
          </p>
        </div>
      </div>
    </section>
  );
}
