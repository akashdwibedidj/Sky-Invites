import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import {
  COLOR_PALETTES,
  FALLING_EFFECTS,
  GOOGLE_FONT_OPTIONS,
  MUSIC_MOODS,
  PAGE_TRANSITIONS,
  TEXT_ANIMATIONS,
  THEME_STYLES,
} from '../data/mockInvitations';
import { FallingEffect, TextPlacement } from '../types/invitation';
import { FallingEffectsOverlay } from './FallingEffectsOverlay';

export const DesignPreferencesScreen: React.FC = () => {
  const { activeInvitation, updateActiveDesign, navigateTo } = useInvitations();

  if (!activeInvitation) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-600">Select or create an invitation first.</p>
        <button
          type="button"
          onClick={() => navigateTo('dashboard')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[#B88B58] text-white text-sm font-medium cursor-pointer"
        >
          Dashboard
        </button>
      </div>
    );
  }

  const { design, details, type } = activeInvitation;
  const hasGeneratedImages = activeInvitation.scenes.some(
    (s) => s.imageStatus === 'done' && Boolean(s.imageUrl)
  );

  const previewNames =
    details.groomName && details.brideName
      ? `${details.groomName.split(' ')[0]} & ${details.brideName.split(' ')[0]}`
      : details.honoreeName || details.hostName || 'Aarav & Meera';

  const toggleFallingEffect = (effect: FallingEffect) => {
    if (effect === 'None') {
      updateActiveDesign({ fallingEffects: ['None'] });
      return;
    }
    const withoutNone = design.fallingEffects.filter((e) => e !== 'None');
    if (withoutNone.includes(effect)) {
      const next = withoutNone.filter((e) => e !== effect);
      updateActiveDesign({ fallingEffects: next.length ? next : ['None'] });
    } else {
      updateActiveDesign({ fallingEffects: [...withoutNone, effect] });
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-12">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#A27644] mb-2">
          Stage 2 · Visual & Motion Direction
        </p>
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Design Preferences
        </h1>
        <p className="mt-1.5 text-sm text-stone-600">
          Configure scene pacing, visual stationery theme, typography pairing, and ambient effects before our AI studio generates your 9:16 frames.
        </p>
      </div>

      <div className="space-y-8">
        {/* 1. Number of Pages / Scenes & Page Transition */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
            <div>
              <h2 className="font-serif text-xl font-semibold text-stone-900">
                Number of Pages / Scenes
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Choose between 1 and 12 portrait 9:16 cards for your invitation reel.
              </p>
            </div>

            <div className="inline-flex items-center gap-3 bg-[#FAF9F6] border border-stone-200 rounded-xl p-1.5 self-start sm:self-auto">
              <button
                type="button"
                disabled={hasGeneratedImages}
                onClick={() =>
                  updateActiveDesign({ sceneCount: Math.max(1, design.sceneCount - 1) })
                }
                aria-label="Decrease scene count"
                className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-16 text-center font-semibold text-base text-stone-900 tabular-nums">
                {design.sceneCount} {design.sceneCount === 1 ? 'scene' : 'scenes'}
              </span>
              <button
                type="button"
                disabled={hasGeneratedImages}
                onClick={() =>
                  updateActiveDesign({ sceneCount: Math.min(12, design.sceneCount + 1) })
                }
                aria-label="Increase scene count"
                className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {hasGeneratedImages && (
              <p className="text-[11px] text-stone-500">
                Card count & duration are locked after images are generated.
              </p>
            )}
          </div>

          {/* Transition Between Pages */}
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">
              Transition Between Pages
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Sets the default transition choreography between consecutive cards.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PAGE_TRANSITIONS.map((tr) => {
                const selected = design.transition === tr.value;
                return (
                  <button
                    key={tr.value}
                    type="button"
                    onClick={() => updateActiveDesign({ transition: tr.value })}
                    className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-[#B88B58] bg-[#FAF6EE] ring-2 ring-[#B88B58]/20'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="h-10 rounded-lg bg-stone-100/80 border border-stone-200/70 mb-2.5 flex items-center justify-center overflow-hidden relative">
                      <div className="w-5 h-7 rounded-[3px] bg-white border border-stone-300 shadow-2xs" />
                      <div className="w-5 h-7 rounded-[3px] bg-[#E8DEC8] border border-[#C9B38C] -ml-2 opacity-80" />
                    </div>
                    <div className="text-xs font-semibold text-stone-900">{tr.value}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                      {tr.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. Falling Effects (Multi-select with small animated previews) */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-stone-900">
                Falling Effects (Optional)
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Select one or more subtle atmospheric overlays with live preview.
              </p>
            </div>
            <span className="text-xs text-[#8F6534] font-medium">
              Can also be added after video generation.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {FALLING_EFFECTS.map((ef) => {
              const selected = design.fallingEffects.includes(ef.value);
              return (
                <button
                  key={ef.value}
                  type="button"
                  onClick={() => toggleFallingEffect(ef.value)}
                  className={`relative rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-[#B88B58] bg-[#FAF6EE] ring-2 ring-[#B88B58]/20'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="relative h-14 rounded-lg bg-gradient-to-b from-stone-800/85 to-stone-700/85 overflow-hidden mb-2.5 flex items-center justify-center">
                    {ef.value !== 'None' ? (
                      <FallingEffectsOverlay effects={[ef.value]} intensity={65} compact />
                    ) : (
                      <span className="text-[10px] text-stone-300 uppercase tracking-wider">
                        Clean
                      </span>
                    )}
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#B88B58] text-white flex items-center justify-center z-30">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-stone-900">{ef.value}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                    {ef.description}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Theme, Visual Style & Color Palette */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-7">
          <div>
            <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">
              Theme & Visual Style
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Guides the architectural arches, botanical elements, and paper texture of every scene.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEME_STYLES.map((th) => {
                const selected = design.theme === th.style;
                return (
                  <button
                    key={th.style}
                    type="button"
                    onClick={() => updateActiveDesign({ theme: th.style })}
                    className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-[#B88B58] bg-[#FAF6EE] ring-2 ring-[#B88B58]/20'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-stone-900">{th.style}</div>
                    <div className="text-xs text-stone-500 mt-1 leading-snug">
                      {th.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100">
            <h3 className="text-sm font-semibold text-stone-900 mb-3">
              Color Palette
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {COLOR_PALETTES.map((pal) => {
                const selected = design.palette.id === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => updateActiveDesign({ palette: pal })}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-[#B88B58] bg-[#FAF6EE] ring-2 ring-[#B88B58]/20'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2.5">
                      {[pal.primary, pal.secondary, pal.accent, pal.text].map((hex, i) => (
                        <span
                          key={i}
                          style={{ backgroundColor: hex }}
                          className="w-5 h-5 rounded-full border border-stone-300/70"
                        />
                      ))}
                    </div>
                    <div className="text-xs font-semibold text-stone-900">{pal.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Typography, Text Placement & Text Animation */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">
            Typography & Text Placement
          </h2>
          <p className="text-xs text-stone-500 mb-6">
            Typography is stored in a separate editable layer above the video so you can adjust wording anytime.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Heading Font
                  </label>
                  <select
                    value={design.headingFont}
                    onChange={(e) => updateActiveDesign({ headingFont: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[#B88B58]"
                  >
                    {GOOGLE_FONT_OPTIONS.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Body Font
                  </label>
                  <select
                    value={design.bodyFont}
                    onChange={(e) => updateActiveDesign({ bodyFont: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[#B88B58]"
                  >
                    {GOOGLE_FONT_OPTIONS.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Text Placement per Scene
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl">
                    {(['top', 'center', 'bottom'] as TextPlacement[]).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => updateActiveDesign({ textPlacement: pos })}
                        className={`py-2 text-xs font-medium capitalize rounded-lg transition-all cursor-pointer ${
                          design.textPlacement === pos
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Text Alignment
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl">
                    {[
                      { val: 'left' as const, icon: <AlignLeft className="w-3.5 h-3.5" />, label: 'Left' },
                      { val: 'center' as const, icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Center' },
                      { val: 'right' as const, icon: <AlignRight className="w-3.5 h-3.5" />, label: 'Right' },
                    ].map((al) => (
                      <button
                        key={al.val}
                        type="button"
                        onClick={() => updateActiveDesign({ textAlignment: al.val })}
                        className={`py-2 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          design.textAlignment === al.val
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {al.icon}
                        <span>{al.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Text Reveal Animation
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {TEXT_ANIMATIONS.map((anim) => {
                    const selected = design.textAnimation === anim.value;
                    return (
                      <button
                        key={anim.value}
                        type="button"
                        onClick={() => updateActiveDesign({ textAnimation: anim.value })}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-[#B88B58] bg-[#FAF6EE]'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="text-xs font-semibold text-stone-900">{anim.value}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                          {anim.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Typography Preview Card */}
            <div className="lg:col-span-5">
              <div
                style={{
                  backgroundColor: design.palette.primary,
                  borderColor: design.palette.secondary,
                  color: design.palette.text,
                }}
                className={`h-full min-h-[240px] rounded-2xl border p-6 flex flex-col ${
                  design.textPlacement === 'top'
                    ? 'justify-start'
                    : design.textPlacement === 'bottom'
                      ? 'justify-end'
                      : 'justify-center'
                } ${
                  design.textAlignment === 'left'
                    ? 'text-left items-start'
                    : design.textAlignment === 'right'
                      ? 'text-right items-end'
                      : 'text-center items-center'
                }`}
              >
                <span
                  style={{
                    fontFamily: `"${design.bodyFont}", sans-serif`,
                    color: design.palette.accent,
                  }}
                  className="text-[10px] tracking-[0.2em] uppercase font-medium mb-2"
                >
                  Live Font Preview · {type}
                </span>
                <div
                  style={{ fontFamily: `"${design.headingFont}", serif` }}
                  className="text-2xl sm:text-3xl font-semibold leading-tight"
                >
                  {previewNames}
                </div>
                <p
                  style={{ fontFamily: `"${design.bodyFont}", serif` }}
                  className="mt-2 text-sm opacity-85 max-w-xs"
                >
                  Cordially invite you to join us for an unforgettable celebration.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Video Preferences */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6">
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            Video & Generation Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-stone-700">
                  Duration per Scene
                </label>
                <span className="text-xs font-semibold text-stone-900 tabular-nums">
                  {design.durationPerScene} seconds
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={8}
                step={1}
                disabled={hasGeneratedImages}
                value={design.durationPerScene}
                onChange={(e) =>
                  updateActiveDesign({ durationPerScene: Number(e.target.value) })
                }
                className="w-full accent-[#B88B58] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-stone-400 mt-1 tabular-nums">
                <span>3s (Brisk)</span>
                <span>5s (Balanced)</span>
                <span>8s (Poetic)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Music Mood (Optional)
              </label>
              <select
                value={design.musicMood}
                onChange={(e) => updateActiveDesign({ musicMood: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[#B88B58]"
              >
                {MUSIC_MOODS.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Story-driven toggle */}
          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-stone-900">
                Scene Generation Mode
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {design.storyDriven
                  ? 'Story-driven: Generates scenes one after another so visual motifs carry seamlessly across chapters.'
                  : 'Parallel: Generates all scene artworks simultaneously for faster turnaround.'}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateActiveDesign({ storyDriven: true })}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  design.storyDriven
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                One after another (Story-driven)
              </button>
              <button
                type="button"
                onClick={() => updateActiveDesign({ storyDriven: false })}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  !design.storyDriven
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Parallel
              </button>
            </div>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigateTo('step-1-details')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Details</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo(hasGeneratedImages ? 'step-3-review' : 'generating')}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium text-white bg-[#B88B58] hover:bg-[#A27644] rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            {!hasGeneratedImages && <Sparkles className="w-4 h-4" />}
            <span>{hasGeneratedImages ? 'Back to Review' : 'Generate Invitation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
};
