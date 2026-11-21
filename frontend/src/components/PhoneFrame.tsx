import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import {
  CameraMovement,
  FallingEffect,
  Scene,
  TextAnimation,
  TextLine,
} from '../types/invitation';
import { FallingEffectsOverlay } from './FallingEffectsOverlay';

interface PhoneFrameProps {
  scene: Scene;
  fallingEffects?: FallingEffect[];
  fallingIntensity?: number;
  isPlaying?: boolean;
  animateMotion?: boolean;
  animateText?: boolean;
  draggableText?: boolean;
  onTextPositionChange?: (xOffset: number, yOffset: number) => void;
  playbackTrigger?: number;
  className?: string;
  compact?: boolean;
  showSafeFrameHint?: boolean;
}

const TypewriterLine: React.FC<{
  text: string;
  delayMs: number;
  active: boolean;
}> = ({ text, delayMs, active }) => {
  const [visibleChars, setVisibleChars] = useState(active ? 0 : text.length);

  useEffect(() => {
    if (!active) {
      setVisibleChars(text.length);
      return;
    }
    setVisibleChars(0);
    let intervalId: number | undefined;
    const startTimer = window.setTimeout(() => {
      let idx = 0;
      intervalId = window.setInterval(() => {
        idx += 1;
        setVisibleChars(idx);
        if (idx >= text.length && intervalId) {
          window.clearInterval(intervalId);
        }
      }, 28);
    }, delayMs);

    return () => {
      window.clearTimeout(startTimer);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [text, delayMs, active]);

  return <span>{text.slice(0, visibleChars)}</span>;
};

const AnimatedTextLine: React.FC<{
  line: TextLine;
  index: number;
  animation: TextAnimation;
  sequentialDelayMs: number;
  animateText: boolean;
  headingFont: string;
  bodyFont: string;
  baseFontSize: number;
  color: string;
  compact?: boolean;
}> = ({
  line,
  index,
  animation,
  sequentialDelayMs,
  animateText,
  headingFont,
  bodyFont,
  baseFontSize,
  color,
  compact,
}) => {
  const scale = compact ? 0.56 : 1;
  const delaySec = (index * sequentialDelayMs) / 1000;

  const getLineStyle = (): React.CSSProperties => {
    if (line.role === 'kicker') {
      return {
        fontFamily: `"${bodyFont}", sans-serif`,
        fontSize: `${Math.max(8, Math.round(baseFontSize * 0.44 * scale))}px`,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        opacity: 0.78,
        color,
      };
    }
    if (line.role === 'heading') {
      return {
        fontFamily: `"${headingFont}", serif`,
        fontSize: `${Math.max(13, Math.round(baseFontSize * 1.18 * scale))}px`,
        lineHeight: 1.16,
        fontWeight: 600,
        color,
      };
    }
    if (line.role === 'subheading') {
      return {
        fontFamily: `"${bodyFont}", serif`,
        fontSize: `${Math.max(10, Math.round(baseFontSize * 0.66 * scale))}px`,
        lineHeight: 1.38,
        fontStyle: 'italic',
        opacity: 0.92,
        color,
      };
    }
    if (line.role === 'footer') {
      return {
        fontFamily: `"${bodyFont}", sans-serif`,
        fontSize: `${Math.max(8, Math.round(baseFontSize * 0.48 * scale))}px`,
        letterSpacing: '0.06em',
        opacity: 0.8,
        color,
      };
    }
    return {
      fontFamily: `"${bodyFont}", sans-serif`,
      fontSize: `${Math.max(9, Math.round(baseFontSize * 0.56 * scale))}px`,
      lineHeight: 1.4,
      opacity: 0.9,
      color,
    };
  };

  if (!animateText) {
    return <div style={getLineStyle()}>{line.text}</div>;
  }

  if (animation === 'Typewriter') {
    return (
      <div style={getLineStyle()}>
        <TypewriterLine
          text={line.text}
          delayMs={index * sequentialDelayMs}
          active={animateText}
        />
      </div>
    );
  }

  if (animation === 'Word-by-word') {
    const words = line.text.split(' ');
    return (
      <div style={getLineStyle()} className="flex flex-wrap justify-center gap-x-[0.28em]">
        {words.map((word, wIdx) => (
          <motion.span
            key={`${line.id}-w-${wIdx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.32,
              delay: delaySec + wIdx * 0.09,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        ))}
      </div>
    );
  }

  if (animation === 'Slide-up') {
    return (
      <motion.div
        style={getLineStyle()}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.52,
          delay: delaySec,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {line.text}
      </motion.div>
    );
  }

  // Default Fade-in
  return (
    <motion.div
      style={getLineStyle()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, delay: delaySec }}
    >
      {line.text}
    </motion.div>
  );
};

function getCameraMotionProps(movement: CameraMovement, active: boolean) {
  if (!active || movement === 'Static') {
    return {
      animate: { scale: 1, x: 0, y: 0 },
      transition: { duration: 0.4 },
    };
  }
  if (movement === 'Slow zoom in') {
    return {
      initial: { scale: 1, x: 0, y: 0 },
      animate: { scale: 1.09, x: 0, y: -4 },
      transition: { duration: 6, repeat: Infinity, repeatType: 'reverse' as const, ease: 'easeInOut' as const },
    };
  }
  if (movement === 'Pan left/right') {
    return {
      initial: { scale: 1.07, x: -10 },
      animate: { scale: 1.07, x: 10 },
      transition: { duration: 6.5, repeat: Infinity, repeatType: 'reverse' as const, ease: 'easeInOut' as const },
    };
  }
  // Parallax
  return {
    initial: { scale: 1.06, x: -5, y: 5 },
    animate: { scale: 1.09, x: 5, y: -5 },
    transition: { duration: 5.5, repeat: Infinity, repeatType: 'reverse' as const, ease: 'easeInOut' as const },
  };
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  scene,
  fallingEffects = [],
  fallingIntensity = 50,
  isPlaying = false,
  animateMotion = false,
  animateText = false,
  draggableText = false,
  onTextPositionChange,
  playbackTrigger = 0,
  className = '',
  compact = false,
  showSafeFrameHint = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startXOffset: number;
    startYOffset: number;
  } | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [scene.imageUrl]);

  const { textLayer } = scene;
  const placementClass =
    textLayer.placement === 'top'
      ? 'justify-start pt-10'
      : textLayer.placement === 'bottom'
        ? 'justify-end pb-10'
        : 'justify-center';

  const alignClass =
    textLayer.alignment === 'left'
      ? 'items-start text-left'
      : textLayer.alignment === 'right'
        ? 'items-end text-right'
        : 'items-center text-center';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!draggableText || !onTextPositionChange) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startXOffset: textLayer.xOffset,
      startYOffset: textLayer.yOffset,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current || !onTextPositionChange) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragStartRef.current.pointerX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragStartRef.current.pointerY) / rect.height) * 100;
    const nextX = Math.max(-32, Math.min(32, Math.round(dragStartRef.current.startXOffset + dxPct)));
    const nextY = Math.max(-36, Math.min(36, Math.round(dragStartRef.current.startYOffset + dyPct)));
    onTextPositionChange(nextX, nextY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const motionProps = getCameraMotionProps(
    scene.animationPlan.cameraMovement,
    isPlaying || animateMotion
  );

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[9/16] w-full overflow-hidden rounded-[26px] border border-stone-200/90 bg-[#FAF7F2] shadow-[0_14px_40px_rgba(28,25,23,0.08)] select-none ${className}`}
    >
      {/* Layer 1: Background Image / Video Layer */}
      <motion.div
        key={`bg-${scene.id}-${scene.imageUrl}`}
        {...motionProps}
        className="absolute inset-0 w-full h-full"
      >
        {!imgError && scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={scene.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#FAF7F2] via-[#F2E9DA] to-[#E8DAC3] flex flex-col items-center justify-center p-6 text-center">
            <Sparkles className="w-6 h-6 text-[#B88B58]/60 mb-2" />
            <span className="text-xs text-stone-500 font-medium">{scene.title}</span>
          </div>
        )}
      </motion.div>

      {/* Subtle legibility vignette for dark scenes */}
      {textLayer.color.toUpperCase() === '#FAF6EE' && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/30"
          aria-hidden="true"
        />
      )}

      {/* Optional 9:16 safe area guide in editor */}
      {showSafeFrameHint && (
        <div
          className="pointer-events-none absolute inset-4 rounded-2xl border border-dashed border-stone-400/35 z-10"
          aria-hidden="true"
        />
      )}

      {/* Layer 2: Falling Effects Overlay */}
      <FallingEffectsOverlay
        effects={fallingEffects}
        intensity={fallingIntensity}
        compact={compact}
      />

      {/* Layer 3: Independent Editable Text Overlay Layer */}
      <div
        className={`absolute inset-0 z-30 flex flex-col ${placementClass} px-5 pointer-events-none`}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translate(${textLayer.xOffset}%, ${textLayer.yOffset}%)`,
          }}
          className={`flex flex-col ${alignClass} gap-1.5 w-full transition-shadow ${
            draggableText
              ? `pointer-events-auto cursor-grab active:cursor-grabbing rounded-xl p-3 border ${
                  isDragging
                    ? 'border-[#B88B58] bg-white/45 backdrop-blur-[2px] shadow-md'
                    : 'border-dashed border-[#B88B58]/55 hover:border-[#B88B58] hover:bg-white/25'
                }`
              : ''
          }`}
        >
          {textLayer.lines.map((line, index) => (
            <AnimatedTextLine
              key={`${line.id}-${playbackTrigger}`}
              line={line}
              index={index}
              animation={textLayer.animation}
              sequentialDelayMs={textLayer.sequentialDelayMs}
              animateText={animateText}
              headingFont={textLayer.headingFont}
              bodyFont={textLayer.bodyFont}
              baseFontSize={textLayer.fontSize}
              color={textLayer.color}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
