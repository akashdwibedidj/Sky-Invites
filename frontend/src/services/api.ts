import { GENERATED_SCENE_IMAGES } from '../data/mockInvitations';
import {
  AnimationPlan,
  CameraMovement,
  Invitation,
  Scene,
  TextLine,
} from '../types/invitation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let currentInvitationId: string = '';

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
  // Twilight palace image has a darker upper sky; ensure legible contrast
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
 * Calls POST /api/create-scenes, polls /status until stage 1 is done,
 * then GETs the invitation and returns real Scene[] in the existing shape.
 */
export async function createScenes(invitation: Invitation): Promise<Scene[]> {
  const res = await fetch(`${API_URL}/api/create-scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invitation }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create scenes: ${res.status} ${res.statusText}`);
  }

  const data: { invitation_id: string; status: string } = await res.json();
  const invitationId = data.invitation_id;
  currentInvitationId = invitationId;
  invitation.id = invitationId;
  invitation.invitation_id = invitationId;

  // Poll /api/invitations/{id}/status until stage1_done (or failed)
  const maxPolls = 60;
  for (let i = 0; i < maxPolls; i++) {
    await delay(1500);
    const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`);
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    if (statusData.status === 'stage1_done') {
      break;
    }
    if (statusData.status === 'failed') {
      throw new Error(`Scene creation failed for invitation ${invitationId}`);
    }
  }

  // GET the invitation and return real Scene[] in the existing shape
  const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`);
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
 * Calls POST /api/generate-images, then polls /status every 2-3 seconds
 * and calls onSceneProgress per scene as each image finishes (generating -> done/failed, with image URL).
 * Passes storyDriven through.
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invitation_id: invitationId,
      story_driven: storyDriven,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to start image generation: ${res.statusText}`);
  }

  // Mark all scenes as generating initially
  scenes.forEach((sc) => onSceneProgress(sc.id, 'generating'));

  const sceneStatusMap = new Map<string, Scene['imageStatus']>();
  scenes.forEach((sc) => sceneStatusMap.set(sc.id, 'generating'));

  let allCompleted = false;
  const pollInterval = 2500; // 2.5 seconds
  const maxAttempts = 120;
  let attempts = 0;

  while (!allCompleted && attempts < maxAttempts) {
    await delay(pollInterval);
    attempts++;

    try {
      const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`);
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

  // Fetch complete final scenes from GET /api/invitations/{id}
  const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`);
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
 * Calls POST /api/regenerate-image and polls /status until done or failed.
 */
export async function regenerateImage(scene: Scene, customPrompt?: string): Promise<Scene> {
  const { invitationId, sceneIndex } = extractInvitationId(scene);
  const res = await fetch(`${API_URL}/api/regenerate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invitation_id: invitationId,
      scene_index: sceneIndex,
      custom_prompt: customPrompt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to regenerate image: ${res.statusText}`);
  }

  // Poll until done or failed
  while (true) {
    await delay(2000);
    const statusRes = await fetch(`${API_URL}/api/invitations/${invitationId}/status`);
    if (statusRes.ok) {
      const data = await statusRes.json();
      const scStatus = data.scenes?.find((s: any) => s.scene_index === sceneIndex || s.id === scene.id);
      if (scStatus) {
        if (scStatus.image_status === 'done') {
          const invRes = await fetch(`${API_URL}/api/invitations/${invitationId}`);
          if (invRes.ok) {
            const invData = await invRes.json();
            const updatedScene = invData.scenes?.find((s: any) => s.id === scene.id || s.order === scene.order);
            if (updatedScene) {
              return {
                ...updatedScene,
                imageUrl: resolveMediaUrl(updatedScene.imageUrl),
                videoUrl: updatedScene.videoUrl ? resolveMediaUrl(updatedScene.videoUrl) : undefined,
                invitation_id: invitationId,
              };
            }
          }
          return {
            ...scene,
            imageUrl: resolveMediaUrl(scStatus.image_url),
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
 * Helper to patch a scene's text layer, prompt or animation note
 */
export async function patchScene(
  scene: Scene,
  patch: {
    text_layer?: any;
    image_prompt?: string;
    video_prompt?: string;
    animation_note?: string;
  }
): Promise<Scene> {
  const { invitationId, sceneIndex } = extractInvitationId(scene);
  const res = await fetch(`${API_URL}/api/invitations/${invitationId}/scenes/${sceneIndex}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
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
 * 3b. editImageWithInstruction
 * Applies an AI image-editing instruction to the background layer only.
 */
export async function editImageWithInstruction(scene: Scene, instruction: string): Promise<Scene> {
  await delay(900);
  const trimmed = instruction.trim();
  const nextPrompt = trimmed ? `${scene.imagePrompt} Refined: ${trimmed}` : scene.imagePrompt;
  const currentIdx = GENERATED_SCENE_IMAGES.indexOf(scene.imageUrl);
  const nextImage =
    trimmed.toLowerCase().includes('dark') || trimmed.toLowerCase().includes('night')
      ? GENERATED_SCENE_IMAGES[2]
      : trimmed.toLowerCase().includes('floral') || trimmed.toLowerCase().includes('flower')
        ? GENERATED_SCENE_IMAGES[4]
        : GENERATED_SCENE_IMAGES[(currentIdx + 2) % GENERATED_SCENE_IMAGES.length];

  return {
    ...scene,
    imageUrl: nextImage,
    imagePrompt: nextPrompt,
    textLayer: {
      ...scene.textLayer,
      color: getSceneTextColor(nextImage, scene.textLayer.color),
    },
  };
}

