import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { COPY } from '../content/copy';
import type { InvitationExample } from '../types';
import { InvitationArtwork } from './InvitationArtwork';

interface ExamplePreviewModalProps {
  invitation: InvitationExample | null;
  onClose: () => void;
}

export function ExamplePreviewModal({ invitation, onClose }: ExamplePreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = COPY.previewModal.steps;

  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(true);
  }, [invitation?.id]);

  useEffect(() => {
    if (!invitation || !isPlaying) return;
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [invitation, isPlaying, steps.length]);

  useEffect(() => {
    if (!invitation) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [invitation, onClose]);

  return (
    <AnimatePresence>
      {invitation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-peacock-deep/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-hairline bg-ivory shadow-2xl md:flex-row"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={COPY.previewModal.closeLabel}
              className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-ivory text-peacock transition-colors hover:bg-ivory-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center justify-center bg-ivory-soft p-6 sm:p-8 md:w-1/2">
              <motion.div
                animate={
                  isPlaying
                    ? { scale: [1, 1.02, 1], y: [0, -3, 0] }
                    : { scale: 1, y: 0 }
                }
                transition={{
                  duration: 5.2,
                  repeat: isPlaying ? Infinity : 0,
                  ease: 'easeInOut',
                }}
              >
                <InvitationArtwork invitation={invitation} size="sm" />
              </motion.div>

              <div className="mt-4 flex w-48 gap-1.5">
                {steps.map((step, idx) => (
                  <div
                    key={step}
                    className="h-0.5 flex-1 overflow-hidden rounded-full bg-peacock/15"
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        idx === stepIndex
                          ? 'w-full bg-peacock'
                          : idx < stepIndex
                            ? 'w-full bg-gold-warm'
                            : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 sm:p-8 md:w-1/2">
              <div>
                <p className="text-xs font-medium text-gold-dark">
                  {invitation.category} · {invitation.moodWord}
                </p>
                <h3
                  id="preview-modal-title"
                  className="mt-2 font-site-serif text-3xl font-semibold text-peacock"
                >
                  {invitation.title}
                </h3>
                <p className="mt-2 text-sm text-ink-muted">
                  {invitation.dateText} · {invitation.venueText}
                </p>

                <div className="mt-6 space-y-2 border-t border-hairline pt-4 text-sm">
                  <p className="font-medium text-peacock">{steps[stepIndex]}</p>
                  <p className="text-xs leading-relaxed text-ink-muted">
                    {COPY.previewModal.note}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-ivory-soft px-3.5 py-2 text-xs font-medium text-peacock transition-colors hover:bg-ivory-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {isPlaying ? COPY.previewModal.pause : COPY.previewModal.play}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStepIndex(0);
                      setIsPlaying(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-ivory-soft px-3.5 py-2 text-xs font-medium text-peacock transition-colors hover:bg-ivory-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {COPY.previewModal.restart}
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-hairline pt-5">
                <Link
                  to="/editor/create"
                  onClick={onClose}
                  className="btn-glass-peacock inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {COPY.previewModal.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
