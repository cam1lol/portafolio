import { Component, computed, input, signal } from '@angular/core';

export interface DayCount {
  /** Local date, YYYY-MM-DD. */
  date: string;
  count: number;
}

function localKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** One entry per day (oldest first, ending today), counting visits by the viewer's local date. */
export function bucketVisitsByDay(timestamps: string[], days: number, today = new Date()): DayCount[] {
  const buckets: DayCount[] = [];
  const index = new Map<string, number>();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    index.set(localKey(date), buckets.length);
    buckets.push({ date: localKey(date), count: 0 });
  }
  for (const timestamp of timestamps) {
    const position = index.get(localKey(new Date(timestamp)));
    if (position !== undefined) buckets[position].count++;
  }
  return buckets;
}

const WIDTH = 600;
const BASELINE = 150;
const PLOT_TOP = 30;
const GAP = 2;
const RADIUS = 4;

interface Bar {
  day: DayCount;
  x: number;
  width: number;
  path: string;
}

const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const longDateFormat = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' });

function parseDay(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Single-series bar chart of daily visits (ember bars, text in ink tokens, hover tooltip, table view). */
@Component({
  selector: 'app-visits-chart',
  standalone: true,
  templateUrl: './visits-chart.component.html',
  styleUrl: './visits-chart.component.css',
})
export class VisitsChartComponent {
  readonly days = input.required<DayCount[]>();

  protected readonly width = WIDTH;
  protected readonly baseline = BASELINE;
  protected readonly hovered = signal<number | null>(null);

  protected readonly total = computed(() => this.days().reduce((sum, day) => sum + day.count, 0));
  protected readonly peakIndex = computed(() => {
    const days = this.days();
    let best = -1;
    days.forEach((day, i) => {
      if (day.count > 0 && (best === -1 || day.count > days[best].count)) best = i;
    });
    return best;
  });

  protected readonly bars = computed<Bar[]>(() => {
    const days = this.days();
    const max = Math.max(1, ...days.map((day) => day.count));
    const width = (WIDTH - GAP * (days.length - 1)) / days.length;
    return days.map((day, i) => {
      const x = i * (width + GAP);
      const height = (day.count / max) * (BASELINE - PLOT_TOP);
      return { day, x, width, path: this.barPath(x, width, height) };
    });
  });

  protected readonly axisLabels = computed(() => {
    const bars = this.bars();
    if (bars.length === 0) return [];
    return [0, Math.floor(bars.length / 2), bars.length - 1].map((i) => ({
      x: bars[i].x + bars[i].width / 2,
      text: dateFormat.format(parseDay(bars[i].day.date)),
    }));
  });

  protected readonly tooltip = computed(() => {
    const i = this.hovered();
    const bar = i === null ? undefined : this.bars()[i];
    if (!bar) return null;
    return {
      left: ((bar.x + bar.width / 2) / WIDTH) * 100,
      date: longDateFormat.format(parseDay(bar.day.date)),
      count: bar.day.count,
    };
  });

  protected formatDay(key: string): string {
    return longDateFormat.format(parseDay(key));
  }

  protected peakText(): string {
    const i = this.peakIndex();
    if (i < 0) return 'Todavía no hay visitas registradas';
    const day = this.days()[i];
    return `Día con más: ${dateFormat.format(parseDay(day.date))} (${day.count})`;
  }

  /** Rounded top (the data end), square bottom anchored to the baseline. */
  private barPath(x: number, width: number, height: number): string {
    if (height <= 0) return '';
    const r = Math.min(RADIUS, width / 2, height);
    const top = BASELINE - height;
    return `M${x},${BASELINE}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${BASELINE}Z`;
  }
}
