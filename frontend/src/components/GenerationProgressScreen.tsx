import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, CircleDashed, Loader2, Sparkles } from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { createScenes, generateImages } from '../services/api';
import { AgentPipelineNode, Scene } from '../types/invitation';

const INITIAL_NODES: AgentPipelineNode[] = [
  {
    id: 'scene-splitter',
    label: 'Scene Splitter',
    role: 'Narrative Architect',
    status: 'waiting',
    log: 'Queued to structure event chapters...',
  },
  {
    id: 'invitation-designer',
    label: 'Invitation Designer',
    role: 'Visual Director',
    status: 'waiting',
    log: 'Awaiting chapter breakdown...',
    parallelGroup: true,
  },
  {
    id: 'audience-intent',
    label: 'Audience-Intent Specialist',
    role: 'Tone & Etiquette',
    status: 'waiting',
    log: 'Awaiting chapter breakdown...',
    parallelGroup: true,
  },
  {
    id: 'font-specialist',
    label: 'Font Specialist',
    role: 'Typography Pairing',
    status: 'waiting',
    log: 'Awaiting chapter breakdown...',
    parallelGroup: true,
  },
  {
    id: 'prompt-builder',
    label: 'Prompt Builder',
    role: '9:16 Safe-Zone Framing',
    status: 'waiting',
    log: 'Preparing portrait art prompts...',
  },
  {
    id: 'image-generator',
    label: 'Image Generator',
    role: '9:16 Background Renderer',
    status: 'waiting',
    log: 'Ready to synthesize clean background plates...',
  },
];

const NodeStatusIcon: React.FC<{ status: AgentPipelineNode['status'] }> = ({ status }) => {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
  if (status === 'running')
    return <Loader2 className="w-4 h-4 text-[#B88B58] animate-spin shrink-0" />;
  return <CircleDashed className="w-4 h-4 text-stone-300 shrink-0" />;
};

