import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Diagnostic } from '../../core/models/diagnostic';
import { LogosService } from '../../services/logos.service';
import qrcode from 'qrcode';
import { LucideAngularModule, Download, Printer } from 'lucide-angular';

@Component({
  selector: 'app-diagnostic-report',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './diagnostic-report.component.html',
  styleUrl: './diagnostic-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticReportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly logosService = inject(LogosService);

  loading = signal<boolean>(true);
  report = signal<Diagnostic | null>(null);
  logoUrl = computed(() => this.logosService.getClientLogoUrl());
  qrCodeDataUrl = signal<string | null>(null);
  // Expose Math for template usage (ceil/slicing)
  protected readonly Math = Math;
  // Lucide icons
  protected readonly Download = Download;
  protected readonly Printer = Printer;

  id = computed<number>(() => Number(this.route.snapshot.paramMap.get('id')));

  constructor() {
    const id = this.id();
    if (Number.isFinite(id)) {
      this.api.getPublicDiagnostic(id).subscribe(res => {
        this.report.set(res.data ?? null);
        this.loading.set(false);
        if (res.data) {
          this.generateQrCode(res.data.id);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  async generateQrCode(reportId: number) {
    try {
      const reportUrl = `${window.location.origin}/diagnostics/report/${reportId}`;
      const dataUrl = await qrcode.toDataURL(reportUrl, { errorCorrectionLevel: 'H', width: 256 });
      this.qrCodeDataUrl.set(dataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      this.qrCodeDataUrl.set(null);
    }
  }

  print() {
    window.print();
  }

  downloadPdf() {
    window.print(); // Triggers print dialog, user can choose "Save as PDF"
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


