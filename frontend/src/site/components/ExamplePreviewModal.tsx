import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Volume2, VolumeX, X } from 'lucide-react';
import { COPY } from '../content/copy';
import type { SampleExample } from '../content/examples';

interface ExamplePreviewModalProps {
  sample: SampleExample | null;
  onClose: () => void;
}

export function ExamplePreviewModal({ sample, onClose }: ExamplePreviewModalProps) {
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    setIsMuted(true);
  }, [sample?.id]);

  useEffect(() => {
    if (!sample) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sample, onClose]);

  return (
    <AnimatePresence>
      {sample && (
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
              <div className="relative aspect-[9/16] w-52 overflow-hidden rounded-2xl border border-hairline bg-ivory-card shadow-[var(--shadow-paper)] sm:w-56">
                {sample.videoFile ? (
                  <>
                    <video
                      key={sample.videoFile}
                      src={sample.videoFile}
                      poster={sample.posterImage}
                      controls
                      autoPlay
                      loop
                      playsInline
                      muted={isMuted}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setIsMuted((prev) => !prev)}
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-peacock-deep/80 text-ivory transition-colors hover:bg-peacock-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </>
                ) : (
                  <img
                    src={sample.posterImage}
                    alt={sample.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 sm:p-8 md:w-1/2">
              <div>
                <p className="text-xs font-medium text-gold-dark">{sample.category}</p>
                <h3
                  id="preview-modal-title"
                  className="mt-2 font-site-serif text-3xl font-semibold text-peacock"
                >
                  {sample.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {sample.caption}
                </p>
              </div>

              <div className="mt-8 border-t border-hairline pt-5">
                <Link
                  to="/signup"
                  onClick={onClose}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-peacock px-5 py-3 text-sm font-medium text-ivory transition-colors hover:bg-peacock-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock"
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
