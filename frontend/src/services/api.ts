/**
 * Sky Invites Editor API Service
 * Plan 4: adds Authorization header to every request using the token from siteApi.
 * Global 401 handler: clears token and redirects to /login.
 */

import { getAuthToken, setAuthToken } from '../site/services/siteApi';
import { GENERATED_SCENE_IMAGES } from '../data/mockInvitations';
import {
  AnimationPlan,
  CameraMovement,
  Invitation,
  InvitationType,
  PageTransition,
  Scene,
  TextAnimation,
  TextLine,
  ThemeStyle,
} from '../types/invitation';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

let currentInvitationId: string = '';

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function throwApiError(res: Response, fallbackMessage: string): Promise<never> {
  let code: string | undefined;
  let detail: string | undefined;
  try {
    const body = await res.json();
    if (body && typeof body === 'object') {
      code = body.code;
      detail = body.detail || body.message;
    }
  } catch {
    // ignore non-JSON body
  }
  throw new ApiError(detail || fallbackMessage, res.status, code);
}

/** Build fetch headers with auth token. */
function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Handle 401 from editor API calls.
 * Clears token and redirects unless already on an auth page.
 */
function handle401(): void {
  const authPaths = ['/login', '/signup'];
  if (authPaths.some((p) => window.location.pathname.startsWith(p))) return;
  setAuthToken(null);
  window.location.replace('/login?session=expired');
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function extractInvitationId(scene?: Scene, fallbackId?: string): { invitationId: string; sceneIndex: number } {
  if (!scene) {
    return { invitationId: fallbackId || currentInvitationId || '', sceneIndex: 0 };
  }
  if (scene.invitation_id) {
    const idx = scene.order !== undefined ? scene.order - 1 : 0;
    return { invitationId: scene.invitation_id, sceneIndex: idx };
  }
  const match = scene.id?.match(/^sc-(.+)-(\d+)$/);
  if (match) {
    return { invitationId: match[1], sceneIndex: parseInt(match[2], 10) };
  }
  return {
    invitationId: fallbackId || currentInvitationId || '',
    sceneIndex: Math.max(0, (scene.order || 1) - 1),
  };
}

function getDisplayCoupleOrHonoree(inv: Invitation): string {
  const { brideName, groomName, honoreeName, hostName } = inv.details;
  if (brideName && groomName) return `${groomName.split(' ')[0]} & ${brideName.split(' ')[0]}`;
  if (brideName || groomName) return brideName || groomName;
  if (honoreeName) return honoreeName;
  if (hostName) return hostName;
  return inv.title || 'A Special Celebration';
}

function buildSceneLines(inv: Invitation, index: number, total: number): TextLine[] {
  const primaryNames = getDisplayCoupleOrHonoree(inv);
  const events = inv.details.events;

  if (index === 0) {
    const parents =
      inv.details.brideParents || inv.details.groomParents
        ? 'TOGETHER WITH THEIR FAMILIES'
        : inv.details.hostName
          ? `HOSTED BY ${inv.details.hostName.toUpperCase()}`
          : `${inv.type.toUpperCase()} INVITATION`;
    const firstDate = events[0]?.date ? `${events[0].date}` : 'Save the Date';
    return [
      { id: `l-${index}-1`, role: 'kicker', text: parents },
      { id: `l-${index}-2`, role: 'heading', text: primaryNames },
      {
        id: `l-${index}-3`,
        role: 'subheading',
        text: inv.details.message
          ? inv.details.message.slice(0, 72) + (inv.details.message.length > 72 ? '...' : '')
          : `Request the pleasure of your company`,
      },
      { id: `l-${index}-4`, role: 'detail', text: firstDate },
    ];
  }

  if (index === total - 1 && total > 2) {
    return [
      { id: `l-${index}-1`, role: 'kicker', text: 'WITH WARMTH & JOY' },
      { id: `l-${index}-2`, role: 'heading', text: 'We Look Forward to Seeing You' },
      {
        id: `l-${index}-3`,
        role: 'subheading',
        text: inv.details.hostName || primaryNames,
      },
      { id: `l-${index}-4`, role: 'footer', text: 'Kindly RSVP at your earliest convenience' },
    ];
  }

  const event = events[(index - 1) % Math.max(1, events.length)];
  if (event) {
    return [
      { id: `l-${index}-1`, role: 'kicker', text: `CHAPTER 0${index + 1}` },
      { id: `l-${index}-2`, role: 'heading', text: event.name || `${inv.type} Celebration` },
      {
        id: `l-${index}-3`,
        role: 'subheading',
        text: [event.date, event.time].filter(Boolean).join(' · ') || 'Date to be announced',
      },
      {
        id: `l-${index}-4`,
        role: 'detail',
        text: event.venue || 'Venue details forthcoming',
      },
    ];
  }

  return [
    { id: `l-${index}-1`, role: 'kicker', text: `SCENE 0${index + 1}` },
    { id: `l-${index}-2`, role: 'heading', text: primaryNames },
    { id: `l-${index}-3`, role: 'detail', text: 'Join us in celebration' },
  ];
}

function getSceneImageByIndex(index: number, theme: string): string {
  const offset =
    theme === 'Traditional' ? 1 : theme === 'Modern' ? 2 : theme === 'Minimal' ? 3 : theme === 'Floral' ? 4 : 0;
  return GENERATED_SCENE_IMAGES[(index + offset) % GENERATED_SCENE_IMAGES.length];
}

function getSceneTextColor(imageUrl: string, paletteText: string): string {
  if (imageUrl.includes('sangeet_starlit_palace')) {
    return '#FAF6EE';
  }
  if (paletteText === '#FAF6EE') {
    return '#292524';
  }
  return paletteText;
}

/**
 * 1. createScenes
 */
export async function createScenes(invitation: Invitation): Promise<Scene[]> {
  const res = await fetch(`${API_URL}/api/create-scenes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ invitation }),
  });

  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    throw new Error(`Failed to create scenes: ${res.status} ${res.statusText}`);
  }

  const data: { invitation_id: string; status: string } = await res.json();
  const invitationId = data.invitation_id;
  currentInvitationId = invitationId;
  invitation.id = invitationId;
  invitation.invitation_id = invitationId;

  const maxPolls = 60;
  for (let i = 0; i < maxPolls; i++) {
    await delay(1500);
    const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`, {
      headers: authHeaders(),
    });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    if (statusData.status === 'stage1_done') break;
    if (statusData.status === 'failed') {
      throw new Error(`Scene creation failed for invitation ${invitationId}`);
    }
  }

  const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
    headers: authHeaders(),
  });
  if (!invRes.ok) {
    throw new Error(`Failed to fetch invitation: ${invRes.status} ${invRes.statusText}`);
  }

  const invData = await invRes.json();
  const scenes: Scene[] = (invData.scenes || []).map((sc: any) => ({
    ...sc,
    imageUrl: resolveMediaUrl(sc.imageUrl),
    videoUrl: sc.videoUrl ? resolveMediaUrl(sc.videoUrl) : undefined,
    invitation_id: invitationId,
  }));

  return scenes;
}

