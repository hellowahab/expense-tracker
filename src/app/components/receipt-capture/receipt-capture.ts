import { Component, inject, signal, computed, output } from '@angular/core';
import { ReceiptOcrService } from '../../services/receipt-ocr.service';
import { parseReceipt } from '../../utils/receipt-parser';
import { ParsedExpense } from '../../utils/voice-parser';

@Component({
  selector: 'app-receipt-capture',
  standalone: true,
  templateUrl: './receipt-capture.html',
})
export class ReceiptCaptureComponent {

  private ocr = inject(ReceiptOcrService);

  // ── Emits once OCR + parsing finish; the parent shows the shared
  //    confirmation card with this result.
  parsed = output<ParsedExpense>();

  // ── Service signals (read-only) — loading + progress + error
  isScanning = this.ocr.isScanning;
  progress   = this.ocr.progress;       // 0..1 during recognition
  ocrError   = this.ocr.error;

  // ── Whole-number percent for the progress bar label
  progressPercent = computed(() => Math.round(this.progress() * 100));

  // ── Local UI-only state: the object URL for the preview image
  previewUrl = signal<string | null>(null);
  private selectedFile: File | null = null;

  // ── A photo was captured (mobile) or chosen (desktop)
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.revokePreview();
    this.selectedFile = file;
    this.previewUrl.set(URL.createObjectURL(file));

    // reset the input so re-picking the same file still fires (change)
    input.value = '';
  }

  // ── Run OCR on the previewed image, then emit the parsed result
  async readReceipt(): Promise<void> {
    if (!this.selectedFile || this.isScanning()) return;
    try {
      const text = await this.ocr.recognize(this.selectedFile);
      this.parsed.emit(parseReceipt(text));
    } catch {
      // error is surfaced via ocrError() — nothing to do here
    }
  }

  // ── Discard the current photo and start over
  clear(): void {
    this.revokePreview();
    this.previewUrl.set(null);
    this.selectedFile = null;
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
