import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Diagnostic } from '../../core/models/diagnostic';

@Component({
  selector: 'app-diagnostic-report',
  imports: [CommonModule],
  templateUrl: './diagnostic-report.component.html',
  styleUrl: './diagnostic-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticReportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  loading = signal<boolean>(true);
  report = signal<Diagnostic | null>(null);
  // Expose Math for template usage (ceil/slicing)
  protected readonly Math = Math;

  id = computed<number>(() => Number(this.route.snapshot.paramMap.get('id')));

  constructor() {
    const id = this.id();
    if (Number.isFinite(id)) {
      this.api.getPublicDiagnostic(id).subscribe(res => {
        this.report.set(res.data ?? null);
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }
  }

  print() {
    window.print();
  }

  protected parseList(v: string | null): string[] {
    if (!v) return [];
    const s = String(v).trim();
    if (!s) return [];
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map(x => String(x)).filter(Boolean);
    } catch {}
    return s.split(/[;,]/g).map(x => x.trim()).filter(Boolean);
  }
}


