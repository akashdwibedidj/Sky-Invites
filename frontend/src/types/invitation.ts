export type InvitationType =
  | 'Wedding'
  | 'Engagement'
  | 'Birthday'
  | 'Baby Shower'
  | 'Anniversary'
  | 'Corporate'
  | 'Other';

export type InvitationStatus = 'Draft' | 'Generating' | 'Ready';

export type ThemeStyle =
  | 'Royal'
  | 'Traditional'
  | 'Minimal'
  | 'Floral'
  | 'Watercolor'
  | 'Modern'
  | 'Rustic'
  | 'Vintage';

export type PageTransition =
  | 'Fade'
  | 'Slide'
  | 'Zoom'
  | 'Page Flip'
  | 'Dissolve'
  | 'Curtain';

export type FallingEffect =
  | 'Flower petals'
  | 'Leaves'
  | 'Sparkles'
  | 'Confetti'
  | 'Snow'
  | 'None';

export type TextAnimation =
  | 'Fade-in'
  | 'Typewriter'
  | 'Slide-up'
  | 'Word-by-word';

export type TextPlacement = 'top' | 'center' | 'bottom';
export type TextAlignment = 'left' | 'center' | 'right';

export type CameraMovement =
  | 'Slow zoom in'
  | 'Pan left/right'
  | 'Parallax'
  | 'Static';

export type ScreenRoute =
  | 'dashboard'
  | 'create-type'
  | 'step-1-details'
  | 'step-2-design'
  | 'generating'
  | 'step-3-review'
  | 'step-4-animation'
  | 'step-5-compose'
  | 'step-6-export';

export interface EventDate {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
}

export interface ReferencePhoto {
  id: string;
  name: string;
  url: string;
}

export interface InvitationDetails {
  brideName: string;
  groomName: string;
  brideParents: string;
  groomParents: string;
  honoreeName: string;
  hostName: string;
  events: EventDate[];
  message: string;
  referencePhotos: ReferencePhoto[];
}

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

export interface DesignPreferences {
  sceneCount: number;
  transition: PageTransition;
  fallingEffects: FallingEffect[];
  fallingEffectIntensity: number; // 0 to 100
  theme: ThemeStyle;
  palette: ColorPalette;
  textPlacement: TextPlacement;
  textAlignment: TextAlignment;
  headingFont: string;
  bodyFont: string;
  textAnimation: TextAnimation;
  durationPerScene: number; // 3 to 8 seconds
  musicMood: string;
  storyDriven: boolean; // true = one after another, false = parallel
}

export interface TextLine {
  id: string;
  role: 'kicker' | 'heading' | 'subheading' | 'detail' | 'footer';
  text: string;
}

export interface TextLayer {
  lines: TextLine[];
  headingFont: string;
  bodyFont: string;
  fontSize: number; // multiplier or base px in 9:16 preview (e.g., 14-32)
  color: string;
  alignment: TextAlignment;
  placement: TextPlacement;
  xOffset: number; // percentage offset -35 to 35
  yOffset: number; // percentage offset -40 to 40
  animation: TextAnimation;
  sequentialDelayMs: number; // delay between lines in ms
}

export interface AnimationPlan {
  objectsDetected: string[];
  keepStationary: string[];
  shouldMove: string[];
  cameraMovement: CameraMovement;
  grokPrompt: string;
  videoStatus: 'idle' | 'queued' | 'generating' | 'done';
  videoProgress: number;
}

export interface Scene {
  id: string;
  order: number;
  title: string;
  imageUrl: string;
  imagePrompt: string;
  imageStatus: 'pending' | 'generating' | 'done';
  confirmed: boolean;
  durationSec: number;
  transitionAfter: PageTransition;
  textLayer: TextLayer;
  animationPlan: AnimationPlan;
}

export interface Invitation {
  id: string;
  title: string;
  type: InvitationType;
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
  details: InvitationDetails;
  design: DesignPreferences;
  scenes: Scene[];
  exportedVideoUrl?: string;
}

export type AgentStatus = 'waiting' | 'running' | 'done';

export interface AgentPipelineNode {
  id: string;
  label: string;
  role: string;
  status: AgentStatus;
  log: string;
  parallelGroup?: boolean;
}
