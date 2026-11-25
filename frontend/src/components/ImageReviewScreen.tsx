import React, { useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  Loader2,
  Move,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { GOOGLE_FONT_OPTIONS } from '../data/mockInvitations';
import { ApiError, editImageWithInstruction, patchScene, regenerateImage } from '../services/api';
import { TextAlignment, TextLayer, TextLine, TextPlacement } from '../types/invitation';
import { PhoneFrame } from './PhoneFrame';

const TEXT_COLOR_SWATCHES = ['#292524', '#382510', '#3A2826', '#687860', '#8F6534', '#FAF6EE'];

export const ImageReviewScreen: React.FC = () => {
  const {
    activeInvitation,
    selectedSceneId,
    setSelectedSceneId,
    updateScene,
    updateSceneTextLayer,
    setActiveScenes,
    navigateTo,
  } = useInvitations();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  if (!activeInvitation || activeInvitation.scenes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-serif text-2xl font-semibold text-stone-900">
          No scenes generated yet
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Complete Design Preferences to generate your 9:16 invitation scenes.
        </p>
        <button
          type="button"
          onClick={() => navigateTo('step-2-design')}
          className="mt-5 px-5 py-2.5 rounded-xl bg-[#B88B58] text-white text-sm font-medium cursor-pointer"
        >
          Go to Design Preferences
        </button>
      </div>
    );
  }

  const scenes = activeInvitation.scenes;
  const activeScene =
    scenes.find((s) => s.id === selectedSceneId) ?? scenes[0];

  const imageGenerations = activeScene.imageGenerations ?? (activeScene.imageUrl ? 1 : 0);
  const maxImageGenerations = activeScene.maxImageGenerations ?? 2;
  const regenLimitReached = imageGenerations >= maxImageGenerations;
  const isImageBusy = isRegenerating || isEditingImage || activeScene.imageStatus === 'generating';

  const handleRegenerate = async () => {
    if (regenLimitReached || isImageBusy) return;
    setImageError(null);
    setIsRegenerating(true);
    try {
      const updated = await regenerateImage(activeScene, activeScene.imagePrompt);
      updateScene(activeScene.id, () => updated);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'LIMIT_REACHED') {
        updateScene(activeScene.id, (sc) => ({ ...sc, imageGenerations: maxImageGenerations }));
      }
      setImageError(err?.message || 'Unable to regenerate image.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEditWithInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInstruction.trim() || regenLimitReached || isImageBusy) return;
    setImageError(null);
    setIsEditingImage(true);
    try {
      const updated = await editImageWithInstruction(activeScene, editInstruction);
      updateScene(activeScene.id, () => updated);
      setEditInstruction('');
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'LIMIT_REACHED') {
        updateScene(activeScene.id, (sc) => ({ ...sc, imageGenerations: maxImageGenerations }));
      }
      setImageError(err?.message || 'Unable to apply image edit.');
    } finally {
      setIsEditingImage(false);
    }
  };

  const updateAndPatchTextLayer = (updater: (l: TextLayer) => TextLayer) => {
    updateSceneTextLayer(activeScene.id, (layer) => {
      const next = updater(layer);
      patchScene(activeScene, { text_layer: next }).catch(console.error);
      return next;
    });
  };

  const handleUpdateLine = (lineId: string, text: string) => {
    updateSceneTextLayer(activeScene.id, (layer) => ({
      ...layer,
      lines: layer.lines.map((l) => (l.id === lineId ? { ...l, text } : l)),
    }));
  };

  const handleAddLine = () => {
    const newLine: TextLine = {
      id: `line-${Date.now()}`,
      role: 'detail',
      text: 'New detail line',
    };
    updateAndPatchTextLayer((layer) => ({
      ...layer,
      lines: [...layer.lines, newLine],
    }));
  };

  const handleDeleteLine = (lineId: string) => {
    updateAndPatchTextLayer((layer) => ({
      ...layer,
      lines: layer.lines.filter((l) => l.id !== lineId),
    }));
  };

  const handleConfirmAll = () => {
    const confirmedScenes = scenes.map((sc) => ({ ...sc, confirmed: true }));
    setActiveScenes(confirmedScenes);
    navigateTo('step-4-animation');
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#A27644] mb-1.5">
            Stage 3 · Separate Layer Editor
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900">
            Image & Typography Review
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#B88B58] shrink-0" />
            <span>
              Text layer and image layer are exported separately — font, size, color, and position stay editable without altering the artwork.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('step-2-design')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Design</span>
          </button>
          <button
            type="button"
            onClick={handleConfirmAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#B88B58] hover:bg-[#A27644] rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm All Designs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3-Zone Workspace: Gallery Strip + Draggable 9:16 Canvas + Side Inspector */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 9:16 Scene Gallery */}
        <section className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Scenes ({scenes.length})
            </h2>
            <span className="text-[11px] text-stone-400">9:16 Portrait</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
            {scenes.map((sc) => {
              const isSelected = sc.id === activeScene.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedSceneId(sc.id)}
                  className={`group rounded-2xl border p-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#B88B58] bg-[#FAF6EE] ring-2 ring-[#B88B58]/20'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="pointer-events-none">
                    <PhoneFrame scene={sc} compact className="rounded-[14px]" />
                  </div>
                  <div className="mt-2 px-1 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-stone-800 truncate">
                      {sc.order}. {sc.title}
                    </span>
                    {sc.confirmed && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Center: Interactive 9:16 Canvas with Draggable Text Block */}
        <section className="lg:col-span-4 flex flex-col items-center">
          <div className="w-full max-w-[330px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-stone-700">
                <Move className="w-3.5 h-3.5 text-[#B88B58]" />
                <span>Drag text block on canvas</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateSceneTextLayer(activeScene.id, (layer) => ({
                    ...layer,
                    xOffset: 0,
                    yOffset: 0,
                  }))
                }
                className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Center</span>
              </button>
            </div>

            <div className="relative">
              <PhoneFrame
                scene={activeScene}
                draggableText
                showSafeFrameHint
                onTextPositionChange={(xOffset, yOffset) =>
                  updateSceneTextLayer(activeScene.id, (layer) => ({
                    ...layer,
                    xOffset,
                    yOffset,
                  }))
                }
              />

              {(isRegenerating || isEditingImage) && (
                <div className="absolute inset-0 z-40 rounded-[26px] bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6">
                  <Loader2 className="w-7 h-7 text-[#B88B58] animate-spin mb-2" />
                  <p className="text-sm font-medium text-stone-900">
                    {isRegenerating
                      ? 'Regenerating background plate...'
                      : 'Applying edit instruction...'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Your text layer stays preserved
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 tabular-nums px-1">
              <span>
                Offset: X {activeScene.textLayer.xOffset}% · Y {activeScene.textLayer.yOffset}%
              </span>
              <span>Layer: Text + Artwork (Separate)</span>
            </div>
          </div>
        </section>

        {/* Right: Side Inspector Panel */}
        <section className="lg:col-span-5 space-y-6">
          {/* Text Layer Controls */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Text Layer — Scene {activeScene.order}
              </h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#8F6534] hover:text-[#704C22] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </div>

            {/* Editable Lines */}
            <div className="space-y-2.5">
              {activeScene.textLayer.lines.map((line) => (
                <div key={line.id} className="flex items-center gap-2">
                  <span className="w-16 text-[10px] uppercase tracking-wider font-medium text-stone-400 shrink-0">
                    {line.role}
                  </span>
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => handleUpdateLine(line.id, e.target.value)}
                    onBlur={() => patchScene(activeScene, { text_layer: activeScene.textLayer }).catch(console.error)}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[#B88B58]"
                  />
                  {activeScene.textLayer.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLine(line.id)}
                      aria-label="Remove line"
                      className="p-1.5 text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Fonts & Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-100">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Heading Font
                </label>
                <select
                  value={activeScene.textLayer.headingFont}
                  onChange={(e) =>
                    updateSceneTextLayer(activeScene.id, (l) => ({
                      ...l,
                      headingFont: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white text-stone-900"
                >
                  {GOOGLE_FONT_OPTIONS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Body Font
                </label>
                <select
                  value={activeScene.textLayer.bodyFont}
                  onChange={(e) =>
                    updateSceneTextLayer(activeScene.id, (l) => ({
                      ...l,
                      bodyFont: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white text-stone-900"
                >
                  {GOOGLE_FONT_OPTIONS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Size & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-stone-600">
                    Text Scale
                  </label>
                  <span className="text-[11px] font-semibold text-stone-800 tabular-nums">
                    {activeScene.textLayer.fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={32}
                  value={activeScene.textLayer.fontSize}
                  onChange={(e) =>
                    updateSceneTextLayer(activeScene.id, (l) => ({
                      ...l,
                      fontSize: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#B88B58] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1.5">
                  Text Color
                </label>
                <div className="flex items-center gap-1.5">
                  {TEXT_COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() =>
                        updateSceneTextLayer(activeScene.id, (l) => ({ ...l, color: hex }))
                      }
                      style={{ backgroundColor: hex }}
                      aria-label={`Color ${hex}`}
                      className={`w-6 h-6 rounded-full border cursor-pointer ${
                        activeScene.textLayer.color.toUpperCase() === hex.toUpperCase()
                          ? 'ring-2 ring-[#B88B58] ring-offset-1 border-stone-400'
                          : 'border-stone-300'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={activeScene.textLayer.color}
                    onChange={(e) =>
                      updateSceneTextLayer(activeScene.id, (l) => ({
                        ...l,
                        color: e.target.value,
                      }))
                    }
                    aria-label="Custom text color"
                    className="w-6 h-6 rounded-full border border-stone-200 cursor-pointer p-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Placement & Alignment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Vertical Anchor
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-lg">
                  {(['top', 'center', 'bottom'] as TextPlacement[]).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() =>
                        updateSceneTextLayer(activeScene.id, (l) => ({ ...l, placement: pos }))
                      }
                      className={`py-1 text-[11px] font-medium capitalize rounded-md cursor-pointer ${
                        activeScene.textLayer.placement === pos
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Alignment
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-lg">
                  {[
                    { val: 'left' as TextAlignment, icon: <AlignLeft className="w-3.5 h-3.5" /> },
                    { val: 'center' as TextAlignment, icon: <AlignCenter className="w-3.5 h-3.5" /> },
                    { val: 'right' as TextAlignment, icon: <AlignRight className="w-3.5 h-3.5" /> },
                  ].map((al) => (
                    <button
                      key={al.val}
                      type="button"
                      onClick={() =>
                        updateSceneTextLayer(activeScene.id, (l) => ({
                          ...l,
                          alignment: al.val,
                        }))
                      }
                      className={`py-1.5 rounded-md flex items-center justify-center cursor-pointer ${
                        activeScene.textLayer.alignment === al.val
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600'
                      }`}
                    >
                      {al.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Background Image Layer Controls */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Background Image Layer
            </h2>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Editable Image Prompt
              </label>
              <textarea
                rows={3}
                value={activeScene.imagePrompt}
                onChange={(e) =>
                  updateScene(activeScene.id, (sc) => ({
                    ...sc,
                    imagePrompt: e.target.value,
                  }))
                }
                onBlur={(e) =>
                  patchScene(activeScene, { image_prompt: e.target.value }).catch(console.error)
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-[#FAF9F6] text-stone-800 focus:outline-none focus:border-[#B88B58]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={regenLimitReached || isImageBusy}
                onClick={handleRegenerate}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-800 bg-[#FAF6EE] hover:bg-[#F2E9D7] border border-[#E3D3BA] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{regenLimitReached ? 'Regeneration used' : 'Regenerate image'}</span>
              </button>
              {regenLimitReached && (
                <span className="text-[11px] text-stone-500">
                  1 of 1 regeneration used for this card
                </span>
              )}
            </div>

            {imageError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {imageError}
              </p>
            )}

            <form
              onSubmit={handleEditWithInstruction}
              className="pt-3 border-t border-stone-100 space-y-2"
            >
              <label className="block text-xs font-medium text-stone-700">
                Edit image with instruction
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={regenLimitReached || isImageBusy}
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder={
                    regenLimitReached
                      ? 'Regeneration used for this card'
                      : 'e.g., Add warmer candlelight or softer floral framing'
                  }
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-[#B88B58] disabled:bg-stone-50 disabled:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={regenLimitReached || isImageBusy || !editInstruction.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{regenLimitReached ? 'Regeneration used' : 'Apply'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};