/**
 * 2. generateImages
 */
export async function generateImages(
  scenes: Scene[],
  storyDriven: boolean,
  onSceneProgress: (sceneId: string, status: Scene['imageStatus'], imageUrl?: string) => void
): Promise<Scene[]> {
  const { invitationId } = extractInvitationId(scenes[0]);
  if (!invitationId) {
    throw new Error('No invitation ID found for generateImages');
  }

  const res = await fetch(`${API_URL}/api/generate-images`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      invitation_id: invitationId,
      story_driven: storyDriven,
    }),
  });

  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    throw new Error(`Failed to start image generation: ${res.statusText}`);
  }

  scenes.forEach((sc) => onSceneProgress(sc.id, 'generating'));

  const sceneStatusMap = new Map<string, Scene['imageStatus']>();
  scenes.forEach((sc) => sceneStatusMap.set(sc.id, 'generating'));

  let allCompleted = false;
  const pollInterval = 2500;
  const maxAttempts = 120;
  let attempts = 0;

  while (!allCompleted && attempts < maxAttempts) {
    await delay(pollInterval);
    attempts++;

    try {
      const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`, {
        headers: authHeaders(),
      });
      if (!statusRes.ok) continue;

      const statusData: {
        invitation_id: string;
        status: string;
        scenes: Array<{
          id: string;
          scene_index: number;
          order: number;
          title: string;
          image_status: 'pending' | 'generating' | 'done' | 'failed';
          video_status: string;
          video_progress: number;
          image_url: string | null;
          video_url: string | null;
        }>;
      } = await statusRes.json();

      const backendScenes = statusData.scenes || [];
      let doneOrFailedCount = 0;

      for (const bs of backendScenes) {
        const scId = bs.id;
        const currentStatus = bs.image_status;
        const prevStatus = sceneStatusMap.get(scId);

        const resolvedImg = bs.image_url ? resolveMediaUrl(bs.image_url) : undefined;

        if (currentStatus !== prevStatus) {
          sceneStatusMap.set(scId, currentStatus);
          onSceneProgress(scId, currentStatus, resolvedImg);
        }

        if (currentStatus === 'done' || currentStatus === 'failed') {
          doneOrFailedCount++;
        }
      }

      if (
        (backendScenes.length > 0 && doneOrFailedCount === backendScenes.length) ||
        statusData.status === 'done' ||
        statusData.status === 'failed'
      ) {
        allCompleted = true;
      }
    } catch (err) {
      console.error('Error polling image generation status:', err);
    }
  }

  const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
    headers: authHeaders(),
  });
  if (invRes.ok) {
    const invData = await invRes.json();
    return (invData.scenes || []).map((sc: any) => ({
      ...sc,
      imageUrl: resolveMediaUrl(sc.imageUrl),
      videoUrl: sc.videoUrl ? resolveMediaUrl(sc.videoUrl) : undefined,
      invitation_id: invitationId,
    }));
  }

  return scenes.map((sc) => ({
    ...sc,
    imageStatus: sceneStatusMap.get(sc.id) || sc.imageStatus,
    invitation_id: invitationId,
  }));
}

/**
 * 3. regenerateImage
 */
export async function regenerateImage(scene: Scene, customPrompt?: string): Promise<Scene> {
  const { invitationId, sceneIndex } = extractInvitationId(scene);
  const promptToUse = customPrompt ?? scene.imagePrompt;

  const res = await fetch(`${API_URL}/api/regenerate-image`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      invitation_id: invitationId,
      scene_index: sceneIndex,
      custom_prompt: promptToUse,
    }),
  });

  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    await throwApiError(res, `Failed to regenerate image: ${res.statusText}`);
  }

  while (true) {
    await delay(2000);
    const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`, {
      headers: authHeaders(),
    });
    if (statusRes.ok) {
      const data = await statusRes.json();
      const scStatus = data.scenes?.find((s: any) => s.scene_index === sceneIndex || s.id === scene.id);
      if (scStatus) {
        if (scStatus.image_status === 'done') {
          const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
            headers: authHeaders(),
          });
          if (invRes.ok) {
            const invData = await invRes.json();
            const updatedScene = invData.scenes?.find((s: any) => s.id === scene.id || s.order === scene.order);
            if (updatedScene) {
              return {
                ...updatedScene,
                imageUrl: resolveMediaUrl(updatedScene.imageUrl),
                videoUrl: updatedScene.videoUrl ? resolveMediaUrl(updatedScene.videoUrl) : undefined,
                textLayer: updatedScene.textLayer || scene.textLayer,
                imagePrompt: promptToUse,
                invitation_id: invitationId,
              };
            }
          }
          return {
            ...scene,
            imageUrl: resolveMediaUrl(scStatus.image_url),
            imagePrompt: promptToUse,
            imageStatus: 'done',
          };
        } else if (scStatus.image_status === 'failed') {
          throw new Error('Scene image regeneration failed');
        }
      }
    }
  }
}

