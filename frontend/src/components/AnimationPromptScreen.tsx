import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Film,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Video,
} from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { ApiError, analyzeImage, generateVideo, patchScene } from '../services/api';
import { CameraMovement, Scene } from '../types/invitation';
import { PhoneFrame } from './PhoneFrame';

const CAMERA_MOVEMENTS: CameraMovement[] = [
  'Slow zoom in',
  'Pan left/right',
  'Parallax',
  'Static',
];

export const AnimationPromptScreen: React.FC = () => {
  const {
    activeInvitation,
    updateScene,
    updateSceneAnimationPlan,
    updateActiveStatus,
    navigateTo,
  } = useInvitations();

  const [analyzingSceneIds, setAnalyzingSceneIds] = useState<string[]>([]);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    // Automatically run vision analysis once per image on any scene not yet analyzed
    if (activeInvitation && activeInvitation.scenes.length > 0) {
      activeInvitation.scenes.forEach((sc) => {
        const plan = sc.animationPlan;
        if (!sc.analyzed && (!plan || !plan.objectsDetected || plan.objectsDetected.length === 0)) {
          handleReanalyze(sc.id);
        }
      });
    }
  }, []);

  if (!activeInvitation || activeInvitation.scenes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-600">No confirmed cards available yet.</p>
        <button
          type="button"
          onClick={() => navigateTo('step-3-review')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--color-peacock)] text-white text-sm font-medium cursor-pointer"
        >
          Back to Image Review
        </button>
      </div>
    );
  }

  const scenes = activeInvitation.scenes;
  const allVideosDone = scenes.every((sc) => sc.animationPlan.videoStatus === 'done');
  const allVideosLimitReached = scenes.every(
    (sc) => (sc.videoGenerations ?? (sc.videoUrl ? 1 : 0)) >= (sc.maxVideoGenerations ?? 1)
  );

  const handleReanalyze = async (sceneId: string) => {
    const target = scenes.find((s) => s.id === sceneId);
    if (!target) return;
    setAnalyzingSceneIds((prev) => (prev.includes(sceneId) ? prev : [...prev, sceneId]));
    try {
      const plan = await analyzeImage(target, target.animationNote);
      updateScene(sceneId, (prev) => ({
        ...prev,
        analyzed: true,
        animationPlan: plan,
      }));
    } catch (err) {
      console.error(`Failed to analyze scene ${sceneId}:`, err);
    } finally {
      setAnalyzingSceneIds((prev) => prev.filter((id) => id !== sceneId));
    }
  };

  const handleGenerateOneVideo = async (sc: Scene) => {
    const vGen = sc.videoGenerations ?? (sc.videoUrl ? 1 : 0);
    const vMax = sc.maxVideoGenerations ?? 1;
    if (vGen >= vMax) return;
    setVideoError(null);
    try {
      const updated = await generateVideo(sc, (sceneId, status, progress) => {
        updateSceneAnimationPlan(sceneId, (prev) => ({
          ...prev,
          videoStatus: status,
          videoProgress: progress,
        }));
      });
      updateScene(sc.id, () => updated);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'LIMIT_REACHED') {
        updateScene(sc.id, (prev) => ({ ...prev, videoGenerations: vMax }));
        setVideoError(err.message);
        return;
      }
      if (err instanceof ApiError && err.code === 'IN_PROGRESS') {
        setVideoError(err.message);
        return;
      }
      setVideoError(err?.message || 'Video generation failed.');
      updateSceneAnimationPlan(sc.id, (prev) => ({
        ...prev,
        videoStatus: 'failed',
        videoProgress: 0,
      }));
    }
  };

  const handleGenerateAllVideos = async () => {
    if (allVideosLimitReached) return;
    setVideoError(null);
    setIsGeneratingVideos(true);
    updateActiveStatus('Generating');
    try {
      await Promise.all(scenes.map((sc) => handleGenerateOneVideo(sc)));
      const freshDone = activeInvitation.scenes.every((s) => s.animationPlan.videoStatus === 'done');
      if (freshDone) {
        updateActiveStatus('Ready');
      }
    } finally {
      setIsGeneratingVideos(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--color-peacock-deep)] mb-1.5">
            Stage 4 · Motion &amp; Animation
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900">
            Card Motion
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Review motion suggestions, anchor static zones, and refine the motion description for each card.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('step-3-review')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Image Review</span>
          </button>

          <button
            type="button"
            disabled={isGeneratingVideos || allVideosLimitReached}
            onClick={handleGenerateAllVideos}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[var(--color-peacock)] hover:bg-[var(--color-peacock-deep)] rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGeneratingVideos ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            <span>{allVideosLimitReached ? 'All videos generated' : 'Generate videos'}</span>
          </button>

          {allVideosDone && (
            <button
              type="button"
              onClick={() => navigateTo('step-5-compose')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <span>Proceed to Compose</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {videoError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {videoError}
        </div>
      )}

      {/* Per-scene Video Progress Strip (shown when queued/generating/done) */}
      {scenes.some((s) => s.animationPlan.videoStatus !== 'idle') && (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-[var(--color-ivory)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <Film className="w-4 h-4 text-[var(--color-peacock)]" />
              <span>Video Clip Generation Queue</span>
            </h2>
            <span className="text-xs text-stone-500 tabular-nums">
              {scenes.filter((s) => s.animationPlan.videoStatus === 'done').length} / {scenes.length} clips ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {scenes.map((sc) => {
              const st = sc.animationPlan.videoStatus;
              return (
                <div
                  key={sc.id}
                  className="rounded-xl border border-stone-200 bg-white p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-stone-900 truncate">
                      {sc.order}. {sc.title}
                    </span>
                    {st === 'failed' ? (
                      <button
                        type="button"
                        onClick={() => handleGenerateOneVideo(sc)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-rose-100"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Retry</span>
                      </button>
                    ) : (
                      <span
                        className={`text-[11px] font-medium capitalize shrink-0 ${
                          st === 'done'
                            ? 'text-emerald-700'
                            : st === 'generating'
                              ? 'text-[#9A6F3D]'
                              : 'text-stone-400'
                        }`}
                      >
                        {st}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div
                      style={{ width: `${sc.animationPlan.videoProgress}%` }}
                      className={`h-full transition-all duration-300 ${
                        st === 'done'
                          ? 'bg-emerald-600'
                          : st === 'failed'
                            ? 'bg-rose-500'
                            : 'bg-[var(--color-peacock)]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Scene-by-scene Left Image + Right AI Vision Analysis Cards */}
      <div className="mt-8 space-y-8">
        {scenes.map((sc) => {
          const plan = sc.animationPlan;
          const isVideoReady = plan.videoStatus === 'done';

          return (
            <article
              key={sc.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7 shadow-[0_2px_12px_rgba(28,25,23,0.02)] grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
            >
              {/* Left: 9:16 Scene Plate or Motion Preview */}
              <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center">
                <div className="w-full max-w-[220px] relative">
                  <PhoneFrame
                    scene={sc}
                    compact
                    animateMotion={isVideoReady}
                    className="rounded-[20px]"
                  />
                  {isVideoReady && (
                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700">
                      <Play className="w-3 h-3 fill-emerald-700" />
                      <span>9:16 video preview</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: AI Vision Analysis Card */}
              <div className="md:col-span-8 lg:col-span-9 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--color-peacock-deep)] tabular-nums">
                        Scene 0{sc.order}
                      </span>
                      <span className="text-stone-300">·</span>
                      <h2 className="font-serif text-xl font-semibold text-stone-900">
                        {sc.title}
                      </h2>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[var(--color-peacock)]" />
                      <span>Motion Suggestions</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={analyzingSceneIds.includes(sc.id)}
                    onClick={() => handleReanalyze(sc.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors self-start cursor-pointer"
                  >
                    {analyzingSceneIds.includes(sc.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[var(--color-peacock)]" />
                    )}
                    <span>Re-analyze Scene</span>
                  </button>
                </div>

                {/* Vision Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
                      Objects Detected
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.objectsDetected.map((obj, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs"
                        >
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
                      Keep Stationary
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.keepStationary.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 text-xs"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
                      Should Move
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.shouldMove.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-ivory-soft)] border border-[var(--color-hairline)] text-[#855D30] text-xs"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Optional Animation Note */}
                <div className="pt-2">
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Animation Note (Optional direction for motion)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Focus motion on floating petals and candle shimmer"
                    value={sc.animationNote || ''}
                    onChange={(e) =>
                      updateScene(sc.id, (s) => ({ ...s, animationNote: e.target.value }))
                    }
                    onBlur={(e) =>
                      patchScene(sc, { animation_note: e.target.value }).catch(console.error)
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[var(--color-peacock)]"
                  />
                </div>

                {/* Camera Movement & Grok Prompt */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      Suggested Camera Movement
                    </label>
                    <select
                      value={plan.cameraMovement}
                      onChange={(e) => {
                        const nextMovement = e.target.value as CameraMovement;
                        updateSceneAnimationPlan(sc.id, (prev) => ({
                          ...prev,
                          cameraMovement: nextMovement,
                        }));
                        patchScene(sc, {
                          animation_plan: {
                            ...sc.animationPlan,
                            cameraMovement: nextMovement,
                          },
                        }).catch(console.error);
                      }}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[var(--color-peacock)]"
                    >
                      {CAMERA_MOVEMENTS.map((mv) => (
                        <option key={mv} value={mv}>
                          {mv}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      Motion Description
                    </label>
                    <textarea
                      rows={3}
                      value={plan.grokPrompt}
                      onChange={(e) =>
                        updateSceneAnimationPlan(sc.id, (prev) => ({
                          ...prev,
                          grokPrompt: e.target.value,
                        }))
                      }
                      onBlur={(e) =>
                        patchScene(sc, { video_prompt: e.target.value }).catch(console.error)
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 bg-[var(--color-ivory)] text-stone-800 focus:outline-none focus:border-[var(--color-peacock)]"
                    />
                  </div>
                </div>

                {plan.videoStatus === 'failed' && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium pt-1">
                    <span>Video generation failed for this scene clip.</span>
                    <button
                      type="button"
                      onClick={() => handleGenerateOneVideo(sc)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Video</span>
                    </button>
                  </div>
                )}

                {isVideoReady && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium pt-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>9:16 motion clip generated and ready for Compose.</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
};
