/**
 * Mirrors the Supabase `experience` table (AGENTS.md §6), mapped from
 * snake_case to camelCase by `ExperienceService`.
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