/**
 * 3b. editImageWithInstruction
 */
export async function editImageWithInstruction(scene: Scene, instruction: string): Promise<Scene> {
  const { invitationId, sceneIndex } = extractInvitationId(scene);
  const trimmed = instruction.trim();
  const nextPrompt = trimmed ? `${scene.imagePrompt} Refined: ${trimmed}` : scene.imagePrompt;

  const res = await fetch(`${API_URL}/api/regenerate-image`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      invitation_id: invitationId,
      scene_index: sceneIndex,
      custom_prompt: nextPrompt,
      instruction: trimmed,
    }),
  });

  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    await throwApiError(res, `Failed to edit image with instruction: ${res.statusText}`);
  }

  while (true) {
    await delay(2000);
    const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`, {
      headers: authHeaders(),
    });
    if (statusRes.ok) {
      const data = await statusRes.json();
      const scStatus = data.scenes?.find((s: any) => s.scene_index === sceneIndex || s.id === scene.id);
      if (scStatus) {
        if (scStatus.image_status === 'done') {
          const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
            headers: authHeaders(),
          });
          if (invRes.ok) {
            const invData = await invRes.json();
            const updatedScene = invData.scenes?.find((s: any) => s.id === scene.id || s.order === scene.order);
            if (updatedScene) {
              return {
                ...updatedScene,
                imageUrl: resolveMediaUrl(updatedScene.imageUrl),
                videoUrl: updatedScene.videoUrl ? resolveMediaUrl(updatedScene.videoUrl) : undefined,
                textLayer: updatedScene.textLayer || scene.textLayer,
                imagePrompt: nextPrompt,
                invitation_id: invitationId,
              };
            }
          }
          return {
            ...scene,
            imageUrl: resolveMediaUrl(scStatus.image_url),
            imagePrompt: nextPrompt,
            imageStatus: 'done',
          };
        } else if (scStatus.image_status === 'failed') {
          throw new Error('Image edit with instruction failed');
        }
      }
    }
  }
}

/**
 * 4. analyzeImage
 */
export async function analyzeImage(scene: Scene, animationNote?: string): Promise<AnimationPlan> {
  const { invitationId, sceneIndex } = extractInvitationId(scene);
  const note = animationNote ?? scene.animationNote;

  const res = await fetch(`${API_URL}/api/analyze-image`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      invitation_id: invitationId,
      scene_index: sceneIndex,
      animation_note: note || undefined,
    }),
  });

  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    throw new Error(`Failed to analyze image: ${res.statusText}`);
  }

  const plan: AnimationPlan = await res.json();
  return plan;
}

/**
 * 5. generateVideo
 */
export async function generateVideo(
  scene: Scene,
  onProgress: (sceneId: string, status: AnimationPlan['videoStatus'], progress: number) => void
): Promise<Scene> {
  const { invitationId, sceneIndex } = extractInvitationId(scene);
  if (!invitationId) {
    throw new Error('No invitation ID found for generateVideo');
  }

  onProgress(scene.id, 'queued', 10);

  const res = await fetch(`${API_URL}/api/generate-video`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      invitation_id: invitationId,
      scene_index: sceneIndex,
    }),
  });

  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    let errCode: string | undefined;
    try {
      const cloned = res.clone();
      const body = await cloned.json();
      errCode = body?.code;
    } catch { /* ignore */ }
    if (errCode !== 'IN_PROGRESS') {
      onProgress(scene.id, 'failed', 0);
    }
    await throwApiError(res, `Failed to start video generation: ${res.statusText}`);
  }

  let videoDone = false;
  let videoFailed = false;
  let lastProgress = 10;
  const pollInterval = 2000;
  const maxAttempts = 180;
  let attempts = 0;

  while (!videoDone && !videoFailed && attempts < maxAttempts) {
    await delay(pollInterval);
    attempts++;

    try {
      const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`, {
        headers: authHeaders(),
      });
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const scStatus = statusData.scenes?.find((s: any) => s.scene_index === sceneIndex || s.id === scene.id);

      if (scStatus) {
        const vStatus: AnimationPlan['videoStatus'] = scStatus.video_status || 'generating';
        const vProgress: number = typeof scStatus.video_progress === 'number' ? scStatus.video_progress : lastProgress;
        lastProgress = vProgress;

        onProgress(scene.id, vStatus, vProgress);

        if (vStatus === 'done') {
          videoDone = true;
        } else if (vStatus === 'failed') {
          videoFailed = true;
        }
      }
    } catch (err) {
      console.error('Error polling video status:', err);
    }
  }

  if (videoFailed) {
    throw new Error(`Video generation failed for scene ${scene.id}`);
  }

  const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
    headers: authHeaders(),
  });
  if (invRes.ok) {
    const invData = await invRes.json();
    const updatedScene = invData.scenes?.find((s: any) => s.id === scene.id || s.order === scene.order);
    if (updatedScene) {
      return {
        ...updatedScene,
        imageUrl: resolveMediaUrl(updatedScene.imageUrl),
        videoUrl: resolveMediaUrl(updatedScene.videoUrl),
        invitation_id: invitationId,
      };
    }
  }

  return {
    ...scene,
    videoUrl: resolveMediaUrl(`/media/${invitationId}/scene_${sceneIndex}.mp4`),
    animationPlan: {
      ...scene.animationPlan,
      videoStatus: 'done',
      videoProgress: 100,
    },
  };
}