/**
 * 4. analyzeImage
 * Simulates Vision-LLM analysis identifying foreground/background elements for Grok video prompting.
 */
export async function analyzeImage(scene: Scene): Promise<AnimationPlan> {
  await delay(750);

  if (scene.imageUrl.includes('royal_mandap')) {
    return {
      objectsDetected: ['Carved sandstone arch', 'Blush roses', 'Jasmine garlands', 'Warm sunlit center'],
      keepStationary: ['Sandstone arch frame', 'Center cream paper canvas'],
      shouldMove: ['Hanging jasmine tendrils', 'Soft rose petal sway', 'Warm ambient light'],
      cameraMovement: 'Slow zoom in',
      grokPrompt:
        'Slow zoom into the carved sandstone arch while a gentle breeze sways the blush roses and hanging jasmine vines; keep the central ivory canvas steady for text.',
      videoStatus: 'idle',
      videoProgress: 0,
    };
  }
  if (scene.imageUrl.includes('haldi_floral')) {
    return {
      objectsDetected: ['Marigold vines', 'Brass urlis', 'Floating tealights', 'Stone courtyard'],
      keepStationary: ['Courtyard stone pillars', 'Brass urli rims'],
      shouldMove: ['Gentle water ripples', 'Candlelight flicker', 'Swaying marigold stems'],
      cameraMovement: 'Parallax',
      grokPrompt:
        'Subtle morning courtyard parallax with shimmering water ripples inside the brass urlis and soft marigold garland motion.',
      videoStatus: 'idle',
      videoProgress: 0,
    };
  }
  if (scene.imageUrl.includes('sangeet_starlit')) {
    return {
      objectsDetected: ['Rose-gold filigree arch', 'Fairy lights', 'Evening bokeh', 'Twilight gradient'],
      keepStationary: ['Rose-gold arch perimeter'],
      shouldMove: ['Upward drifting golden bokeh', 'Gentle fairy light twinkle'],
      cameraMovement: 'Slow zoom in',
      grokPrompt:
        'Romantic twilight bokeh particles drifting softly upward inside the rose-gold Mughal arch with subtle warm shimmer.',
      videoStatus: 'idle',
      videoProgress: 0,
    };
  }
  if (scene.imageUrl.includes('reception_ivory')) {
    return {
      objectsDetected: ['White orchids', 'Champagne silk ribbon', 'Gold foil flecks', 'Deckled pearl card'],
      keepStationary: ['Pearl stationery card center'],
      shouldMove: ['Silk ribbon edge ripple', 'Gold foil light sweep'],
      cameraMovement: 'Static',
      grokPrompt:
        'Soft studio sunlight sweeping across the champagne silk ribbon and gold leaf flecks with delicate orchid petal movement.',
      videoStatus: 'idle',
      videoProgress: 0,
    };
  }

  return {
    objectsDetected: ['Blush peonies', 'Eucalyptus stems', 'Alabaster linen texture'],
    keepStationary: ['Alabaster center linen canvas'],
    shouldMove: ['Eucalyptus leaves swaying', 'Soft golden hour light'],
    cameraMovement: 'Pan left/right',
    grokPrompt:
      'Gentle watercolor breeze moving the upper and lower botanical garlands while preserving a serene still center for typography.',
    videoStatus: 'idle',
    videoProgress: 0,
  };
}

/**
 * 5. generateVideo
 * Simulates generating a looping 9:16 video clip for a scene via Grok video model.
 */
export async function generateVideo(
  scene: Scene,
  onProgress: (sceneId: string, status: AnimationPlan['videoStatus'], progress: number) => void
): Promise<Scene> {
  onProgress(scene.id, 'queued', 10);
  await delay(250);

  const steps = [30, 55, 78, 95, 100];
  for (const pct of steps) {
    onProgress(scene.id, pct === 100 ? 'done' : 'generating', pct);
    await delay(280);
  }

  return {
    ...scene,
    animationPlan: {
      ...scene.animationPlan,
      videoStatus: 'done',
      videoProgress: 100,
    },
  };
}

/**
 * 6. exportVideo
 * Simulates final 1080x1920 MP4 compositing (background video + separate crisp text layer + falling effects).
 */
export async function exportVideo(
  invitation: Invitation,
  onProgress: (progress: number, stageLabel: string) => void
): Promise<{ url: string; fileName: string; sizeMb: string }> {
  const stages = [
    { pct: 15, label: 'Rendering 1080×1920 background video clips...' },
    { pct: 40, label: 'Compositing vector typography layers...' },
    { pct: 68, label: 'Applying scene transitions & falling particle pass...' },
    { pct: 88, label: 'Encoding H.264 High Profile MP4...' },
    { pct: 100, label: 'Export ready' },
  ];

  for (const st of stages) {
    onProgress(st.pct, st.label);
    await delay(420);
  }

  const slug = invitation.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    url: `#exported-${slug || 'sky-invite'}`,
    fileName: `${slug || 'sky-invite'}-1080x1920.mp4`,
    sizeMb: `${(invitation.scenes.length * 4.6).toFixed(1)} MB`,
  };
}
