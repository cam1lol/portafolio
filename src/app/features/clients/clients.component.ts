import { Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CollectionsService } from '../../core/data/collections.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';

interface ClientLogo {
  id: string;
  name: string;
  logo: string;
  url: string;
}

/** "Trusted by" strip of client logos (admin > Clientes, migration 0012). Renders nothing when empty. */
@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [NgTemplateOutlet, RevealDirective, SiteTextPipe],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css',
})
export class ClientsComponent {
  private readonly rows = toSignal(inject(CollectionsService).getPublished('clients'), { initialValue: null });

  protected readonly clients = computed<ClientLogo[]>(() =>
    (this.rows() ?? []).map((row) => ({
      id: row.id,
      name: String(row['name'] ?? ''),
      logo: String(row['logo'] ?? ''),
      url: String(row['url'] ?? ''),
    })),
  );
}
