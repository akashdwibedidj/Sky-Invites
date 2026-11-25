import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Film,
  Loader2,
  Pause,
  Play,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { exportVideo } from '../services/api';
import { PhoneFrame } from './PhoneFrame';

export const ExportScreen: React.FC = () => {
  const { activeInvitation, updateActiveStatus, navigateTo } = useInvitations();

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');
  const [exportedMeta, setExportedMeta] = useState<{
    fileName: string;
    sizeMb: string;
    url?: string;
  } | null>(null);

  const [isPlayingResult, setIsPlayingResult] = useState(true);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const scenes = activeInvitation?.scenes ?? [];

  useEffect(() => {
    if (!exportedMeta || !isPlayingResult || scenes.length === 0) return;
    const currentDuration = (scenes[activeSceneIdx]?.durationSec || 4) * 1000;
    const timer = window.setTimeout(() => {
      setActiveSceneIdx((prev) => (prev + 1) % scenes.length);
    }, currentDuration);
    return () => window.clearTimeout(timer);
  }, [exportedMeta, isPlayingResult, activeSceneIdx, scenes]);

  if (!activeInvitation || scenes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-600">No invitation cards ready for download.</p>
        <button
          type="button"
          onClick={() => navigateTo('dashboard')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--color-peacock)] text-white text-sm font-medium cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportedMeta(null);
    try {
      const result = await exportVideo(activeInvitation, (pct, label) => {
        setExportProgress(pct);
        setExportStage(label);
      });
      setExportedMeta({ fileName: result.fileName, sizeMb: result.sizeMb, url: result.url });
      updateActiveStatus('Ready', result.url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    const videoUrl = exportedMeta?.url || activeInvitation.exportedVideoUrl;
    if (!videoUrl) return;

    const fileName = exportedMeta?.fileName || `${activeInvitation.title || 'invitation'}-1080x1920.mp4`;

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setDownloadNotice(
      `Downloading ${fileName} (${exportedMeta?.sizeMb || ''})`
    );
    window.setTimeout(() => setDownloadNotice(null), 4000);
  };

  const shareUrl = `${window.location.origin}/?invite=${activeInvitation.id}`;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
    }
  };

  const previewScene = scenes[activeSceneIdx] ?? scenes[0];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--color-peacock-deep)] mb-1.5">
            Stage 6 · Video &amp; Delivery
          </p>
          <h1 className="font-serif text-3xl font-semibold text-stone-900">
            Download Invitation Video
          </h1>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800 tabular-nums self-start sm:self-auto">
          <Film className="w-3.5 h-3.5 text-[var(--color-peacock)]" />
          <span>MP4 Video</span>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        {/* Left: 9:16 Result / Preview Player */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[300px]">
            <PhoneFrame
              scene={previewScene}
              fallingEffects={activeInvitation.design.fallingEffects}
              fallingIntensity={activeInvitation.design.fallingEffectIntensity}
              isPlaying={Boolean(exportedMeta) && isPlayingResult}
              animateMotion={Boolean(exportedMeta) && isPlayingResult}
              animateText={Boolean(exportedMeta)}
              playbackTrigger={activeSceneIdx}
            />
          </div>

          {exportedMeta && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlayingResult((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                {isPlayingResult ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Play</span>
                  </>
                )}
              </button>
              <span className="text-xs text-stone-500 tabular-nums">
                Card {activeSceneIdx + 1} of {scenes.length}
              </span>
            </div>
          )}
        </div>

        {/* Right: Export Controls & Delivery Actions */}
        <div className="md:col-span-7 space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.03)] space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="font-serif text-2xl font-semibold text-stone-900">
                  {activeInvitation.title}
                </h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-ivory-soft)] border border-[var(--color-hairline)] text-[var(--color-peacock)]">
                  MP4 Video
                </span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                {scenes.length} cards · {activeInvitation.design.theme} style
              </p>
            </div>

            {/* Export Trigger / Progress */}
            {!exportedMeta && !isExporting && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[var(--color-peacock)] hover:bg-[var(--color-peacock-deep)] text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
                >
                  <Film className="w-4 h-4" />
                  <span>Prepare &amp; Download Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('step-5-compose')}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Compose</span>
                </button>
              </div>
            )}

            {isExporting && (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-800 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[var(--color-peacock)] animate-spin" />
                    <span>{exportStage || 'Compositing layers...'}</span>
                  </span>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {exportProgress}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div
                    style={{ width: `${exportProgress}%` }}
                    className="h-full bg-[var(--color-peacock)] transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {/* Exported Result Actions */}
            {exportedMeta && !isExporting && (
              <div className="space-y-5">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-emerald-900">
                      1080×1920 Portrait Video Ready
                    </div>
                    <div className="text-xs text-emerald-800 mt-0.5 tabular-nums">
                      {exportedMeta.fileName} · {exportedMeta.sizeMb}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-peacock)] hover:bg-[var(--color-peacock-deep)] text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>

                {downloadNotice && (
                  <p className="text-xs text-stone-600 text-center bg-stone-50 border border-stone-200 rounded-lg py-2 px-3">
                    {downloadNotice}
                  </p>
                )}

                <div className="pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => navigateTo('step-5-compose')}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Edit text again &amp; re-export</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Sheet Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share invitation"
        >
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold text-stone-900">
                Share Invitation
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                aria-label="Close share dialog"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Send this portrait invitation link directly to guests on WhatsApp, iMessage, or email.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700"
              />
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-peacock)] hover:bg-[var(--color-peacock-deep)] text-white text-xs font-medium cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