/**
 * patchScene
 */
export async function patchScene(
  scene: Scene,
  patch: {
    text_layer?: any;
    image_prompt?: string;
    video_prompt?: string;
    animation_note?: string;
    animation_plan?: any;
  }
): Promise<Scene> {
  const { invitationId, sceneIndex } = extractInvitationId(scene);
  const res = await fetch(`${API_URL}/api/invitations/${invitationId}/scenes/${sceneIndex}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    throw new Error(`Failed to patch scene: ${res.statusText}`);
  }
  const data = await res.json();
  return {
    ...data.scene,
    imageUrl: resolveMediaUrl(data.scene.imageUrl),
    videoUrl: data.scene.videoUrl ? resolveMediaUrl(data.scene.videoUrl) : undefined,
    invitation_id: invitationId,
  };
}

/**
 * 6. exportVideo
 */
export async function exportVideo(
  invitation: Invitation,
  onProgress: (progress: number, stageLabel: string) => void
): Promise<{ url: string; fileName: string; sizeMb: string }> {
  const invitationId = invitation.id || invitation.invitation_id || currentInvitationId;
  if (!invitationId) {
    throw new Error('No invitation ID found for exportVideo');
  }

  onProgress(5, 'Submitting render job...');

  const res = await fetch(`${API_URL}/api/export-video`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      invitation_id: invitationId,
      scenes: invitation.scenes,
      transition: invitation.design?.transition || 'Fade',
      title: invitation.title,
    }),
  });

  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    throw new Error(`Failed to start video export: ${res.statusText}`);
  }

  const pollInterval = 1500;
  const maxAttempts = 240;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await delay(pollInterval);
    attempts++;

    let data: {
      status: 'idle' | 'rendering' | 'done' | 'failed';
      progress: number;
      stage: string;
      error: string | null;
      url: string | null;
      fileName: string | null;
      sizeMb: string | null;
    } | null = null;

    try {
      const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/export-status`, {
        headers: authHeaders(),
      });
      if (statusRes.ok) {
        data = await statusRes.json();
      }
    } catch (err) {
      console.error('Error polling export status:', err);
      continue;
    }

    if (data) {
      onProgress(data.progress ?? 50, data.stage || 'Rendering video...');

      if (data.status === 'done' && data.url) {
        return {
          url: resolveMediaUrl(data.url),
          fileName: data.fileName || `${invitationId}-1080x1920.mp4`,
          sizeMb: data.sizeMb || 'Unknown size',
        };
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Video export failed on server');
      }
    }
  }

  throw new Error('Video export timed out');
}