export const GenerationProgressScreen: React.FC = () => {
  const { activeInvitation, setActiveScenes, updateActiveStatus, navigateTo } = useInvitations();
  const [nodes, setNodes] = useState<AgentPipelineNode[]>(INITIAL_NODES);
  const [sceneChips, setSceneChips] = useState<Scene[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const hasStartedRef = useRef(false);

  const updateNode = (
    id: string,
    status: AgentPipelineNode['status'],
    log: string
  ) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status, log } : n))
    );
  };

  useEffect(() => {
    if (!activeInvitation || hasStartedRef.current) return;
    hasStartedRef.current = true;

    let cancelled = false;

    const runPipeline = async () => {
      updateActiveStatus('Generating');

      // Stage 1: Scene Splitter
      updateNode(
        'scene-splitter',
        'running',
        `Dividing ${activeInvitation.details.events.length || 1} events into ${activeInvitation.design.sceneCount} portrait scenes...`
      );
      const generatedScenes = await createScenes(activeInvitation);
      if (cancelled) return;
      setSceneChips(generatedScenes);
      updateNode(
        'scene-splitter',
        'done',
        `Structured ${generatedScenes.length} scenes with separate text layers.`
      );

      // Stage 2: Parallel Specialists
      updateNode(
        'invitation-designer',
        'running',
        `Applying ${activeInvitation.design.theme} motif & ${activeInvitation.design.palette.name} palette...`
      );
      updateNode(
        'audience-intent',
        'running',
        `Calibrating ${activeInvitation.type.toLowerCase()} tone & formal phrasing...`
      );
      updateNode(
        'font-specialist',
        'running',
        `Pairing ${activeInvitation.design.headingFont} + ${activeInvitation.design.bodyFont}...`
      );

      await new Promise((r) => setTimeout(r, 950));
      if (cancelled) return;

      updateNode(
        'invitation-designer',
        'done',
        `${activeInvitation.design.theme} stationery layout locked.`
      );
      updateNode(
        'audience-intent',
        'done',
        `Etiquette & event sequence verified.`
      );
      updateNode(
        'font-specialist',
        'done',
        `Text safe-zones calibrated for ${activeInvitation.design.textPlacement} alignment.`
      );

      // Stage 3: Prompt Builder
      updateNode(
        'prompt-builder',
        'running',
        `Compiling ${generatedScenes.length} text-free 9:16 art prompts...`
      );
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      updateNode(
        'prompt-builder',
        'done',
        `All ${generatedScenes.length} background prompts prepared.`
      );

      // Stage 4: Image Generator
      updateNode(
        'image-generator',
        'running',
        activeInvitation.design.storyDriven
          ? 'Generating scenes one after another (story-driven)...'
          : 'Generating all scenes simultaneously in parallel...'
      );

      const completedScenes = await generateImages(
        generatedScenes,
        activeInvitation.design.storyDriven,
        (sceneId, status) => {
          if (cancelled) return;
          setSceneChips((prev) =>
            prev.map((sc) => (sc.id === sceneId ? { ...sc, imageStatus: status } : sc))
          );
        }
      );

      if (cancelled) return;
      updateNode(
        'image-generator',
        'done',
        `All ${completedScenes.length} 9:16 backgrounds ready for layer review.`
      );

      setActiveScenes(completedScenes, 'Draft');
      setIsFinished(true);

      await new Promise((r) => setTimeout(r, 650));
      if (!cancelled) {
        navigateTo('step-3-review');
      }
    };

    runPipeline();

    return () => {
      cancelled = true;
    };
  }, [activeInvitation, navigateTo, setActiveScenes, updateActiveStatus]);

  if (!activeInvitation) {
    return null;
  }

  const splitterNode = nodes.find((n) => n.id === 'scene-splitter')!;
  const parallelNodes = nodes.filter((n) => n.parallelGroup);
  const promptNode = nodes.find((n) => n.id === 'prompt-builder')!;
  const generatorNode = nodes.find((n) => n.id === 'image-generator')!;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#E5D5BA] text-xs font-medium text-[#8F6534] mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multi-Agent Invitation Studio</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight">
          Composing {activeInvitation.title}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Generating clean 9:16 artwork backgrounds and separate editable typography layers.
        </p>
      </div>

      {/* Pipeline Visualization */}
      <div className="space-y-4">
        {/* Node 1: Scene Splitter */}
        <PipelineCard node={splitterNode} />

        <div className="flex justify-center">
          <div className="h-5 w-px bg-stone-200" />
        </div>

        {/* Nodes 2-4: Parallel Specialists */}
        <div className="rounded-2xl border border-stone-200/80 bg-[#FAF9F6] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-700">
              Parallel Specialist Agents
            </span>
            <span className="text-[11px] text-stone-500">Running concurrently</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {parallelNodes.map((node) => (
              <PipelineCard key={node.id} node={node} compact />
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="h-5 w-px bg-stone-200" />
        </div>

        {/* Node 5: Prompt Builder */}
        <PipelineCard node={promptNode} />

        <div className="flex justify-center">
          <div className="h-5 w-px bg-stone-200" />
        </div>

        {/* Node 6: Image Generator + Per-scene chips */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <NodeStatusIcon status={generatorNode.status} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-stone-900">
                    {generatorNode.label}
                  </h2>
                  <span className="text-xs text-stone-400">·</span>
                  <span className="text-xs text-stone-500">{generatorNode.role}</span>
                </div>
                <p className="text-xs text-stone-600 mt-1">{generatorNode.log}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-stone-500 capitalize">
              {generatorNode.status}
            </span>
          </div>

          {/* Per-scene Progress Chips */}
          {sceneChips.length > 0 && (
            <div className="mt-5 pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-700">
                  Scene Plates ({activeInvitation.design.storyDriven ? 'Sequential Story Mode' : 'Parallel Batch'})
                </span>
                <span className="text-xs text-stone-500 tabular-nums">
                  {sceneChips.filter((s) => s.imageStatus === 'done').length} / {sceneChips.length} complete
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {sceneChips.map((sc) => (
                  <motion.div
                    key={sc.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs ${
                      sc.imageStatus === 'done'
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                        : sc.imageStatus === 'generating'
                          ? 'border-[#E3D3BA] bg-[#FAF6EE] text-[#8F6534]'
                          : 'border-stone-200 bg-stone-50 text-stone-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold tabular-nums shrink-0">
                        0{sc.order}
                      </span>
                      <span className="truncate">{sc.title}</span>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 font-medium">
                      {sc.imageStatus === 'done' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ready</span>
                        </>
                      ) : sc.imageStatus === 'generating' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Rendering</span>
                        </>
                      ) : (
                        <span>Waiting</span>
                      )}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isFinished && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigateTo('step-3-review')}
            className="px-6 py-3 rounded-xl bg-[#B88B58] hover:bg-[#A27644] text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
          >
            Continue to Image Review →
          </button>
        </div>
      )}
    </main>
  );
};

const PipelineCard: React.FC<{ node: AgentPipelineNode; compact?: boolean }> = ({
  node,
  compact = false,
}) => {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition-colors ${
        node.status === 'running'
          ? 'border-[#B88B58] shadow-[0_6px_20px_rgba(184,139,88,0.10)]'
          : node.status === 'done'
            ? 'border-stone-200'
            : 'border-stone-200/70 bg-stone-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5">
            <NodeStatusIcon status={node.status} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold text-stone-900">{node.label}</h3>
              {!compact && (
                <>
                  <span className="text-xs text-stone-400">·</span>
                  <span className="text-xs text-stone-500">{node.role}</span>
                </>
              )}
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">{node.log}</p>
          </div>
        </div>
        <span
          className={`text-[11px] font-medium capitalize shrink-0 ${
            node.status === 'done'
              ? 'text-emerald-700'
              : node.status === 'running'
                ? 'text-[#9A6F3D]'
                : 'text-stone-400'
          }`}
        >
          {node.status}
        </span>
      </div>
    </div>
  );
};
