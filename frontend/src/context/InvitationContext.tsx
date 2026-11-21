import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createEmptyInvitationDraft, MOCK_INVITATIONS } from '../data/mockInvitations';
import {
  AnimationPlan,
  DesignPreferences,
  Invitation,
  InvitationDetails,
  InvitationType,
  Scene,
  ScreenRoute,
  TextLayer,
} from '../types/invitation';

interface InvitationContextValue {
  invitations: Invitation[];
  isLoadingDashboard: boolean;
  activeInvitationId: string | null;
  activeInvitation: Invitation | null;
  currentScreen: ScreenRoute;
  selectedSceneId: string | null;
  navigateTo: (screen: ScreenRoute) => void;
  openInvitation: (id: string, targetScreen?: ScreenRoute) => void;
  startNewInvitationFlow: () => void;
  createDraftFromType: (type: InvitationType) => void;
  updateActiveDetails: (details: Partial<InvitationDetails>, title?: string) => void;
  updateActiveDesign: (design: Partial<DesignPreferences>) => void;
  setActiveScenes: (scenes: Scene[], status?: Invitation['status']) => void;
  setInvitationId: (id: string) => void;
  updateScene: (sceneId: string, updater: (scene: Scene) => Scene) => void;
  updateSceneTextLayer: (sceneId: string, updater: (layer: TextLayer) => TextLayer) => void;
  updateSceneAnimationPlan: (sceneId: string, updater: (plan: AnimationPlan) => AnimationPlan) => void;
  setSelectedSceneId: (sceneId: string | null) => void;
  updateActiveStatus: (status: Invitation['status'], exportedVideoUrl?: string) => void;
  deleteInvitation: (id: string) => void;
  restoreDemoInvitations: () => void;
  clearAllInvitations: () => void;
}

const InvitationContext = createContext<InvitationContextValue | null>(null);

