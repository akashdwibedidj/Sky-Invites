/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { InvitationProvider, useInvitations } from './context/InvitationContext';
import { TopBar } from './components/TopBar';
import { DashboardScreen } from './components/DashboardScreen';
import { CreateTypeScreen } from './components/CreateTypeScreen';
import { DetailsFormScreen } from './components/DetailsFormScreen';
import { DesignPreferencesScreen } from './components/DesignPreferencesScreen';
import { GenerationProgressScreen } from './components/GenerationProgressScreen';
import { ImageReviewScreen } from './components/ImageReviewScreen';
import { AnimationPromptScreen } from './components/AnimationPromptScreen';
import { ComposeScreen } from './components/ComposeScreen';
import { ExportScreen } from './components/ExportScreen';
import { InvitationLoader } from './components/InvitationLoader';
import { NotFoundPage } from './pages/NotFoundPage';
import { useLocation } from 'react-router-dom';

/** Guard: redirect /create/details and /create/design to /create if no active draft */
const DraftGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeInvitation } = useInvitations();
  if (!activeInvitation) return <Navigate to="/create" replace />;
  return <>{children}</>;
};

const AppShell: React.FC = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col">
      <TopBar />
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Routes location={location}>
              {/* Dashboard */}
              <Route path="/" element={<DashboardScreen />} />

              {/* Create wizard (pre-generation, no :id) */}
              <Route path="/create" element={<CreateTypeScreen />} />
              <Route
                path="/create/details"
                element={
                  <DraftGuard>
                    <DetailsFormScreen />
                  </DraftGuard>
                }
              />
              <Route
                path="/create/design"
                element={
                  <DraftGuard>
                    <DesignPreferencesScreen />
                  </DraftGuard>
                }
              />

              {/* Invitation routes — all loaded from backend via :id */}
              <Route path="/invitation/:id" element={<InvitationLoader />}>
                <Route path="generating" element={<GenerationProgressScreen />} />
                <Route path="review"     element={<ImageReviewScreen />} />
                <Route path="animation"  element={<AnimationPromptScreen />} />
                <Route path="compose"    element={<ComposeScreen />} />
                <Route path="export"     element={<ExportScreen />} />
                {/* index redirect to review */}
                <Route index element={<Navigate to="review" replace />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <InvitationProvider>
      <AppShell />
    </InvitationProvider>
  );
}
