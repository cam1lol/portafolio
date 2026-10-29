import { Project } from '../../../core/data/project.model';

/** Paso del formulario de proyectos donde se arregla un pendiente (ids de AdminProjectFormComponent.steps). */
export type GapStep = 'step-card' | 'step-story' | 'step-facts';

export interface ProjectGap {
  id: string;
  label: string;
  step: GapStep;
}

const has = (text: string | null | undefined) => !!text?.trim();

/** Textos en español rellenos cuyo lado en inglés sigue vacío. */
function missingEnglish(pairs: [string, string][]): number {
  return pairs.filter(([es, en]) => has(es) && !has(en)).length;
}

/**
 * Lo que le falta a un proyecto para verse completo en el sitio, cada cosa con el paso que la arregla.
 * Solo lo que nota un visitante: los extras opcionales (videos, capítulos, versiones...) no cuentan.
 */
export function projectGaps(p: Project): ProjectGap[] {
  const gaps: ProjectGap[] = [];
  const storyFilled = Object.values(p.story).some(has);

  if (!has(p.previewImage) && !has(p.previewVideo)) gaps.push({ id: 'cover', label: 'Sin imagen de tarjeta', step: 'step-card' });
  if (!has(p.liveUrl) && !has(p.repoUrl)) gaps.push({ id: 'links', label: 'Sin enlace a demo ni a código', step: 'step-card' });
  if (!has(p.summaryEs)) gaps.push({ id: 'summary', label: 'Sin resumen', step: 'step-story' });
  if (!storyFilled && !has(p.caseStudyEs)) gaps.push({ id: 'story', label: 'Sin caso de estudio', step: 'step-story' });

  const storyEn =
    missingEnglish([
      [p.summaryEs, p.summaryEn],
      [p.longEs, p.longEn],
      [p.caseStudyEs, p.caseStudyEn],
      [p.story.challengeEs, p.story.challengeEn],
      [p.story.approachEs, p.story.approachEn],
      [p.story.outcomeEs, p.story.outcomeEn],
    ]) + Math.max(0, p.highlightsEs.length - p.highlightsEn.filter(has).length);
  if (storyEn) gaps.push({ id: 'en-story', label: `Falta inglés en Historia (${storyEn})`, step: 'step-story' });

  if (!Object.values(p.facts).some(has)) gaps.push({ id: 'facts', label: 'Sin ficha (año, rol, cliente)', step: 'step-facts' });
  if (!p.results.length) gaps.push({ id: 'results', label: 'Sin resultados con cifras', step: 'step-facts' });

  const factsEn = missingEnglish([
    [p.facts.durationEs, p.facts.durationEn],
    [p.facts.roleEs, p.facts.roleEn],
    ...p.results.flatMap((r): [string, string][] => [
      [r.labelEs, r.labelEn],
      [r.contextEs, r.contextEn],
    ]),
  ]);
  if (factsEn) gaps.push({ id: 'en-facts', label: `Falta inglés en Ficha y cifras (${factsEn})`, step: 'step-facts' });

  return gaps;
}
