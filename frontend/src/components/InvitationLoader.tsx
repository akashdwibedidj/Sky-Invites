/**
 * InvitationLoader
 * Wraps every /invitation/:id/* route.
 * - On mount: reads :id from the URL, calls getSavedInvitation, injects the data
 *   into context, then renders children.
 * - While loading: shows a neutral spinner.
 * - On error (404 / network): shows an inline error card with a home link.
 * - Special case – generating screen on refresh: if status is still running we
 *   show a "Still generating…" message and poll until done, then redirect to review.
 *   We never re-fire the generation pipeline.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { getSavedInvitation } from '../services/api';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

type LoadState = 'loading' | 'ready' | 'error' | 'not-found';

export const InvitationLoader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeInvitation, activeInvitationId, loadSavedInvitation } = useInvitations();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [generatingMsg, setGeneratingMsg] = useState('');
  const fetchedRef = useRef(false);

  const isGeneratingRoute = location.pathname.endsWith('/generating');

  useEffect(() => {
    if (!id) {
      setLoadState('not-found');
      return;
    }

    // If the context already has this invitation loaded, skip the fetch.
    // This covers the generating route where the draft is in-memory but
    // not yet persisted to the backend (the real backend ID is set later
    // by setInvitationId after createScenes returns).
    if (activeInvitationId === id && activeInvitation) {
      setLoadState('ready');
      return;
    }

    // Also match by invitation_id field (the draft may have been assigned the
    // real backend ID but not yet reflected in activeInvitationId)
    if (activeInvitation && (activeInvitation.invitation_id === id || activeInvitation.id === id)) {
      setLoadState('ready');
      return;
    }

    // Guard: only fetch once per mount
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    async function load() {
      try {
        // First check the backend status (lightweight)
        const statusRes = await fetch(`${API_URL}/api/invitations/${id}/status`);
        if (!statusRes.ok) {
          if (statusRes.status === 404) { setLoadState('not-found'); return; }
          throw new Error(`HTTP ${statusRes.status}`);
        }
        const statusData = await statusRes.json();
        const backendStatus: string = statusData.status ?? '';

        if (isGeneratingRoute && (backendStatus === 'running' || backendStatus === 'pending')) {
          // Show status-only spinner; poll until done
          if (!cancelled) setGeneratingMsg('Generation is in progress, please wait…');

          let done = false;
          for (let i = 0; i < 120 && !done && !cancelled; i++) {
            await new Promise<void>((r) => setTimeout(r, 2500));
            if (cancelled) break;
            try {
              const sr = await fetch(`${API_URL}/api/invitations/${id}/status`);
              if (sr.ok) {
                const sd = await sr.json();
                if (sd.status === 'done' || sd.status === 'stage1_done' || sd.status === 'failed') {
                  done = true;
                }
              }
            } catch { /* keep polling */ }
          }
          if (cancelled) return;
          // redirect to review regardless
          navigate(`/invitation/${id}/review`, { replace: true });
          return;
        }

        // Load full invitation from backend
        const invitation = await getSavedInvitation(id!);
        if (cancelled) return;

        const hasVideos = invitation.scenes.some((s) => s.videoUrl);
        const hasScenes = invitation.scenes.length > 0;

        // For the generating route when already done, redirect to the right step
        if (isGeneratingRoute) {
          const target = hasVideos
            ? `/invitation/${id}/animation`
            : hasScenes
            ? `/invitation/${id}/review`
            : `/invitation/${id}/review`;
          loadSavedInvitation(invitation, hasVideos ? 'step-4-animation' : 'step-3-review');
          navigate(target, { replace: true });
          return;
        }

        loadSavedInvitation(invitation, 'step-3-review'); // screen arg only used for history; real URL stays
        if (!cancelled) setLoadState('ready');
      } catch (err: any) {
        if (!cancelled) {
          if (err?.message?.includes('404') || err?.message?.includes('not found')) {
            setLoadState('not-found');
          } else {
            setErrorMsg(err?.message || 'Unknown error');
            setLoadState('error');
          }
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (generatingMsg && loadState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-stone-600">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-peacock)]" />
        <p className="text-sm">{generatingMsg}</p>
      </div>
    );
  }

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-peacock)]" />
      </div>
    );
  }

  if (loadState === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="font-serif text-2xl font-semibold text-stone-900">Invitation not found</h2>
        <p className="text-sm text-stone-600 max-w-sm">
          This invitation may have been deleted or the link is incorrect.
        </p>
        <button
          type="button"
          onClick={() => navigate('/editor')}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--color-peacock)] text-white text-sm font-medium hover:bg-[var(--color-peacock-deep)] transition-colors cursor-pointer"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <h2 className="font-serif text-2xl font-semibold text-stone-900">Could not load invitation</h2>
        <p className="text-sm text-stone-500 max-w-sm">{errorMsg || 'The server may be unreachable.'}</p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => { fetchedRef.current = false; setLoadState('loading'); setErrorMsg(''); }}
            className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate('/editor')}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-peacock)] text-white text-sm font-medium hover:bg-[var(--color-peacock-deep)] transition-colors cursor-pointer"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
