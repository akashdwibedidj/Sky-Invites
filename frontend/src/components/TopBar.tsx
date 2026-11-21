import React from 'react';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { ScreenRoute } from '../types/invitation';

const WORKFLOW_STAGES: {
  step: number;
  label: string;
  screen: ScreenRoute;
}[] = [
  { step: 1, label: 'Details', screen: 'step-1-details' },
  { step: 2, label: 'Design', screen: 'step-2-design' },
  { step: 3, label: 'Image Review', screen: 'step-3-review' },
  { step: 4, label: 'Animation', screen: 'step-4-animation' },
  { step: 5, label: 'Compose', screen: 'step-5-compose' },
  { step: 6, label: 'Export', screen: 'step-6-export' },
];

function getActiveStepNumber(screen: ScreenRoute): number {
  switch (screen) {
    case 'create-type':
    case 'step-1-details':
      return 1;
    case 'step-2-design':
    case 'generating':
      return 2;
    case 'step-3-review':
      return 3;
    case 'step-4-animation':
      return 4;
    case 'step-5-compose':
      return 5;
    case 'step-6-export':
      return 6;
    default:
      return 0;
  }
}

export const TopBar: React.FC = () => {
  const { currentScreen, activeInvitation, navigateTo, startNewInvitationFlow } = useInvitations();
  const isWorkflow = currentScreen !== 'dashboard';
  const activeStep = getActiveStepNumber(currentScreen);
  const hasScenes = (activeInvitation?.scenes.length ?? 0) > 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => navigateTo('dashboard')}
          className="text-left font-serif text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0 hover:text-[#A27644] transition-colors cursor-pointer"
        >
          Sky Invites
        </button>

        {/* Zone 2: 6-Stage Stepper (shown in workflow) or quiet dashboard links */}
        {isWorkflow ? (
          <nav
            aria-label="Invitation creation stages"
            className="hidden lg:flex items-center gap-1.5 overflow-x-auto"
          >
            {WORKFLOW_STAGES.map((stage, idx) => {
              const isCurrent = activeStep === stage.step;
              const isCompleted = activeStep > stage.step;
              const isReachable =
                stage.step <= 2 ? Boolean(activeInvitation) : hasScenes;

              return (
                <React.Fragment key={stage.screen}>
                  <button
                    type="button"
                    disabled={!isReachable || currentScreen === 'generating'}
                    onClick={() => isReachable && navigateTo(stage.screen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-[#FAF6EE] text-[#8F6534] border border-[#E3D3BA]'
                        : isCompleted
                          ? 'text-stone-700 hover:bg-stone-100 cursor-pointer'
                          : isReachable
                            ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-50 cursor-pointer'
                            : 'text-stone-300 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums ${
                        isCurrent
                          ? 'bg-[#B88B58] text-white'
                          : isCompleted
                            ? 'bg-stone-800 text-white'
                            : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : stage.step}
                    </span>
                    <span>{stage.label}</span>
                  </button>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <span className="text-stone-300 text-xs select-none" aria-hidden="true">
                      →
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-6 text-sm text-stone-500">
            <span className="whitespace-nowrap shrink-0">9:16 Portrait Studio</span>
            <span aria-hidden="true" className="text-stone-300">
              ·
            </span>
            <span className="whitespace-nowrap shrink-0">1080 × 1920 Video Export</span>
          </div>
        )}

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {isWorkflow ? (
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startNewInvitationFlow}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#B88B58] hover:bg-[#A27644] rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Invitation</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile/tablet 6-stage stepper */}
      {isWorkflow && (
        <div className="lg:hidden border-t border-stone-100 bg-stone-50/70 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {WORKFLOW_STAGES.map((stage, idx) => {
              const isCurrent = activeStep === stage.step;
              const isReachable =
                stage.step <= 2 ? Boolean(activeInvitation) : hasScenes;
              return (
                <React.Fragment key={stage.screen}>
                  <button
                    type="button"
                    disabled={!isReachable || currentScreen === 'generating'}
                    onClick={() => isReachable && navigateTo(stage.screen)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? 'bg-[#B88B58] text-white'
                        : isReachable
                          ? 'text-stone-600 hover:bg-stone-200/60'
                          : 'text-stone-300'
                    }`}
                  >
                    {stage.step}. {stage.label}
                  </button>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <span className="text-stone-300 text-xs" aria-hidden="true">
                      /
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
