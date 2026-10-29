import { ProjectDetails } from './project-details';

/**
 * Refleja la tabla `projects` de Supabase (AGENTS.md §6); `ProjectsService` la pasa de snake_case a camelCase.
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
  /** Campos del admin (hoy el sitio público no los usa al pintar). */
  previewImage?: string;
  repoUrl?: string;
  liveUrl?: string;
  /** Segmento de la URL /proyectos/<slug>. */
  slug: string;
  /** Clip corto en bucle (ruta bajo public/media/projects). */
  previewVideo?: string;
  /** Video completo del recorrido (ruta bajo public/media/projects). */
  demoVideoUrl?: string;
  /** "Cómo está hecho": párrafos separados por líneas en blanco, se permite **negrita**. */
  caseStudyEs: string;
  caseStudyEn: string;
}
