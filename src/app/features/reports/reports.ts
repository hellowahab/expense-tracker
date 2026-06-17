import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  viewChild,
  DestroyRef,
} from '@angular/core';
import { ExpenseStore } from '../../store/expense.store';
import {
  Chart,
  DoughnutController,
  BarController,
  LineController,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

// Register only the Chart.js pieces we actually use (tree-shakeable).
Chart.register(
  DoughnutController,
  BarController,
  LineController,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

// Brand indigo (matches the nav logo + active link).
const BRAND = '#4f46e5';

// Fixed colour per category so each slice stays consistent run to run.
const CATEGORY_COLORS: Record<string, string> = {
  Food:          '#4f46e5',
  Transport:     '#7c3aed',
  Shopping:      '#ec4899',
  Bills:         '#f59e0b',
  Health:        '#10b981',
  Entertainment: '#3b82f6',
  Other:         '#6b7280',
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [],
  templateUrl: './reports.html',
})
export class ReportsComponent {

  private store = inject(ExpenseStore);

  // store signals
  spendByCategory = this.store.spendByCategory;
  monthlyTotals   = this.store.monthlyTotals;
  dailyTotals     = this.store.dailyTotals;
  isLoading       = this.store.isLoading;
  error           = this.store.error;

  // empty-state flags the template uses to show a message instead of a canvas
  hasCategoryData = computed(() =>
    Object.values(this.spendByCategory()).some(v => v > 0));
  hasMonthlyData  = computed(() =>
    this.monthlyTotals().some(m => m.total > 0));
  hasDailyData    = computed(() =>
    this.dailyTotals().some(d => d.total > 0));

  // canvas refs — optional() because each lives inside an @if block
  private categoryCanvas = viewChild<ElementRef<HTMLCanvasElement>>('categoryCanvas');
  private monthlyCanvas  = viewChild<ElementRef<HTMLCanvasElement>>('monthlyCanvas');
  private dailyCanvas    = viewChild<ElementRef<HTMLCanvasElement>>('dailyCanvas');

  private categoryChart?: Chart;
  private monthlyChart?: Chart;
  private dailyChart?: Chart;

  constructor() {
    // one effect per chart — each re-runs only when its own data/canvas changes
    effect(() => this.renderCategoryChart());
    effect(() => this.renderMonthlyChart());
    effect(() => this.renderDailyChart());

    // tear every instance down on route leave so re-navigating doesn't
    // hit Chart.js's "Canvas is already in use" or leak instances
    inject(DestroyRef).onDestroy(() => {
      this.categoryChart?.destroy();
      this.monthlyChart?.destroy();
      this.dailyChart?.destroy();
    });
  }

  // ── 1. Spending by category — doughnut
  private renderCategoryChart() {
    const data = this.spendByCategory();
    const ref  = this.categoryCanvas();

    // no canvas (empty state) or no data → drop any existing chart and bail
    if (!ref || !this.hasCategoryData()) {
      this.categoryChart?.destroy();
      this.categoryChart = undefined;
      return;
    }

    const labels = Object.keys(data);
    const values = labels.map(l => data[l]);
    const colors = labels.map(l => CATEGORY_COLORS[l] ?? BRAND);

    if (this.categoryChart) {
      this.categoryChart.data.labels = labels;
      this.categoryChart.data.datasets[0].data = values;
      this.categoryChart.data.datasets[0].backgroundColor = colors;
      this.categoryChart.update();
      return;
    }

    this.categoryChart = new Chart(ref.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  // ── 2. Monthly totals — bar
  private renderMonthlyChart() {
    const rows = this.monthlyTotals();
    const ref  = this.monthlyCanvas();

    if (!ref || !this.hasMonthlyData()) {
      this.monthlyChart?.destroy();
      this.monthlyChart = undefined;
      return;
    }

    const labels = rows.map(r => this.monthLabel(r.month));
    const values = rows.map(r => r.total);

    if (this.monthlyChart) {
      this.monthlyChart.data.labels = labels;
      this.monthlyChart.data.datasets[0].data = values;
      this.monthlyChart.update();
      return;
    }

    this.monthlyChart = new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: BRAND, borderRadius: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // ── 3. Daily spending this month — line
  private renderDailyChart() {
    const rows = this.dailyTotals();
    const ref  = this.dailyCanvas();

    if (!ref || !this.hasDailyData()) {
      this.dailyChart?.destroy();
      this.dailyChart = undefined;
      return;
    }

    const labels = rows.map(r => Number(r.day.slice(8))); // day-of-month number
    const values = rows.map(r => r.total);

    if (this.dailyChart) {
      this.dailyChart.data.labels = labels;
      this.dailyChart.data.datasets[0].data = values;
      this.dailyChart.update();
      return;
    }

    this.dailyChart = new Chart(ref.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: BRAND,
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // "2026-06" → "Jun" for the bar-chart axis
  private monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
  }
}
