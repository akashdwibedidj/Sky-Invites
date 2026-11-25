/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

/* ── Editor imports ──────────────────────────────────────────────────────── */
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

/* ── Site Shell imports ──────────────────────────────────────────────────── */
import { AuthProvider } from './site/context/AuthContext';
import { Navbar } from './site/components/Navbar';
import { Footer } from './site/components/Footer';
import { ProtectedRoute } from './site/components/ProtectedRoute';
import { SkyBackground } from './site/components/SkyBackground';
import { HomePage } from './site/pages/HomePage';
import { BusinessPage } from './site/pages/BusinessPage';
import { AuthPage } from './site/pages/AuthPage';
import { DashboardPage } from './site/pages/DashboardPage';
import { PricingPage } from './site/pages/PricingPage';
import { LegalPage } from './site/pages/LegalPage';
import { ContactPage } from './site/pages/ContactPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Guard: redirect /editor/create/details and /editor/create/design to /editor/create if no active draft */
const DraftGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeInvitation } = useInvitations();
  if (!activeInvitation) return <Navigate to="/editor/create" replace />;
  return <>{children}</>;
};

const SiteLayout: React.FC = () => {
  return (
    <div className="site-layout relative flex min-h-screen flex-col text-ink">
      <SkyBackground />
      <Navbar />
      <main className="relative z-10 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

const EditorLayout: React.FC = () => {
  const location = useLocation();
  return (
    <div className="editor-layout min-h-screen bg-white text-stone-900 flex flex-col">
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
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <InvitationProvider>
          <ScrollToTop />
          <Routes>
            {/* ── Public Marketing Site Shell ── */}
            <Route element={<SiteLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/business" element={<BusinessPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/terms" element={<LegalPage type="terms" />} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/refund" element={<LegalPage type="refund" />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>

            {/* Redirect /create to /editor/create */}
            <Route path="/create" element={<Navigate to="/editor/create" replace />} />

            {/* ── Existing Editor (not gated behind login) ── */}
            <Route element={<EditorLayout />}>
              <Route path="/editor" element={<DashboardScreen />} />
              <Route path="/editor/create" element={<CreateTypeScreen />} />
              <Route
                path="/editor/create/details"
                element={
                  <DraftGuard>
                    <DetailsFormScreen />
                  </DraftGuard>
                }
              />
              <Route
                path="/editor/create/design"
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
                <Route index element={<Navigate to="review" replace />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </InvitationProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
