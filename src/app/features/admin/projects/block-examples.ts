import { Project } from '../../../core/data/project.model';
import { ChapterType, ProjectChapter, emptyChapter } from '../../../core/data/project-details';

/**
 * Example content for the admin's "¿Cómo se ve?": only used when a section is still empty, always
 * shown with an EJEMPLO tag, never saved. Generic texts that explain the block, no invented facts.
 */
const IMAGE = '/og.png';

export function exampleChapter(type: ChapterType): ProjectChapter {
  const base = emptyChapter(type);
  switch (type) {
    case 'text':
      return { ...base, titleEs: 'Un título que abre el capítulo', bodyEs: 'Aquí cuentas una parte del proyecto con tus palabras. Las líneas suben una a una al aparecer.\n\nDeja una línea en blanco entre párrafos y usa **negrita** para lo importante.' };
    case 'image':
      return { ...base, media: IMAGE, altEs: 'Imagen de ejemplo', captionEs: 'Pie de foto: qué se ve en la imagen' };
    case 'compare':
      return { ...base, media: IMAGE, mediaAfter: IMAGE, captionEs: 'Desliza para comparar el antes y el después' };
    case 'quote':
      return { ...base, bodyEs: 'Una frase destacada de alguien que usó el proyecto, con su permiso.', author: 'Nombre · cargo' };
    case 'code':
      return { ...base, language: 'ts', code: "const project = signal('portafolio');\nconst title = computed(() => project().toUpperCase());", captionEs: 'Un fragmento que explique una decisión técnica' };
    case 'model':
      return { ...base, captionEs: 'Tu modelo 3D girando: elígelo de la biblioteca' };
  }
}

/** Sections that can show an example, with what fills them when they are empty. */
export const EXAMPLE_SECTIONS = ['s-story', 's-results', 's-chapters', 's-videos', 's-screens', 's-gallery', 's-extras'] as const;
export type ExampleSection = (typeof EXAMPLE_SECTIONS)[number];

/** Whether the project already has its own content for the section. */
export function hasSection(project: Project, section: ExampleSection): boolean {
  switch (section) {
    case 's-story': return Object.values(project.story).some((value) => value.trim());
    case 's-results': return project.results.some((r) => r.value.trim());
    case 's-chapters': return project.chapters.length > 0;
    case 's-videos': return project.videos.some((v) => v.video.trim());
    case 's-screens': return project.screens.some((s) => s.video.trim() || s.image.trim());
    case 's-gallery': return project.gallery.some((g) => g.image.trim());
    case 's-extras': return project.improvements.length + project.docs.length + project.versions.length > 0;
  }
}

/** The project as-is if the section has content, else with example content for that section only. */
export function withExample(project: Project, section: ExampleSection): { project: Project; isExample: boolean } {
  if (hasSection(project, section)) return { project, isExample: false };
  const p: Project = { ...project };
  switch (section) {
    case 's-story':
      p.story = { challengeEs: 'Qué problema había y por qué importaba.', challengeEn: '', approachEs: 'Cómo lo abordaste: decisiones y tecnología.', approachEn: '', outcomeEs: 'Qué se logró al final.', outcomeEn: '' };
      break;
    case 's-results':
      p.results = [
        { value: '00 %', labelEs: 'Lo que mide la cifra', labelEn: '', contextEs: 'Una línea de contexto. Usa solo datos reales.', contextEn: '' },
        { value: '0x', labelEs: 'Otra cifra', labelEn: '', contextEs: '', contextEn: '' },
      ];
      break;
    case 's-chapters':
      p.chapters = [exampleChapter('text'), exampleChapter('image'), exampleChapter('code')];
      break;
    case 's-videos':
      p.videos = [{ titleEs: 'Título del video', titleEn: '', descEs: 'Qué muestra este video.', descEn: '', video: '', poster: IMAGE, preview: '', duration: '1:30' }];
      break;
    case 's-screens':
      p.screens = [
        { titleEs: 'Inicio', titleEn: '', descEs: 'Qué se ve en esta pantalla.', descEn: '', video: '', image: IMAGE },
        { titleEs: 'Panel', titleEn: '', descEs: 'Otra vista de la web.', descEn: '', video: '', image: IMAGE },
      ];
      break;
    case 's-gallery':
      p.gallery = [1, 2, 3].map((n) => ({ image: IMAGE, captionEs: `Foto ${n}`, captionEn: '' }));
      break;
    case 's-extras':
      p.improvements = [{ textEs: 'Una mejora que tienes en mente', textEn: '', status: 'planned' }];
      p.versions = [{ version: 'v1.0', date: '', notesEs: 'Primera versión publicada.', notesEn: '' }];
      break;
  }
  return { project: p, isExample: true };
}
