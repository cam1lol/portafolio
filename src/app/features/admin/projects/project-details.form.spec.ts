import { FormGroup } from '@angular/forms';
import { detailControls, fillToCount, moveItem, patchDetails, readDetails, screenGroup, videoGroup } from './project-details.form';
import { emptyDetails } from '../../../core/data/project-details';

describe('project details form', () => {
  it('carga y vuelve a leer los detalles sin perder nada', () => {
    const controls = detailControls();
    const details = {
      ...emptyDetails(),
      featured: true,
      facts: { ...emptyDetails().facts, year: '2025', roleEs: 'Full-stack' },
      screens: [{ titleEs: 'Inicio', titleEn: 'Home', descEs: '', descEn: '', video: '/v.mp4', image: '' }],
      improvements: [{ textEs: 'Offline', textEn: 'Offline', status: 'in_progress' as const }],
    };
    patchDetails(controls, details);
    expect(readDetails(controls)).toEqual(details);
  });

  it('cuántos videos: crea los espacios que faltan y nunca borra los existentes', () => {
    const { videos } = detailControls();
    expect(fillToCount(videos, 3, videoGroup)).toBe(3);
    videos.at(0).controls.video.setValue('/media/projects/x/a.mp4');
    expect(fillToCount(videos, 1, videoGroup)).toBe(0);
    expect(videos.length).toBe(3);
    expect(videos.at(0).controls.video.value).toBe('/media/projects/x/a.mp4');
    expect(fillToCount(videos, 99, videoGroup)).toBe(27); // capped at 30
  });

  it('mueve un elemento y marca la lista como modificada', () => {
    const controls = detailControls();
    const form = new FormGroup({ screens: controls.screens });
    for (const title of ['A', 'B', 'C']) controls.screens.push(screenGroup({ titleEs: title, titleEn: '', descEs: '', descEn: '', video: '', image: '' }));
    moveItem(controls.screens, 0, 1);
    expect(controls.screens.getRawValue().map((s) => s.titleEs)).toEqual(['B', 'A', 'C']);
    moveItem(controls.screens, 0, -1); // first item cannot go up
    expect(controls.screens.getRawValue().map((s) => s.titleEs)).toEqual(['B', 'A', 'C']);
    expect(form.dirty).toBeTrue();
  });
});
