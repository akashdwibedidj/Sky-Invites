import React, { useEffect, useRef, useState } from 'react';

interface FlowingPeacockProps {
  src: string;
  width: string;
  offsetX: string;
  offsetY: string;
  scale: number;
  flipHorizontal?: boolean;
  className?: string;
}

const VERTEX_SHADER_SOURCE = `
  attribute vec2 aPosition;
  varying vec2 vTexCoord;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTexCoord = vec2((aPosition.x + 1.0) * 0.5, (1.0 - aPosition.y) * 0.5);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform float uTime;
  varying vec2 vTexCoord;

  void main() {
    vec2 uv = vTexCoord;

    // Anchor head, face, eye (0.3226, 0.5243), neck, and upper chest at zero motion
    float headDist = length((uv - vec2(0.315, 0.55)) / vec2(0.075, 0.11));
    float chestDist = length((uv - vec2(0.325, 0.72)) / vec2(0.085, 0.14));
    float headLock = smoothstep(0.65, 1.35, headDist);
    float chestLock = smoothstep(0.55, 1.30, chestDist);
    float anchorMask = headLock * chestLock;

    // Flowing tail fan on the right, peaking gently in upper golden plumes
    float tailBase = smoothstep(0.36, 0.76, uv.x);
    float upperPlumeBoost = 0.55 + 0.55 * smoothstep(0.76, 0.14, uv.y);
    float tailWeight = tailBase * upperPlumeBoost;

    // Delicate botanical leaves & swirls on the lower-left
    float leftWeight = smoothstep(0.28, 0.05, uv.x) * smoothstep(0.42, 0.76, uv.y);

    // Subtle whisper of breeze at the peacock crown crest tips
    vec2 crestDelta = (uv - vec2(0.295, 0.435)) / vec2(0.065, 0.045);
    float crestWeight = 0.25 * exp(-dot(crestDelta, crestDelta));

    float flowWeight = clamp(anchorMask * (tailWeight + leftWeight * 0.8 + crestWeight), 0.0, 1.15);

    // Softly taper displacement right at the PNG borders so feather tips never clip
    float edgeGuardX = smoothstep(0.005, 0.04, uv.x) * smoothstep(0.996, 0.94, uv.x);
    float edgeGuardY = smoothstep(0.005, 0.045, uv.y) * smoothstep(0.996, 0.955, uv.y);

    // Multi-layered traveling silk breeze waves
    float wavePrimary = sin(uv.x * 5.2 - uv.y * 4.0 - uTime * 1.15);
    float waveSecondary = sin(uv.x * 11.4 - uv.y * 8.4 - uTime * 1.85) * 0.35;
    float waveCross = cos(uv.y * 6.4 + uv.x * 3.1 - uTime * 0.9) * 0.45;

    vec2 displacement = vec2(
      (wavePrimary * 0.0062 + waveSecondary * 0.0022) * edgeGuardX,
      (waveCross * 0.0072 + wavePrimary * 0.0036 + waveSecondary * 0.0024) * edgeGuardY
    ) * flowWeight;

    vec2 sampleUv = clamp(uv - displacement, vec2(0.0), vec2(1.0));
    gl_FragColor = texture2D(uTexture, sampleUv);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function FlowingPeacock({
  src,
  width,
  offsetX,
  offsetY,
  scale,
  flipHorizontal = false,
  className = '',
}: FlowingPeacockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uTexture = gl.getUniformLocation(program, 'uTexture');

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let cancelled = false;
    let rafId = 0;
    let isVisible = true;
    const startTime = performance.now();

    const image = new Image();
    if (src.startsWith('http')) {
      image.crossOrigin = 'anonymous';
    }
    image.src = src;

    const drawCurrentFrame = (now: number) => {
      const elapsedSeconds = (now - startTime) * 0.001;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTexture, 0);
      gl.uniform1f(uTime, elapsedSeconds);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const renderFrame = (now: number) => {
      if (cancelled) return;
      if (isVisible && !document.hidden) {
        drawCurrentFrame(now);
      }
      rafId = window.requestAnimationFrame(renderFrame);
    };

    image.onload = () => {
      if (cancelled) return;
      canvas.width = image.naturalWidth || 1694;
      canvas.height = image.naturalHeight || 1132;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      drawCurrentFrame(performance.now());
      setWebglReady(true);
      rafId = window.requestAnimationFrame(renderFrame);
    };

    const observer =
      typeof IntersectionObserver !== 'undefined' && containerRef.current
        ? new IntersectionObserver(
            (entries) => {
              isVisible = entries[0]?.isIntersecting ?? true;
            },
            { rootMargin: '120px' },
          )
        : null;

    if (observer && containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        maxWidth: '90vw',
        transform: `translate(${offsetX}, ${offsetY}) scale(${scale})${
          flipHorizontal ? ' scaleX(-1)' : ''
        }`,
      }}
      className={`relative shrink-0 ${className}`}
    >
      {/* Fallback / layout-sizing base image */}
      <img
        src={src}
        alt=""
        className={`block h-auto w-full object-contain drop-shadow-[0_14px_26px_rgba(8,38,40,0.16)] ${
          webglReady ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* GPU silk-breeze flowing feathers canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_14px_26px_rgba(8,38,40,0.16)] ${
          webglReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Pixel-locked blinking eyelid SVG aligned to the anchored head */}
      <svg
        viewBox="0 0 1694 1132"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="peacock-eye-clip">
            <ellipse cx="546.5" cy="593.5" rx="9.8" ry="7.4" />
          </clipPath>
          <linearGradient id="peacock-lid-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EFECE7" />
            <stop offset="72%" stopColor="#E7E2DC" />
            <stop offset="100%" stopColor="#D7D0C8" />
          </linearGradient>
        </defs>
        <g clipPath="url(#peacock-eye-clip)">
          <g className="animate-peacock-lid-upper">
            <path
              d="M 535 582 L 559 582 L 559 594.8 Q 546.5 598.2 535 594.5 Z"
              fill="url(#peacock-lid-grad)"
            />
            <path
              d="M 535.5 594.5 Q 546.5 598.2 558.5 594.8"
              fill="none"
              stroke="#0A2736"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </g>
          <g className="animate-peacock-lid-lower">
            <path
              d="M 535 594.5 Q 546.5 598.2 559 594.8 L 559 603 L 535 603 Z"
              fill="#EBE6E0"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
