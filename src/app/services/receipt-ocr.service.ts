import { Injectable, signal } from '@angular/core';
import { createWorker, type Worker } from 'tesseract.js';

// ── Self-hosted Tesseract assets live in public/tesseract/ (copied from
//    node_modules at install time). They are resolved relative to the page's
//    <base href> via document.baseURI so the URLs are correct in BOTH
//    environments without hardcoding the subpath:
//      • dev   → http://localhost:4200/tesseract/...
//      • prod  → https://hellowahab.github.io/expense-tracker/tesseract/...
//    This is the GitHub-Pages path-safety trick — never use absolute "/tesseract/".
const ASSET_BASE = new URL('tesseract/', document.baseURI).href;
const WORKER_PATH = `${ASSET_BASE}worker.min.js`;
// Pinned to a single SIMD + LSTM core file (ends in .js → Tesseract loads it
// verbatim instead of probing the directory for CPU-feature variants, which
// avoids 404s on the subpath). SIMD is supported by every modern browser and
// by the Capacitor WebViews we're targeting next.
const CORE_PATH = `${ASSET_BASE}tesseract-core-simd-lstm.wasm.js`;
// Folder only — Tesseract appends "/eng.traineddata.gz" itself.
const LANG_PATH = ASSET_BASE.replace(/\/$/, '') + '/lang';
const LANG = 'eng';

@Injectable({ providedIn: 'root' })
export class ReceiptOcrService {

  // ── Private writable state
  private _isScanning = signal(false);
  private _progress   = signal(0);          // 0..1 during recognition
  private _error      = signal<string | null>(null);

  // ── Public read-only signals — consumers read, never mutate
  readonly isScanning = this._isScanning.asReadonly();
  readonly progress   = this._progress.asReadonly();
  readonly error      = this._error.asReadonly();

  // ── The worker is expensive to spin up (loads ~3 MB WASM core + ~10 MB
  //    language data), so create it once and reuse it across scans.
  private worker: Worker | null = null;

  // ── Run OCR on an image (File/Blob from a file input or camera capture)
  //    and return the raw recognized text. Extracting amount/date from that
  //    text is the caller's job — this service only does the OCR plumbing.
  async recognize(image: File | Blob | string): Promise<string> {
    this._error.set(null);
    this._progress.set(0);
    this._isScanning.set(true);
    try {
      const worker = await this.getWorker();
      const { data } = await worker.recognize(image);
      return data.text;
    } catch (err) {
      this._error.set('Could not read the receipt. Please try a clearer, well-lit photo.');
      throw err;
    } finally {
      this._isScanning.set(false);
    }
  }

  // ── Lazily create the worker with our self-hosted, base-href-aware paths
  private async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    this.worker = await createWorker(LANG, 1 /* OEM.LSTM_ONLY */, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (m) => {
        if (m.status === 'recognizing text') this._progress.set(m.progress);
      },
    });
    return this.worker;
  }

  // ── Free the worker and its memory (call when leaving the scan screen)
  async terminate(): Promise<void> {
    await this.worker?.terminate();
    this.worker = null;
  }
}
