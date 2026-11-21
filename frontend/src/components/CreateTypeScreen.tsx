import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Baby,
  Briefcase,
  Cake,
  Gem,
  Heart,
  Sparkles,
  Stars,
} from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { INVITATION_TYPES } from '../data/mockInvitations';
import { InvitationType } from '../types/invitation';

const TYPE_ICONS: Record<InvitationType, React.ReactNode> = {
  Wedding: <Heart className="w-5 h-5" />,
  Engagement: <Gem className="w-5 h-5" />,
  Birthday: <Cake className="w-5 h-5" />,
  'Baby Shower': <Baby className="w-5 h-5" />,
  Anniversary: <Stars className="w-5 h-5" />,
  Corporate: <Briefcase className="w-5 h-5" />,
  Other: <Sparkles className="w-5 h-5" />,
};

export const CreateTypeScreen: React.FC = () => {
  const { createDraftFromType, navigateTo } = useInvitations();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <div className="max-w-2xl mb-10">
        <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#A27644] mb-2">
          Step A · Occasion
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight [text-wrap:balance]">
          What are you celebrating?
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-stone-600 leading-relaxed">
          Select an invitation category so our scene designer tailors the phrasing, ceremonial pacing, and visual framing for your occasion.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {INVITATION_TYPES.map((item, idx) => (
          <motion.button
            key={item.type}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: idx * 0.03 }}
            onClick={() => createDraftFromType(item.type)}
            className="group text-left rounded-2xl border border-stone-200 bg-white p-6 hover:border-[#B88B58] hover:shadow-[0_10px_30px_rgba(184,139,88,0.10)] transition-all flex flex-col justify-between gap-6 cursor-pointer"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#FAF6EE] border border-[#E8DEC8] text-[#9A6F3D] flex items-center justify-center mb-4 group-hover:bg-[#B88B58] group-hover:text-white group-hover:border-[#B88B58] transition-colors">
                {TYPE_ICONS[item.type]}
              </div>
              <h2 className="font-serif text-xl font-semibold text-stone-900">
                {item.type}
              </h2>
              <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                {item.subtitle}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-500">
              <span>Example: {item.sampleTitle}</span>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#B88B58] group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-stone-200/80 flex justify-start">
        <button
          type="button"
          onClick={() => navigateTo('dashboard')}
          className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          ← Back to Dashboard
        </button>
      </div>
    </main>
  );
};
