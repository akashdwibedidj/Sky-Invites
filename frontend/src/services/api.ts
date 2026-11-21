import { GENERATED_SCENE_IMAGES } from '../data/mockInvitations';
import {
  AnimationPlan,
  CameraMovement,
  Invitation,
  Scene,
  TextLine,
} from '../types/invitation';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Simulates LangGraph Scene Splitter + Designer + Font Specialist nodes
 * producing structured 9:16 scene blueprints with separate text layers.
 */
export async function createScenes(invitation: Invitation): Promise<Scene[]> {
  await delay(650);
  const count = Math.max(1, Math.min(12, invitation.design.sceneCount));
  const scenes: Scene[] = [];

  for (let i = 0; i < count; i++) {
    const imageUrl = getSceneImageByIndex(i, invitation.design.theme);
    const eventName =
      i === 0
        ? 'Opening Title'
        : i === count - 1 && count > 2
          ? 'RSVP & Closing'
          : invitation.details.events[(i - 1) % Math.max(1, invitation.details.events.length)]?.name ||
            `Chapter ${i + 1}`;

    scenes.push({
      id: `sc-${Date.now()}-${i + 1}`,
      order: i + 1,
      title: eventName,
      imageUrl,
      imagePrompt: `${invitation.design.theme} ${invitation.type.toLowerCase()} invitation background for "${eventName}", ${invitation.design.palette.name} palette, vertical 9:16 stationery framing with open center space for typography.`,
      imageStatus: 'pending',
      confirmed: false,
      durationSec: invitation.design.durationPerScene,
      transitionAfter: invitation.design.transition,
      textLayer: {
        lines: buildSceneLines(invitation, i, count),
        headingFont: invitation.design.headingFont,
        bodyFont: invitation.design.bodyFont,
        fontSize: 22,
        color: getSceneTextColor(imageUrl, invitation.design.palette.text),
        alignment: invitation.design.textAlignment,
        placement: invitation.design.textPlacement,
        xOffset: imageUrl.includes('reception_ivory_arch') ? 5 : 0,
        yOffset: 0,
        animation: invitation.design.textAnimation,
        sequentialDelayMs: 250,
      },
      animationPlan: buildDefaultAnimationPlan(eventName, invitation.design.theme),
    });
  }

  return scenes;
}

function buildDefaultAnimationPlan(sceneTitle: string, theme: string): AnimationPlan {
  const movementOptions: CameraMovement[] = ['Slow zoom in', 'Parallax', 'Pan left/right', 'Static'];
  const cameraMovement = movementOptions[sceneTitle.length % movementOptions.length];

  return {
    objectsDetected: [
      `${theme} framing border`,
      'Botanical floral clusters',
      'Clean central stationery canvas',
      'Ambient warm highlights',
    ],
    keepStationary: ['Center typography backdrop', 'Primary architectural columns'],
    shouldMove: ['Outer foliage & petals in soft breeze', 'Ambient light shimmer'],
    cameraMovement,
    grokPrompt: `9:16 portrait motion for "${sceneTitle}": ${cameraMovement.toLowerCase()} with delicate organic sway along the ${theme.toLowerCase()} floral borders while keeping the central typography region crisp and steady.`,
    videoStatus: 'idle',
    videoProgress: 0,
  };
}

/**
 * 2. generateImages
 * Simulates generating 9:16 background imagery either sequentially (story-driven) or in parallel.
 */
export async function generateImages(
  scenes: Scene[],
  storyDriven: boolean,
  onSceneProgress: (sceneId: string, status: Scene['imageStatus'], imageUrl?: string) => void
): Promise<Scene[]> {
  const updated = [...scenes];

  if (storyDriven) {
    for (let i = 0; i < updated.length; i++) {
      const sc = updated[i];
      onSceneProgress(sc.id, 'generating');
      await delay(580);
      updated[i] = { ...sc, imageStatus: 'done' };
      onSceneProgress(sc.id, 'done', sc.imageUrl);
    }
  } else {
    updated.forEach((sc) => onSceneProgress(sc.id, 'generating'));
    await Promise.all(
      updated.map(async (sc, idx) => {
        await delay(500 + idx * 240);
        updated[idx] = { ...sc, imageStatus: 'done' };
        onSceneProgress(sc.id, 'done', sc.imageUrl);
      })
    );
  }

  return updated;
}

/**
 * 3. regenerateImage
 * Regenerates a single scene's background artwork based on its prompt (preserving the separate TextLayer).
 */
export async function regenerateImage(scene: Scene, customPrompt?: string): Promise<Scene> {
  await delay(950);
  const currentIdx = GENERATED_SCENE_IMAGES.indexOf(scene.imageUrl);
  const nextImage = GENERATED_SCENE_IMAGES[(currentIdx + 1) % GENERATED_SCENE_IMAGES.length];

  return {
    ...scene,
    imageUrl: nextImage,
    imagePrompt: customPrompt ?? scene.imagePrompt,
    imageStatus: 'done',
    textLayer: {
      ...scene.textLayer,
      color: getSceneTextColor(nextImage, scene.textLayer.color),
    },
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
