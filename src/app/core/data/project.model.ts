/**
 * Mirrors the Supabase `projects` table (AGENTS.md §6), mapped from
 * snake_case to camelCase by `ProjectsService`.
 */
export interface Project {
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
}
