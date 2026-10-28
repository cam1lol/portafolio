import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DayCount, VisitsChartComponent, bucketVisitsByDay } from './visits-chart.component';
import { ProjectStatsComponent } from './project-stats.component';
import { TOPIC_LABELS } from '../../../core/data/inbox.service';
import { AdminPageHeaderComponent } from '../shared/admin-page-header.component';
import { SupabaseService } from '../../../core/supabase/supabase.service';

interface DashboardStats {
  visits30d: number | null;
  commentsTotal: number | null;
  commentsPending: number | null;
  projectsPublished: number | null;
  projectsTotal: number | null;
  messagesNew: number | null;
}

interface RecentMessage {
  id: string;
  name: string;
  topic: keyof typeof TOPIC_LABELS;
  status: string;
  created_at: string;
}

interface RecentComment {
  id: string;
  author: string;
  body: string;
  approved: boolean;
  created_at: string;
}

interface LanguageSplit {
  es: number | null;
  en: number | null;
}

interface LanguageRow {
  label: string;
  es: number;
  en: number;
  esShare: number;
  enShare: number;
  /** Rows recorded before migration 0006 (or with no language) are reported apart. */
  untagged: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AdminPageHeaderComponent, RouterLink, DatePipe, VisitsChartComponent, ProjectStatsComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  protected readonly loading = signal(true);
  protected readonly stats = signal<DashboardStats>({
    visits30d: null,
    commentsTotal: null,
    commentsPending: null,
    projectsPublished: null,
    projectsTotal: null,
    messagesNew: null,
  });
  protected readonly topicLabels = TOPIC_LABELS;
  protected readonly daily = signal<DayCount[]>(bucketVisitsByDay([], 30));
  protected readonly recentMessages = signal<RecentMessage[]>([]);
  protected readonly recentComments = signal<RecentComment[]>([]);
  private readonly visitsByLang = signal<LanguageSplit>({ es: null, en: null });
  private readonly commentsByLang = signal<LanguageSplit>({ es: null, en: null });

  protected readonly languageRows = computed<LanguageRow[]>(() => [
    this.toRow('Visitas (30 días)', this.visitsByLang(), this.stats().visits30d),
    this.toRow('Comentarios', this.commentsByLang(), this.stats().commentsTotal),
  ]);

  /** "ES", "EN" or "—" when there is no tagged data yet. */
  protected readonly topLanguage = computed(() => {
    const { es, en } = this.visitsByLang();
    if (!es && !en) return '—';
    return (es ?? 0) >= (en ?? 0) ? 'ES' : 'EN';
  });

  ngOnInit(): void {
    this.loadStats();
    this.loadActivity();
  }

  /** Daily visits for the chart plus the latest messages and comments. Failures just leave them empty. */
  private async loadActivity(): Promise<void> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [visits, messages, comments] = await Promise.all([
      this.supabase.client.from('visits').select('created_at').gte('created_at', since).limit(20000),
      this.supabase.client.from('contact_threads').select('id, name, topic, status, created_at').order('created_at', { ascending: false }).limit(5),
      this.supabase.client.from('comments').select('id, author, body, approved, created_at').order('created_at', { ascending: false }).limit(5),
    ]);
    if (!visits.error) this.daily.set(bucketVisitsByDay((visits.data ?? []).map((row) => row.created_at as string), 30));
    if (!messages.error) this.recentMessages.set((messages.data ?? []) as RecentMessage[]);
    if (!comments.error) this.recentComments.set((comments.data ?? []) as RecentComment[]);
  }

  private async loadStats(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const visits = () => this.supabase.client.from('visits').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo);
    const comments = () => this.supabase.client.from('comments').select('*', { count: 'exact', head: true });

    const [visits30d, commentsTotal, commentsPending, projectsPublished, projectsTotal, visitsEs, visitsEn, commentsEs, commentsEn, messagesNew] =
      await Promise.all([
        this.count(visits()),
        this.count(comments()),
        this.count(comments().eq('approved', false)),
        this.count(this.supabase.client.from('projects').select('*', { count: 'exact', head: true }).eq('published', true)),
        this.count(this.supabase.client.from('projects').select('*', { count: 'exact', head: true })),
        this.count(visits().eq('lang', 'es')),
        this.count(visits().eq('lang', 'en')),
        this.count(comments().eq('lang', 'es')),
        this.count(comments().eq('lang', 'en')),
        this.count(this.supabase.client.from('contact_threads').select('id', { count: 'exact', head: true }).eq('status', 'new')),
      ]);

    this.stats.set({ visits30d, commentsTotal, commentsPending, projectsPublished, projectsTotal, messagesNew });
    this.visitsByLang.set({ es: visitsEs, en: visitsEn });
    this.commentsByLang.set({ es: commentsEs, en: commentsEn });
    this.loading.set(false);
  }

  private toRow(label: string, split: LanguageSplit, total: number | null): LanguageRow {
    const es = split.es ?? 0;
    const en = split.en ?? 0;
    const tagged = es + en;
    return {
      label,
      es,
      en,
      esShare: tagged ? Math.round((es / tagged) * 100) : 0,
      enShare: tagged ? Math.round((en / tagged) * 100) : 0,
      untagged: Math.max(0, (total ?? 0) - tagged),
    };
  }

  private async count(
    query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
  ): Promise<number | null> {
    const { count, error } = await query;
    if (error) {
      console.error('Failed to load dashboard stat from Supabase', error);
      return null;
    }
    return count;
  }
}
