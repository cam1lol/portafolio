import { Component, OnInit, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';

interface DashboardStats {
  visits30d: number | null;
  commentsTotal: number | null;
  commentsPending: number | null;
  projectsPublished: number | null;
  projectsTotal: number | null;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
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
  });

  ngOnInit(): void {
    this.loadStats();
  }

  private async loadStats(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [visits30d, commentsTotal, commentsPending, projectsPublished, projectsTotal] = await Promise.all([
      this.count(this.supabase.client.from('visits').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo)),
      this.count(this.supabase.client.from('comments').select('*', { count: 'exact', head: true })),
      this.count(this.supabase.client.from('comments').select('*', { count: 'exact', head: true }).eq('approved', false)),
      this.count(this.supabase.client.from('projects').select('*', { count: 'exact', head: true }).eq('published', true)),
      this.count(this.supabase.client.from('projects').select('*', { count: 'exact', head: true })),
    ]);

    this.stats.set({ visits30d, commentsTotal, commentsPending, projectsPublished, projectsTotal });
    this.loading.set(false);
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
