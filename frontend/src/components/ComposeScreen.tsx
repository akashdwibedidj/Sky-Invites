import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import {
  FALLING_EFFECTS,
  PAGE_TRANSITIONS,
  TEXT_ANIMATIONS,
} from '../data/mockInvitations';
import {
  FallingEffect,
  PageTransition,
  TextAnimation,
} from '../types/invitation';
import { PhoneFrame } from './PhoneFrame';

function getSceneTransitionVariants(transition: PageTransition) {
  switch (transition) {
    case 'Slide':
      return {
        initial: { opacity: 0, x: 40 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 },
      };
    case 'Zoom':
      return {
        initial: { opacity: 0, scale: 0.94 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.06 },
      };
    case 'Page Flip':
      return {
        initial: { opacity: 0, rotateY: 22, scale: 0.96 },
        animate: { opacity: 1, rotateY: 0, scale: 1 },
        exit: { opacity: 0, rotateY: -22, scale: 0.96 },
      };
    case 'Curtain':
      return {
        initial: { opacity: 0, scaleX: 0.88 },
        animate: { opacity: 1, scaleX: 1 },
        exit: { opacity: 0, scaleX: 1.05 },
      };
    case 'Dissolve':
      return {
        initial: { opacity: 0, filter: 'blur(4px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(4px)' },
      };
    case 'Fade':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
}

export const ComposeScreen: React.FC = () => {
  const {
    activeInvitation,
    updateScene,
    updateSceneTextLayer,
    updateActiveDesign,
    navigateTo,
  } = useInvitations();

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [playbackTrigger, setPlaybackTrigger] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const scenes = activeInvitation?.scenes ?? [];

  // Compute cumulative timeline offsets
  const timelineSegments = useMemo(() => {
    let cursor = 0;
    return scenes.map((sc, idx) => {
      const start = cursor;
      const duration = Math.max(2, sc.durationSec || 5);
      cursor += duration;
      return { scene: sc, index: idx, start, end: cursor, duration };
    });
  }, [scenes]);

  const totalDuration = timelineSegments.length
    ? timelineSegments[timelineSegments.length - 1].end
    : 0;

  // Determine current scene from scrubber elapsedSec
  const activeSegment = useMemo(() => {
    if (timelineSegments.length === 0) return null;
    return (
      timelineSegments.find((seg) => elapsedSec >= seg.start && elapsedSec < seg.end) ??
      timelineSegments[timelineSegments.length - 1]
    );
  }, [timelineSegments, elapsedSec]);

  useEffect(() => {
    if (activeSegment && activeSegment.index !== selectedIdx && isPlaying) {
      setSelectedIdx(activeSegment.index);
      setPlaybackTrigger((t) => t + 1);
    }
  }, [activeSegment, isPlaying, selectedIdx]);

  useEffect(() => {
    if (!isPlaying || totalDuration <= 0) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.1;
        if (next >= totalDuration) {
          return 0;
        }
        return Number(next.toFixed(1));
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [isPlaying, totalDuration]);

  if (!activeInvitation || scenes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-600">No cards ready to preview yet.</p>
        <button
          type="button"
          onClick={() => navigateTo('step-3-review')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--color-peacock)] text-white text-sm font-medium cursor-pointer"
        >
          Go to Image Review
        </button>
      </div>
    );
  }

  const currentScene = scenes[selectedIdx] ?? scenes[0];
  const { design } = activeInvitation;
  const activeFallingEnabled = design.fallingEffects.some((e) => e !== 'None');

  const handleSelectClip = (idx: number) => {
    setIsPlaying(false);
    setSelectedIdx(idx);
    const seg = timelineSegments[idx];
    if (seg) setElapsedSec(seg.start);
    setPlaybackTrigger((t) => t + 1);
  };

  const togglePlay = () => {
    if (!isPlaying) {
      setPlaybackTrigger((t) => t + 1);
    }
    setIsPlaying((p) => !p);
  };

  const toggleFallingEffect = (effect: FallingEffect) => {
    if (effect === 'None') {
      updateActiveDesign({ fallingEffects: ['None'] });
      return;
    }
    const clean = design.fallingEffects.filter((e) => e !== 'None');
    if (clean.includes(effect)) {
      const next = clean.filter((e) => e !== effect);
      updateActiveDesign({ fallingEffects: next.length ? next : ['None'] });
    } else {
      updateActiveDesign({ fallingEffects: [...clean, effect] });
    }
  };

  const transitionVariants = getSceneTransitionVariants(currentScene.transitionAfter);

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[var(--color-peacock-deep)] mb-1.5">
            Stage 5 · Timeline & Text Compositing
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900">
            Compose Invitation Film
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Fine-tune text timing, clip transitions, and atmospheric overlays before preparing your video.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('step-4-animation')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Animation</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('step-6-export')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[var(--color-peacock)] hover:bg-[var(--color-peacock-deep)] rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <span>Proceed to Download</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split: Central 9:16 Player + Timeline (Left/Center) & Right Inspector */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Center: 9:16 Player + Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Player Stage */}
          <div className="rounded-2xl border border-stone-200 bg-[var(--color-ivory)] p-6 flex flex-col items-center">
            <div className="w-full max-w-[300px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentScene.id}-${playbackTrigger}`}
                  initial={transitionVariants.initial}
                  animate={transitionVariants.animate}
                  exit={transitionVariants.exit}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PhoneFrame
                    scene={currentScene}
                    fallingEffects={design.fallingEffects}
                    fallingIntensity={design.fallingEffectIntensity}
                    isPlaying={isPlaying}
                    animateMotion={isPlaying}
                    animateText
                    playbackTrigger={playbackTrigger}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Playback Controls & Scrubber */}
            <div className="w-full max-w-lg mt-6 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Play Preview</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setElapsedSec(0);
                      setSelectedIdx(0);
                      setPlaybackTrigger((t) => t + 1);
                    }}
                    aria-label="Restart preview"
                    className="p-2 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs font-medium text-stone-600 tabular-nums">
                  {elapsedSec.toFixed(1)}s / {totalDuration.toFixed(1)}s
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(1, totalDuration)}
                step={0.1}
                value={elapsedSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIsPlaying(false);
                  setElapsedSec(val);
                  const seg = timelineSegments.find((s) => val >= s.start && val < s.end);
                  if (seg) {
                    setSelectedIdx(seg.index);
                    setPlaybackTrigger((t) => t + 1);
                  }
                }}
                aria-label="Video timeline scrubber"
                className="w-full accent-[var(--color-peacock)] cursor-pointer"
              />
            </div>
          </div>

          {/* Scene Clips Timeline */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Card Clips Timeline
              </h2>
              <span className="text-xs text-stone-500 tabular-nums">
                {scenes.length} clips · {totalDuration}s total
              </span>
            </div>

            <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2">
              {timelineSegments.map((seg) => {
                const isSelected = seg.index === selectedIdx;
                return (
                  <button
                    key={seg.scene.id}
                    type="button"
                    onClick={() => handleSelectClip(seg.index)}
                    className={`min-w-[140px] flex-1 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-peacock)] bg-[var(--color-ivory-soft)] ring-2 ring-[var(--color-peacock)]/20'
                        : 'border-stone-200 bg-[var(--color-ivory)] hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-[var(--color-peacock)] tabular-nums">
                        Clip 0{seg.scene.order}
                      </span>
                      <span className="text-[11px] text-stone-500 tabular-nums">
                        {seg.duration}s
                      </span>
                    </div>
                    <div className="text-xs font-medium text-stone-900 truncate">
                      {seg.scene.title}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1 truncate">
                      {seg.scene.textLayer.animation} · → {seg.scene.transitionAfter}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Per-Scene Text, Transitions & Falling Effects */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Per-scene Text Edit & Sequential Timing */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Clip 0{currentScene.order}: {currentScene.title}
              </h2>
              <button
                type="button"
                onClick={() => setPlaybackTrigger((t) => t + 1)}
                className="text-xs font-medium text-[var(--color-peacock)] hover:underline cursor-pointer"
              >
                Replay Text
              </button>
            </div>

            <div className="space-y-2.5">
              {currentScene.textLayer.lines.map((line) => (
                <div key={line.id}>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">
                    {line.role}
                  </label>
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) =>
                      updateSceneTextLayer(currentScene.id, (layer) => ({
                        ...layer,
                        lines: layer.lines.map((l) =>
                          l.id === line.id ? { ...l, text: e.target.value } : l
                        ),
                      }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[var(--color-peacock)]"
                  />
                </div>
              ))}
            </div>

            {/* Text Transition & Sequential Timing */}
            <div className="pt-4 border-t border-stone-100 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2">
                  Text Transition
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TEXT_ANIMATIONS.map((anim) => {
                    const active = currentScene.textLayer.animation === anim.value;
                    return (
                      <button
                        key={anim.value}
                        type="button"
                        onClick={() => {
                          updateSceneTextLayer(currentScene.id, (l) => ({
                            ...l,
                            animation: anim.value as TextAnimation,
                          }));
                          setPlaybackTrigger((t) => t + 1);
                        }}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'border-[var(--color-peacock)] bg-[var(--color-ivory-soft)] text-[var(--color-peacock)]'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                        }`}
                      >
                        {anim.value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-stone-700">
                      Sequential Line Delay
                    </label>
                    <span className="text-xs font-semibold text-stone-800 tabular-nums">
                      {currentScene.textLayer.sequentialDelayMs}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={500}
                    step={20}
                    value={currentScene.textLayer.sequentialDelayMs}
                    onChange={(e) => {
                      updateSceneTextLayer(currentScene.id, (l) => ({
                        ...l,
                        sequentialDelayMs: Number(e.target.value),
                      }));
                      setPlaybackTrigger((t) => t + 1);
                    }}
                    className="w-full accent-[var(--color-peacock)] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-stone-700">
                      Clip Duration
                    </label>
                    <span className="text-xs font-semibold text-stone-800 tabular-nums">
                      {currentScene.durationSec}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={8}
                    step={1}
                    value={currentScene.durationSec}
                    onChange={(e) =>
                      updateScene(currentScene.id, (sc) => ({
                        ...sc,
                        durationSec: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[var(--color-peacock)] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Scene Transition After Clip */}
            <div className="pt-4 border-t border-stone-100">
              <label className="block text-xs font-medium text-stone-700 mb-2">
                Transition to Next Card
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAGE_TRANSITIONS.map((tr) => {
                  const active = currentScene.transitionAfter === tr.value;
                  return (
                    <button
                      key={tr.value}
                      type="button"
                      onClick={() => {
                        updateScene(currentScene.id, (sc) => ({
                          ...sc,
                          transitionAfter: tr.value,
                        }));
                        setPlaybackTrigger((t) => t + 1);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? 'border-[var(--color-peacock)] bg-[var(--color-ivory-soft)] text-[var(--color-peacock)]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {tr.value}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Falling Effect Overlay Toggle + Intensity Slider */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-peacock)]" />
                <h2 className="font-serif text-lg font-semibold text-stone-900">
                  Falling Effect Overlay
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateActiveDesign({
                    fallingEffects: activeFallingEnabled ? ['None'] : ['Flower petals'],
                  })
                }
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  activeFallingEnabled
                    ? 'bg-[var(--color-ivory-soft)] border-[var(--color-peacock)] text-[var(--color-peacock)]'
                    : 'bg-stone-100 border-stone-200 text-stone-600'
                }`}
              >
                {activeFallingEnabled ? 'Enabled' : 'Off'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {FALLING_EFFECTS.map((ef) => {
                const selected = design.fallingEffects.includes(ef.value);
                return (
                  <button
                    key={ef.value}
                    type="button"
                    onClick={() => toggleFallingEffect(ef.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      selected
                        ? 'border-[var(--color-peacock)] bg-[var(--color-ivory-soft)] text-[var(--color-peacock)]'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {ef.value}
                  </button>
                );
              })}
            </div>

            {activeFallingEnabled && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-stone-400" />
                    <span>Particle Intensity</span>
                  </span>
                  <span className="text-xs font-semibold text-stone-900 tabular-nums">
                    {design.fallingEffectIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={design.fallingEffectIntensity}
                  onChange={(e) =>
                    updateActiveDesign({
                      fallingEffectIntensity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[var(--color-peacock)] cursor-pointer"
                />
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
};
