import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Film,
  FolderOpen,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useInvitations } from '../context/InvitationContext';
import { GENERATED_SCENE_IMAGES } from '../data/mockInvitations';
import { InvitationStatus } from '../types/invitation';
import { PhoneFrame } from './PhoneFrame';

const STATUS_FILTERS: ('All' | InvitationStatus)[] = ['All', 'Ready', 'Generating', 'Draft'];

const StatusBadge: React.FC<{ status: InvitationStatus }> = ({ status }) => {
  if (status === 'Ready') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Ready</span>
      </span>
    );
  }
  if (status === 'Generating') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap shrink-0">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Generating</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200 whitespace-nowrap shrink-0">
      <Clock className="w-3.5 h-3.5" />
      <span>Draft</span>
    </span>
  );
};

export const DashboardScreen: React.FC = () => {
  const {
    invitations,
    isLoadingDashboard,
    startNewInvitationFlow,
    openInvitation,
    deleteInvitation,
    restoreDemoInvitations,
  } = useInvitations();

  const [filter, setFilter] = useState<'All' | InvitationStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const matchesStatus = filter === 'All' || inv.status === filter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        inv.title.toLowerCase().includes(q) ||
        inv.type.toLowerCase().includes(q) ||
        inv.details.events.some((ev) => ev.venue.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [invitations, filter, searchQuery]);

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 sm:py-12">
      {/* Hero Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-200/80">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#A27644] mb-2">
            Portrait Video Stationery
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight [text-wrap:balance]">
            Your Invitation Studio
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-stone-600 leading-relaxed">
            Craft 1080 × 1920 vertical invitation films with layered calligraphy, bespoke scene artwork, and gentle cinematic motion.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewInvitationFlow}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-medium text-white bg-[#B88B58] hover:bg-[#A27644] rounded-2xl shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Invitation</span>
        </button>
      </section>

      {/* Toolbar: Segmented Filter & Search */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-6">
        <div className="inline-flex items-center gap-1 p-1 bg-stone-100/90 rounded-xl self-start">
          {STATUS_FILTERS.map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by couple, type, or venue..."
            aria-label="Search invitations"
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#B88B58] focus:ring-2 focus:ring-[#B88B58]/15"
          />
        </div>
      </section>

      {/* Loading Skeleton State */}
      {isLoadingDashboard ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((skeleton) => (
            <div
              key={skeleton}
              className="rounded-2xl border border-stone-200 bg-white p-4 animate-pulse"
            >
              <div className="aspect-[9/16] w-full rounded-xl bg-stone-100 mb-4" />
              <div className="h-5 w-3/4 bg-stone-100 rounded mb-2" />
              <div className="h-4 w-1/2 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredInvitations.length === 0 ? (
        /* Polished Empty State */
        <div className="rounded-2xl border border-dashed border-stone-300 bg-[#FAF9F6] py-16 px-6 text-center max-w-2xl mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <FolderOpen className="w-5 h-5 text-[#B88B58]" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-stone-900">
            {invitations.length === 0
              ? 'No invitations created yet'
              : 'No invitations match your filter'}
          </h2>
          <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto">
            {invitations.length === 0
              ? 'Begin with an occasion type, add your ceremony schedule, and generate a personalized 9:16 portrait video.'
              : 'Try clearing your search term or switching back to all invitation statuses.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={startNewInvitationFlow}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#B88B58] hover:bg-[#A27644] rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Invitation</span>
            </button>
            {invitations.length === 0 ? (
              <button
                type="button"
                onClick={restoreDemoInvitations}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Load Sample Invitations</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFilter('All');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
              >
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Invitations Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInvitations.map((inv, idx) => {
            const coverScene = inv.scenes[0];
            return (
              <motion.article
                key={inv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className="group rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_2px_12px_rgba(28,25,23,0.03)] hover:shadow-[0_10px_28px_rgba(28,25,23,0.07)] hover:border-stone-300 transition-all flex flex-col"
              >
                {/* 9:16 Thumbnail Preview */}
                <button
                  type="button"
                  onClick={() => openInvitation(inv.id)}
                  className="relative w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B88B58] rounded-[22px]"
                >
                  {coverScene ? (
                    <div className="max-w-[230px] mx-auto pointer-events-none">
                      <PhoneFrame
                        scene={coverScene}
                        compact
                        className="rounded-[20px] shadow-sm group-hover:scale-[1.01] transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="max-w-[230px] mx-auto aspect-[9/16] rounded-[20px] border border-stone-200 overflow-hidden bg-[#FAF7F2] relative flex flex-col items-center justify-center p-5 text-center">
                      <img
                        src={GENERATED_SCENE_IMAGES[0]}
                        alt={inv.title}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-55"
                      />
                      <div className="relative z-10 bg-white/85 backdrop-blur-xs px-4 py-3 rounded-xl border border-stone-200/80">
                        <Film className="w-4 h-4 text-[#B88B58] mx-auto mb-1" />
                        <p className="font-serif text-sm font-medium text-stone-900">
                          {inv.title}
                        </p>
                      </div>
                    </div>
                  )}
                </button>

                {/* Metadata & Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openInvitation(inv.id)}
                        className="font-serif text-lg font-semibold text-stone-900 hover:text-[#A27644] transition-colors text-left leading-snug cursor-pointer"
                      >
                        {inv.title}
                      </button>
                      <StatusBadge status={inv.status} />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500 tabular-nums">
                      <span>{inv.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {inv.details.events.length}{' '}
                        {inv.details.events.length === 1 ? 'event' : 'events'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {inv.scenes.length > 0
                          ? `${inv.scenes.length} scenes`
                          : 'Setup in progress'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openInvitation(inv.id)}
                      className="text-xs font-medium text-[#9A6F3D] hover:text-[#7D572C] transition-colors cursor-pointer"
                    >
                      {inv.status === 'Ready'
                        ? 'Open in Compose →'
                        : inv.scenes.length > 0
                          ? 'Review Scenes →'
                          : 'Continue Details →'}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteInvitation(inv.id)}
                      aria-label={`Delete ${inv.title}`}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </main>
  );
};