export interface SavedInvitationSummary {
  invitation_id: string;
  title: string;
  type: string;
  created_at: string | null;
  status: string;
  scene_count: number;
}

export async function listSavedInvitations(): Promise<SavedInvitationSummary[]> {
  const res = await fetch(`${API_URL}/api/invitations`, { headers: authHeaders() });
  if (res.status === 401) { handle401(); return []; }
  if (!res.ok) {
    throw new Error(`Failed to list invitations: ${res.statusText}`);
  }
  return res.json();
}

export async function getSavedInvitation(invitationId: string): Promise<Invitation> {
  const res = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) { handle401(); throw new ApiError('Not authenticated', 401); }
  if (!res.ok) {
    throw new Error(`Failed to get invitation: ${res.statusText}`);
  }
  const data = await res.json();

  const scenes: Scene[] = (data.scenes || []).map((sc: any) => ({
    ...sc,
    imageUrl: resolveMediaUrl(sc.imageUrl),
    videoUrl: sc.videoUrl ? resolveMediaUrl(sc.videoUrl) : undefined,
    invitation_id: invitationId,
  }));

  if (data.frontend_invitation) {
    return {
      ...data.frontend_invitation,
      id: invitationId,
      invitation_id: invitationId,
      scenes,
    };
  }

  const u = data.user_input || {};
  const bride = u.bride_name || '';
  const groom = u.groom_name || '';
  const honoree = u.honoree_name || '';
  const host = u.host_name || '';
  let title = '';
  if (bride && groom) {
    title = `${groom.split(' ')[0]} weds ${bride.split(' ')[0]}`;
  } else if (bride || groom) {
    title = bride || groom;
  } else if (honoree) {
    title = honoree;
  } else if (host) {
    title = host;
  } else {
    title = invitationId;
  }

  const rawType = u.invitation_type || 'Wedding';
  const invType = (rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase()) as InvitationType;

  return {
    id: invitationId,
    invitation_id: invitationId,
    title,
    type: invType,
    status: scenes.every((s) => s.imageStatus === 'done') ? 'Ready' : 'Generating',
    createdAt: u.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    details: {
      brideName: bride,
      groomName: groom,
      brideParents: u.bride_parents || '',
      groomParents: u.groom_parents || '',
      honoreeName: honoree,
      hostName: host,
      events: (u.events || []).map((ev: any, idx: number) => ({
        id: `ev-${idx}`,
        name: ev.name || '',
        date: ev.date || '',
        time: ev.time || '',
        venue: ev.venue || '',
      })),
      message: u.message || '',
      referencePhotos: [],
    },
    design: {
      sceneCount: u.num_scenes || scenes.length || 2,
      transition: (u.transition_type
        ? u.transition_type.charAt(0).toUpperCase() + u.transition_type.slice(1).toLowerCase()
        : 'Dissolve') as PageTransition,
      fallingEffects: ['None'],
      fallingEffectIntensity: 50,
      theme: (u.theme || 'Modern') as ThemeStyle,
      palette: {
        id: 'champagne-ivory',
        name: 'Champagne & Ivory',
        primary: '#F5F0E6',
        secondary: '#FAF6EE',
        accent: '#D9C6A2',
        text: '#292524',
      },
      textPlacement: scenes[0]?.textLayer?.placement || 'center',
      textAlignment: scenes[0]?.textLayer?.alignment || 'center',
      headingFont: u.heading_font || 'Playfair Display',
      bodyFont: u.body_font || 'Cormorant Garamond',
      textAnimation: (u.text_animation || 'Slide-up') as TextAnimation,
      durationPerScene: u.duration_per_scene || 3,
      musicMood: 'Elegant',
      storyDriven: u.story_mode ?? true,
    },
    scenes,
  };
}
