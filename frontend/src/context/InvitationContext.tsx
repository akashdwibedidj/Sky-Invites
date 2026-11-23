import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

// ── Route helpers ─────────────────────────────────────────────────────────────

export function screenRouteToPath(screen: ScreenRoute, invitationId?: string | null): string {
  switch (screen) {
    case 'dashboard':       return '/';
    case 'create-type':     return '/create';
    case 'step-1-details':  return '/create/details';
    case 'step-2-design':   return '/create/design';
    case 'generating':      return invitationId ? `/invitation/${invitationId}/generating` : '/create';
    case 'step-3-review':   return invitationId ? `/invitation/${invitationId}/review`     : '/';
    case 'step-4-animation':return invitationId ? `/invitation/${invitationId}/animation`  : '/';
    case 'step-5-compose':  return invitationId ? `/invitation/${invitationId}/compose`    : '/';
    case 'step-6-export':   return invitationId ? `/invitation/${invitationId}/export`     : '/';
    default:                return '/';
  }
}

export function pathToScreenRoute(pathname: string): ScreenRoute {
  if (pathname === '/' || pathname === '')               return 'dashboard';
  if (pathname === '/create')                            return 'create-type';
  if (pathname === '/create/details')                    return 'step-1-details';
  if (pathname === '/create/design')                     return 'step-2-design';
  if (/\/invitation\/[^/]+\/generating/.test(pathname))  return 'generating';
  if (/\/invitation\/[^/]+\/review/.test(pathname))      return 'step-3-review';
  if (/\/invitation\/[^/]+\/animation/.test(pathname))   return 'step-4-animation';
  if (/\/invitation\/[^/]+\/compose/.test(pathname))     return 'step-5-compose';
  if (/\/invitation\/[^/]+\/export/.test(pathname))      return 'step-6-export';
  return 'dashboard';
}

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
  loadSavedInvitation: (invitation: Invitation, targetScreen: ScreenRoute) => void;
}

const InvitationContext = createContext<InvitationContextValue | null>(null);

export const InvitationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invitations, setInvitations] = useState<Invitation[]>(MOCK_INVITATIONS);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(true);
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Derive currentScreen from the URL so TopBar stepper stays in sync
  const currentScreen: ScreenRoute = pathToScreenRoute(location.pathname);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingDashboard(false), 450);
    return () => clearTimeout(timer);
  }, []);

  const activeInvitation = invitations.find((inv) => inv.id === activeInvitationId) ?? null;

  const navigateTo = useCallback((screen: ScreenRoute) => {
    const path = screenRouteToPath(screen, activeInvitationId);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate, activeInvitationId]);

  const openInvitation = useCallback(
    (id: string, targetScreen?: ScreenRoute) => {
      const found = invitations.find((inv) => inv.id === id);
      if (!found) return;
      setActiveInvitationId(id);
      setSelectedSceneId(found.scenes[0]?.id ?? null);

      let screen: ScreenRoute;
      if (targetScreen) {
        screen = targetScreen;
      } else if (found.status === 'Ready' && found.scenes.length > 0) {
        screen = 'step-5-compose';
      } else if (found.scenes.length > 0) {
        screen = 'step-3-review';
      } else {
        screen = 'step-1-details';
      }
      navigate(screenRouteToPath(screen, id));
    },
    [invitations, navigate]
  );

  const startNewInvitationFlow = useCallback(() => {
    setActiveInvitationId(null);
    setSelectedSceneId(null);
    navigate('/create');
  }, [navigate]);

  const createDraftFromType = useCallback(
    (type: InvitationType) => {
      const draft = createEmptyInvitationDraft(type);
      setInvitations((prev) => [draft, ...prev]);
      setActiveInvitationId(draft.id);
      setSelectedSceneId(null);
      navigate('/create/details');
    },
    [navigate]
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
      // Also update the URL so the generating screen gets the real ID
      navigate(`/invitation/${id}/generating`, { replace: true });
    },
    [updateActiveInvitation, navigate]
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
        navigate('/');
      }
    },
    [activeInvitationId, navigate]
  );

  const restoreDemoInvitations = useCallback(() => {
    setInvitations(MOCK_INVITATIONS);
  }, []);

  const clearAllInvitations = useCallback(() => {
    setInvitations([]);
    setActiveInvitationId(null);
    navigate('/');
  }, [navigate]);

  const loadSavedInvitation = useCallback(
    (invitation: Invitation, targetScreen: ScreenRoute) => {
      setInvitations((prev) => {
        const exists = prev.some((inv) => inv.id === invitation.id);
        if (exists) {
          return prev.map((inv) => (inv.id === invitation.id ? invitation : inv));
        }
        return [invitation, ...prev];
      });
      setActiveInvitationId(invitation.id);
      setSelectedSceneId(invitation.scenes[0]?.id ?? null);
      navigate(screenRouteToPath(targetScreen, invitation.id));
    },
    [navigate]
  );

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
        loadSavedInvitation,
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
