/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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

const ScreenRouter: React.FC = () => {
  const { currentScreen } = useInvitations();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'create-type':
        return <CreateTypeScreen />;
      case 'step-1-details':
        return <DetailsFormScreen />;
      case 'step-2-design':
        return <DesignPreferencesScreen />;
      case 'generating':
        return <GenerationProgressScreen />;
      case 'step-3-review':
        return <ImageReviewScreen />;
      case 'step-4-animation':
        return <AnimationPromptScreen />;
      case 'step-5-compose':
        return <ComposeScreen />;
      case 'step-6-export':
        return <ExportScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col">
      <TopBar />
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <InvitationProvider>
      <ScreenRouter />
    </InvitationProvider>
  );
}
