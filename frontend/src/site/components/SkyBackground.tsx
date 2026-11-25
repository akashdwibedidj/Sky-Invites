import React from 'react';

export function SkyBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Realistic Daytime-to-Warm-Horizon Sky Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #7EB6DF 0%, #A9D3EE 28%, #D6EAF6 60%, #F4EEDF 84%, #FAF3E3 100%)',
        }}
      />

      {/* Atmospheric Horizon Sunlight Wash */}
      <div
        className="absolute inset-x-0 top-0 h-[72vh]"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 22% 12%, rgba(255, 236, 179, 0.62) 0%, rgba(255, 244, 212, 0.24) 45%, transparent 78%)',
        }}
      />

      {/* Glowing Sun with Corona Rays (Left Side) */}
      <div className="absolute top-[5%] left-[6%] sm:top-[6%] sm:left-[12%] lg:left-[14%]">
        <div className="relative flex h-44 w-44 items-center justify-center sm:h-60 sm:w-60">
          {/* Outer atmospheric bloom */}
          <div
            className="animate-sun-pulse absolute -inset-16 rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 232, 162, 0.72) 0%, rgba(255, 214, 122, 0.28) 45%, transparent 75%)',
            }}
          />

          {/* Soft rotating sunbeams */}
          <div
            className="animate-sun-rays absolute -inset-12 rounded-full opacity-35 blur-md"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(255,248,214,0.65) 18deg, transparent 36deg, transparent 72deg, rgba(255,244,198,0.5) 90deg, transparent 108deg, transparent 144deg, rgba(255,248,214,0.6) 162deg, transparent 180deg, transparent 216deg, rgba(255,244,198,0.5) 234deg, transparent 252deg, transparent 288deg, rgba(255,248,214,0.6) 306deg, transparent 324deg)',
            }}
          />

          {/* Inner bright halo */}
          <div
            className="animate-sun-pulse absolute h-28 w-28 rounded-full blur-lg sm:h-36 sm:w-36"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 252, 235, 0.95) 0%, rgba(255, 228, 150, 0.55) 60%, transparent 100%)',
            }}
          />

          {/* Radiant solar core */}
          <div
            className="relative h-16 w-16 rounded-full sm:h-20 sm:w-20"
            style={{
              background:
                'radial-gradient(circle at 45% 45%, #FFFFFF 0%, #FFF7D6 55%, #FFE08C 100%)',
              boxShadow:
                '0 0 42px 14px rgba(255, 234, 168, 0.85), 0 0 96px 36px rgba(255, 212, 118, 0.45)',
            }}
          />
        </div>
      </div>

      {/* Real Transparent PNG Clouds Drifting Across the Sky */}
      <img
        src="/assets/cloud-cumulus.png"
        alt=""
        className="animate-cloud-slow absolute top-[4%] left-0 w-[320px] opacity-90 sm:w-[480px] lg:w-[620px]"
        style={{ animationDelay: '-18s' }}
      />
      <img
        src="/assets/cloud-wispy.png"
        alt=""
        className="animate-cloud-mid absolute top-[14%] left-0 w-[340px] opacity-80 sm:w-[520px] lg:w-[660px]"
        style={{ animationDelay: '-48s' }}
      />
      <img
        src="/assets/cloud-cumulus.png"
        alt=""
        className="animate-cloud-gentle absolute top-[28%] left-0 w-[260px] opacity-75 sm:w-[400px] lg:w-[500px]"
        style={{ animationDelay: '-34s' }}
      />
      <img
        src="/assets/cloud-wispy.png"
        alt=""
        className="animate-cloud-slow absolute top-[52%] left-0 w-[300px] opacity-65 sm:w-[460px] lg:w-[580px]"
        style={{ animationDelay: '-66s' }}
      />
      <img
        src="/assets/cloud-cumulus.png"
        alt=""
        className="animate-cloud-mid absolute top-[72%] left-0 w-[280px] opacity-55 sm:w-[430px] lg:w-[540px]"
        style={{ animationDelay: '-10s' }}
      />
    </div>
  );
}
