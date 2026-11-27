import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export function SkyBackdrop() {
  const { scrollYProgress } = useScroll();

  // Scroll-linked parallax offsets for realistic multi-depth cloud movement
  const sunY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const cloudBackX = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const cloudBackY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const cloudMidX = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const cloudMidY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const cloudFrontX = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const cloudFrontY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const cloudLowX = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const cloudLowY = useTransform(scrollYProgress, [0, 1], [0, -90]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Realistic Golden-Hour Sunset Sky Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #AEC2D1 0%, #CBD5DA 18%, #EADBC8 42%, #F6DFBC 68%, #FBEBD0 86%, #FDF4E4 100%)',
        }}
      />

      {/* Warm horizon golden atmospheric bloom */}
      <div
        className="absolute inset-x-0 top-[8%] h-[68vh] opacity-85"
        style={{
          background:
            'radial-gradient(ellipse 68% 54% at 62% 28%, rgba(255, 224, 152, 0.72) 0%, rgba(249, 198, 126, 0.34) 45%, rgba(249, 198, 126, 0) 78%)',
        }}
      />

      {/* Realistic Glowing Sun */}
      <motion.div
        style={{ y: sunY }}
        className="absolute top-[7%] right-[12%] sm:top-[8%] sm:right-[20%] lg:right-[23%]"
      >
        {/* Outer atmospheric corona */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.78, 0.96, 0.78] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72"
        >
          <div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 232, 165, 0.9) 0%, rgba(247, 194, 108, 0.45) 42%, rgba(247, 194, 108, 0) 72%)',
            }}
          />
          {/* Inner warm halo */}
          <div
            className="absolute h-32 w-32 rounded-full blur-md sm:h-40 sm:w-40"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 250, 230, 0.98) 0%, rgba(255, 222, 145, 0.75) 55%, rgba(255, 200, 105, 0) 85%)',
            }}
          />
          {/* Radiant solar core */}
          <div
            className="relative h-16 w-16 rounded-full sm:h-20 sm:w-20"
            style={{
              background:
                'radial-gradient(circle, #FFFFFF 0%, #FFF7DB 52%, #FAD382 100%)',
              boxShadow: '0 0 65px 22px rgba(255, 218, 130, 0.7)',
            }}
          />
        </motion.div>
      </motion.div>

      {/* Cloud Layer 1: High distant wispy cirrus (slow drift + scroll parallax) */}
      <motion.div
        style={{ x: cloudBackX, y: cloudBackY }}
        className="absolute -top-6 left-[-8%] w-[95vw] max-w-[900px] opacity-65 sm:left-[4%]"
      >
        <motion.img
          src="/assets/clouds/cloud_wispy.png"
          alt=""
          animate={{ x: [0, 38, 0] }}
          transition={{ duration: 48, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full object-contain"
        />
      </motion.div>

      {/* Cloud Layer 2: Sun-kissed cumulus passing near the glowing sun */}
      <motion.div
        style={{ x: cloudMidX, y: cloudMidY }}
        className="absolute top-[14%] right-[-10%] w-[78vw] max-w-[660px] opacity-85 sm:right-[4%]"
      >
        <motion.img
          src="/assets/clouds/cloud_cumulus.png"
          alt=""
          animate={{ x: [0, -45, 0] }}
          transition={{ duration: 42, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full object-contain"
        />
      </motion.div>

      {/* Cloud Layer 3: Mid-left fluffy cumulus drifting gently */}
      <motion.div
        style={{ x: cloudFrontX, y: cloudFrontY }}
        className="absolute top-[30%] left-[-14%] w-[80vw] max-w-[680px] opacity-80 sm:left-[-4%]"
      >
        <motion.img
          src="/assets/clouds/cloud_cumulus.png"
          alt=""
          animate={{ x: [0, 52, 0] }}
          transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full -scale-x-100 object-contain"
        />
      </motion.div>

      {/* Cloud Layer 4: Lower horizon wispy amber cloud bank */}
      <motion.div
        style={{ x: cloudLowX, y: cloudLowY }}
        className="absolute bottom-[6%] left-[12%] w-[100vw] max-w-[1050px] opacity-70"
      >
        <motion.img
          src="/assets/clouds/cloud_wispy.png"
          alt=""
          animate={{ x: [0, -34, 0] }}
          transition={{ duration: 54, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full -scale-x-100 object-contain"
        />
      </motion.div>

      {/* Cloud Layer 5: Lower right soft cumulus depth */}
      <motion.div
        style={{ x: cloudBackX, y: cloudLowY }}
        className="hidden sm:block absolute bottom-[-4%] right-[-8%] w-[58vw] max-w-[620px] opacity-65"
      >
        <motion.img
          src="/assets/clouds/cloud_cumulus.png"
          alt=""
          animate={{ x: [0, 28, 0] }}
          transition={{ duration: 46, repeat: Infinity, ease: 'easeInOut' }}
          className="h-auto w-full object-contain"
        />
      </motion.div>
    </div>
  );
}
