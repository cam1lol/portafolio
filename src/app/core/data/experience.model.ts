/**
 * Refleja la tabla `experience` de Supabase (AGENTS.md §6); `ExperienceService` la pasa de snake_case a camelCase.
 */
export interface Experience {
  id: string;
  company: string;
  roleEs: string;
  roleEn: string;
  periodEs: string;
  periodEn: string;
  tagEs: string;
  tagEn: string;
  isCurrent: boolean;
  summaryEs: string;
  summaryEn: string;
  pointsEs: string[];
  pointsEn: string[];
  stack: string[];
  subprojects?: { name: string; descEs: string; descEn: string }[];
}
