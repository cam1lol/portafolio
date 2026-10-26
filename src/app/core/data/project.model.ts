import { ProjectDetails } from './project-details';

/**
 * Mirrors the Supabase `projects` table (AGENTS.md §6), mapped from
 * snake_case to camelCase by `ProjectsService`.
 */
export interface Project extends ProjectDetails {
  id: string;
  name: string;
  type: 'web' | '3d' | 'tool';
  kind: 'front' | 'back';
  device?: 'browser' | 'phone';
  status: 'live' | 'wip' | 'archive';
  icon: string;
  typeLabel: string;
  summaryEs: string;
  summaryEn: string;
  longEs: string;
  longEn: string;
  highlightsEs: string[];
  highlightsEn: string[];
  stack: string[];
  /** Admin-only fields (not consumed by the public site rendering today). */
  previewImage?: string;
  repoUrl?: string;
  liveUrl?: string;
  /** URL segment for /proyectos/<slug>. */
  slug: string;
  /** Short looping clip (path under public/media/projects). */
  previewVideo?: string;
  /** Full walkthrough video (path under public/media/projects). */
  demoVideoUrl?: string;
  /** "Cómo está hecho": paragraphs separated by blank lines, **bold** allowed. */
  caseStudyEs: string;
  caseStudyEn: string;
}
