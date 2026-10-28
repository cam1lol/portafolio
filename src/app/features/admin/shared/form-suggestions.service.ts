import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ProjectsService } from '../../../core/data/projects.service';
import { ExperienceService } from '../../../core/data/experience.service';
import { CollectionsService } from '../../../core/data/collections.service';

export interface FormSuggestions {
  /** Addresses already used, to keep each project's /proyectos/<slug> unique. */
  slugs: { id: string; slug: string }[];
  stack: string[];
  typeLabels: string[];
  rolesEs: string[];
  rolesEn: string[];
  teams: string[];
  durationsEs: string[];
  durationsEn: string[];
  clients: string[];
  languages: string[];
}

const EMPTY: FormSuggestions = { slugs: [], stack: [], typeLabels: [], rolesEs: [], rolesEn: [], teams: [], durationsEs: [], durationsEn: [], clients: [], languages: [] };

/**
 * What the admin already wrote elsewhere, offered back as suggestions so the forms are mostly
 * choosing instead of typing: technologies (projects, experience, ticker), type labels, roles,
 * team sizes, durations, clients and code languages. Only real values from your own data, most
 * used first. Loaded once per session and refreshed after saving.
 */
@Injectable({ providedIn: 'root' })
export class FormSuggestionsService {
  private readonly projects = inject(ProjectsService);
  private readonly experience = inject(ExperienceService);
  private readonly collections = inject(CollectionsService);

  readonly suggestions = signal<FormSuggestions>(EMPTY);
  private loaded = false;

  load(force = false): void {
    if (this.loaded && !force) return;
    this.loaded = true;
    forkJoin({
      projects: this.projects.getAll().pipe(catchError(() => of([]))),
      experience: this.experience.getAll().pipe(catchError(() => of([]))),
      ticker: this.collections.getAll('ticker_items').pipe(catchError(() => of([]))),
    }).subscribe(({ projects, experience, ticker }) => {
      this.suggestions.set({
        slugs: projects.map((p) => ({ id: p.id, slug: p.slug })),
        stack: rank([...projects.flatMap((p) => p.stack), ...experience.flatMap((e) => e.stack), ...ticker.map((t) => String(t['label'] ?? ''))]),
        typeLabels: rank(projects.map((p) => p.typeLabel)),
        rolesEs: rank(projects.map((p) => p.facts.roleEs)),
        rolesEn: rank(projects.map((p) => p.facts.roleEn)),
        teams: rank(projects.map((p) => p.facts.team)),
        durationsEs: rank(projects.map((p) => p.facts.durationEs)),
        durationsEn: rank(projects.map((p) => p.facts.durationEn)),
        clients: rank(projects.map((p) => p.facts.client)),
        languages: rank(projects.flatMap((p) => p.chapters.filter((c) => c.type === 'code').map((c) => c.language))),
      });
    });
  }
}

/** Distinct values (case-insensitive, first spelling kept), most frequent first, then alphabetical. */
export function rank(values: string[]): string[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const raw of values) {
    const value = (raw ?? '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.count++;
    else counts.set(key, { value, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)).map((entry) => entry.value);
}