export const InvitationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invitations, setInvitations] = useState<Invitation[]>(MOCK_INVITATIONS);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(true);
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenRoute>('dashboard');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingDashboard(false), 450);
    return () => clearTimeout(timer);
  }, []);

  const activeInvitation = invitations.find((inv) => inv.id === activeInvitationId) ?? null;

  const navigateTo = useCallback((screen: ScreenRoute) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openInvitation = useCallback(
    (id: string, targetScreen?: ScreenRoute) => {
      const found = invitations.find((inv) => inv.id === id);
      if (!found) return;
      setActiveInvitationId(id);
      setSelectedSceneId(found.scenes[0]?.id ?? null);

      if (targetScreen) {
        navigateTo(targetScreen);
        return;
      }

      if (found.status === 'Ready' && found.scenes.length > 0) {
        navigateTo('step-5-compose');
      } else if (found.scenes.length > 0) {
        navigateTo('step-3-review');
      } else {
        navigateTo('step-1-details');
      }
    },
    [invitations, navigateTo]
  );

  const startNewInvitationFlow = useCallback(() => {
    setActiveInvitationId(null);
    setSelectedSceneId(null);
    navigateTo('create-type');
  }, [navigateTo]);

  const createDraftFromType = useCallback(
    (type: InvitationType) => {
      const draft = createEmptyInvitationDraft(type);
      setInvitations((prev) => [draft, ...prev]);
      setActiveInvitationId(draft.id);
      setSelectedSceneId(null);
      navigateTo('step-1-details');
    },
    [navigateTo]
  );

  const updateActiveInvitation = useCallback(
    (updater: (inv: Invitation) => Invitation) => {
      if (!activeInvitationId) return;
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === activeInvitationId
            ? { ...updater(inv), updatedAt: new Date().toISOString() }
            : inv
        )
      );
    },
    [activeInvitationId]
  );

  const updateActiveDetails = useCallback(
    (detailsPatch: Partial<InvitationDetails>, title?: string) => {
      updateActiveInvitation((inv) => {
        const nextDetails = { ...inv.details, ...detailsPatch };
        let computedTitle = title ?? inv.title;
        if (!title) {
          if (nextDetails.brideName && nextDetails.groomName) {
            computedTitle = `${nextDetails.groomName.split(' ')[0]} weds ${nextDetails.brideName.split(' ')[0]}`;
          } else if (nextDetails.honoreeName) {
            computedTitle = `${nextDetails.honoreeName} · ${inv.type}`;
          } else if (nextDetails.hostName) {
            computedTitle = `${nextDetails.hostName} ${inv.type}`;
          }
        }
        return {
          ...inv,
          title: computedTitle,
          details: nextDetails,
        };
      });
    },
    [updateActiveInvitation]
  );

  const updateActiveDesign = useCallback(
    (designPatch: Partial<DesignPreferences>) => {
      updateActiveInvitation((inv) => ({
        ...inv,
        design: { ...inv.design, ...designPatch },
      }));
    },
    [updateActiveInvitation]
  );

  const setInvitationId = useCallback(
    (id: string) => {
      updateActiveInvitation((inv) => ({
        ...inv,
        id,
        invitation_id: id,
      }));
      setActiveInvitationId(id);
    },
    [updateActiveInvitation]
  );

  const setActiveScenes = useCallback(
    (scenes: Scene[], status?: Invitation['status']) => {
      updateActiveInvitation((inv) => {
        const invId = scenes[0]?.invitation_id || inv.invitation_id || inv.id;
        return {
          ...inv,
          id: invId,
          invitation_id: invId,
          status: status ?? inv.status,
          scenes,
        };
      });
      if (scenes.length > 0) {
        setSelectedSceneId((prev) =>
          prev && scenes.some((s) => s.id === prev) ? prev : scenes[0].id
        );
      }
    },
    [updateActiveInvitation]
  );

  const updateScene = useCallback(
    (sceneId: string, updater: (scene: Scene) => Scene) => {
      updateActiveInvitation((inv) => ({
        ...inv,
        scenes: inv.scenes.map((sc) => (sc.id === sceneId ? updater(sc) : sc)),
      }));
    },
    [updateActiveInvitation]
  );

  const updateSceneTextLayer = useCallback(
    (sceneId: string, updater: (layer: TextLayer) => TextLayer) => {
      updateScene(sceneId, (sc) => ({
        ...sc,
        textLayer: updater(sc.textLayer),
      }));
    },
    [updateScene]
  );

  const updateSceneAnimationPlan = useCallback(
    (sceneId: string, updater: (plan: AnimationPlan) => AnimationPlan) => {
      updateScene(sceneId, (sc) => ({
        ...sc,
        animationPlan: updater(sc.animationPlan),
      }));
    },
    [updateScene]
  );

  const updateActiveStatus = useCallback(
    (status: Invitation['status'], exportedVideoUrl?: string) => {
      updateActiveInvitation((inv) => ({
        ...inv,
        status,
        exportedVideoUrl: exportedVideoUrl ?? inv.exportedVideoUrl,
      }));
    },
    [updateActiveInvitation]
  );

  const deleteInvitation = useCallback(
    (id: string) => {
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      if (activeInvitationId === id) {
        setActiveInvitationId(null);
        setCurrentScreen('dashboard');
      }
    },
    [activeInvitationId]
  );

  const restoreDemoInvitations = useCallback(() => {
    setInvitations(MOCK_INVITATIONS);
  }, []);

  const clearAllInvitations = useCallback(() => {
    setInvitations([]);
    setActiveInvitationId(null);
    setCurrentScreen('dashboard');
  }, []);

  return (
    <InvitationContext.Provider
      value={{
        invitations,
        isLoadingDashboard,
        activeInvitationId,
        activeInvitation,
        currentScreen,
        selectedSceneId,
        navigateTo,
        openInvitation,
        startNewInvitationFlow,
        createDraftFromType,
        updateActiveDetails,
        updateActiveDesign,
        setActiveScenes,
        setInvitationId,
        updateScene,
        updateSceneTextLayer,
        updateSceneAnimationPlan,
        setSelectedSceneId,
        updateActiveStatus,
        deleteInvitation,
        restoreDemoInvitations,
        clearAllInvitations,
      }}
    >
      {children}
    </InvitationContext.Provider>
  );
};

export function useInvitations() {
  const ctx = useContext(InvitationContext);
  if (!ctx) {
    throw new Error('useInvitations must be used inside InvitationProvider');
  }
  return ctx;
}
