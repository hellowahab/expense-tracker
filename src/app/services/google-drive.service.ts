import { inject, Injectable, NgZone, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { ExpenseStore } from '../store/expense.store';
import { Expense } from '../models/expense.model';

// ── The only scope we ever ask for. drive.appdata is a NON-sensitive scope
//    that grants access ONLY to this app's hidden appDataFolder — it can never
//    see, read, or touch the user's real Drive files. This is the floor.
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

// ── Google Identity Services (GIS) client library. Loaded on demand so the
//    app boots without it and only pays the cost when the user backs up.
const GIS_SRC = 'https://accounts.google.com/gsi/client';

// ── Drive REST base. We fetch the signed-in user's profile from /about, which
//    works under drive.appdata WITHOUT adding email/profile scopes.
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

// ── Upload endpoint (separate host path for file contents / media uploads).
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

// ── Single, canonical backup file. We keep exactly one of these in the hidden
//    appDataFolder and overwrite it in place — no timestamped duplicates.
const BACKUP_FILE_NAME = 'expense-backup.json';

// ── The account info we surface to the UI.
export interface GoogleAccount {
  name: string;
  email: string;
  photoUrl: string | null;
}

// ── Shape written to Drive. Versioned so a future restore can migrate older
//    backups if the state shape ever changes.
export interface BackupPayload {
  version: 1;
  exportedAt: string;
  expenses: Expense[];
  limits: Record<string, number>;
}

// ── Minimal typings for the bits of the GIS token model we use.
//    (Avoids pulling in @types/google.accounts as a dependency.)
interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}
interface GisTokenClient {
  requestAccessToken: (overrides?: { prompt?: '' | 'none' | 'consent' | 'select_account' }) => void;
}
interface GisErrorResponse {
  type?: string;
  message?: string;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: GisTokenResponse) => void;
            error_callback?: (err: GisErrorResponse) => void;
          }) => GisTokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {

  // ── GIS callbacks fire OUTSIDE Angular's zone, so signal writes made from
  //    them won't refresh the view. Hop back into the zone at that boundary.
  private readonly zone = inject(NgZone);

  // ── The single source of app state — backup() reads expenses + limits here.
  private readonly store = inject(ExpenseStore);

  // ── Private writable state
  private readonly _isSignedIn   = signal(false);
  private readonly _account      = signal<GoogleAccount | null>(null);
  private readonly _error        = signal<string | null>(null);
  private readonly _isBackingUp   = signal(false);
  private readonly _lastBackupAt  = signal<Date | null>(null);
  private readonly _isRestoring   = signal(false);
  private readonly _lastRestoreAt = signal<Date | null>(null);

  // ── Public read-only signals — consumers read, never mutate
  readonly isSignedIn    = this._isSignedIn.asReadonly();
  readonly account       = this._account.asReadonly();
  readonly error         = this._error.asReadonly();
  readonly isBackingUp   = this._isBackingUp.asReadonly();
  readonly lastBackupAt  = this._lastBackupAt.asReadonly();
  readonly isRestoring   = this._isRestoring.asReadonly();
  readonly lastRestoreAt = this._lastRestoreAt.asReadonly();

  // ── Cached id of the one backup file, so repeat backups overwrite it instead
  //    of re-listing every time. Reset on sign-out (it's per-account).
  private backupFileId: string | null = null;

  // ── Token state. Access tokens are short-lived (~1h) and the GIS token model
  //    gives SPAs no refresh token, so this lives in memory only — never
  //    localStorage. On reload the user re-authorizes (silently if they already
  //    consented). We refresh 60s early to avoid edge-of-expiry failures.
  private accessToken: string | null = null;
  private expiresAt = 0;

  private gisLoaded?: Promise<void>;
  private tokenClient?: GisTokenClient;

  // ── Start interactive sign-in. Pops Google's account picker / consent.
  //    Fire-and-forget by design: the result lands on the signals above, which
  //    is what the UI binds to.
  async signIn(): Promise<void> {
    this._error.set(null);
    try {
      const client = await this.getTokenClient();
      client.requestAccessToken({ prompt: 'select_account' });
    } catch {
      this.zone.run(() =>
        this._error.set('Could not reach Google. Check your connection and try again.')
      );
    }
  }

  // ── Sign out and revoke the grant entirely. Revoking (rather than just
  //    dropping the local token) keeps us honest about the "user owns their
  //    data" promise — the app retains nothing after sign-out.
  signOut(): void {
    const token = this.accessToken;
    if (token) {
      window.google?.accounts.oauth2.revoke(token);
    }
    this.accessToken = null;
    this.expiresAt = 0;
    this.backupFileId = null;
    this._isSignedIn.set(false);
    this._account.set(null);
    this._error.set(null);
  }

  // ── Back up all expenses + budget limits to the hidden appDataFolder as a
  //    single JSON file. Overwrites the existing backup if there is one.
  //    Reads state straight from ExpenseStore so callers just press the button.
  async backup(): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      this._error.set('Connect Google Drive before backing up.');
      return;
    }
    this._error.set(null);
    this._isBackingUp.set(true);
    try {
      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        expenses: this.store.expenses(),
        limits: this.store.limits(),
      };
      const json = JSON.stringify(payload);

      const fileId = this.backupFileId ?? (await this.findBackupFile(token));
      if (fileId) {
        await this.updateBackup(token, fileId, json);
      } else {
        this.backupFileId = await this.createBackup(token, json);
      }
      this._lastBackupAt.set(new Date());
    } catch {
      this._error.set('Backup failed. Please try again.');
    } finally {
      this._isBackingUp.set(false);
    }
  }

  // ── Download + parse the backup file WITHOUT applying it. The caller shows a
  //    confirmation (using payload.exportedAt) before committing, since restore
  //    overwrites current data. Returns null + sets error if nothing usable.
  async fetchBackup(): Promise<BackupPayload | null> {
    const token = this.getAccessToken();
    if (!token) {
      this._error.set('Connect Google Drive before restoring.');
      return null;
    }
    this._error.set(null);
    this._isRestoring.set(true);
    try {
      const fileId = this.backupFileId ?? (await this.findBackupFile(token));
      if (!fileId) {
        this._error.set('No backup found in Google Drive.');
        return null;
      }
      const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
      const payload = (await res.json()) as BackupPayload;
      if (!Array.isArray(payload?.expenses) || typeof payload?.limits !== 'object') {
        this._error.set('The backup file is not valid.');
        return null;
      }
      return payload;
    } catch {
      this._error.set('Could not read the backup. Please try again.');
      return null;
    } finally {
      this._isRestoring.set(false);
    }
  }

  // ── Commit a previously-fetched backup into the app. Goes through the store's
  //    restoreData() method — never mutates state directly.
  restore(payload: BackupPayload): void {
    this.store.restoreData(payload.expenses, payload.limits);
    this._lastRestoreAt.set(new Date());
  }

  // ── Look for an existing backup in the appDataFolder. The q + spaces filter
  //    scope this to our hidden folder only — never the user's real Drive.
  private async findBackupFile(token: string): Promise<string | null> {
    const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}'`);
    const url = `${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name)`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const data = await res.json();
    const id = data.files?.[0]?.id ?? null;
    this.backupFileId = id;
    return id;
  }

  // ── First-time create: multipart upload pins the file into appDataFolder.
  private async createBackup(token: string, json: string): Promise<string> {
    const boundary = `et-backup-${Date.now()}`;
    const metadata = { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      `${json}\r\n` +
      `--${boundary}--`;
    const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
    const data = await res.json();
    return data.id;
  }

  // ── Repeat backups: replace the file's contents in place (no new file).
  private async updateBackup(token: string, fileId: string, json: string): Promise<void> {
    const res = await fetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: json,
    });
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
  }

  // ── A currently-valid access token, or null. The backup/restore service
  //    (built next) calls this before a Drive request and falls back to
  //    signIn() when it returns null.
  getAccessToken(): string | null {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }
    return null;
  }

  // ── Handle the token response from GIS (already inside the zone).
  private async handleTokenResponse(resp: GisTokenResponse): Promise<void> {
    if (resp.error) {
      this.handleError({ type: resp.error, message: resp.error_description });
      return;
    }
    this.accessToken = resp.access_token;
    this.expiresAt = Date.now() + (resp.expires_in - 60) * 1000;
    this._isSignedIn.set(true);
    this._error.set(null);
    await this.loadAccount();
  }

  // ── Fetch the signed-in user's profile. Uses fetch() (not HttpClient) on
  //    purpose: the app's authInterceptor would overwrite our Google bearer
  //    token with the local app token. Non-fatal — sign-in still counts even
  //    if the profile fetch fails.
  private async loadAccount(): Promise<void> {
    try {
      const res = await fetch(`${DRIVE_API}/about?fields=user`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!res.ok) throw new Error(`Drive /about failed: ${res.status}`);
      const data = await res.json();
      this._account.set({
        name: data.user?.displayName ?? '',
        email: data.user?.emailAddress ?? '',
        photoUrl: data.user?.photoLink ?? null,
      });
    } catch {
      this._account.set(null);
    }
  }

  private handleError(err: GisErrorResponse): void {
    // The user dismissing the popup is not an error worth showing.
    if (err.type === 'popup_closed' || err.type === 'popup_failed_to_open') {
      this._error.set(null);
      return;
    }
    this._error.set('Google sign-in failed. Please try again.');
  }

  // ── Lazily create the GIS token client once the library is loaded.
  private async getTokenClient(): Promise<GisTokenClient> {
    await this.loadGis();
    if (this.tokenClient) return this.tokenClient;
    this.tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (resp) => this.zone.run(() => this.handleTokenResponse(resp)),
      error_callback: (err) => this.zone.run(() => this.handleError(err)),
    });
    return this.tokenClient;
  }

  // ── Inject the GIS script once, reusing the same promise for concurrent calls.
  private loadGis(): Promise<void> {
    if (this.gisLoaded) return this.gisLoaded;
    this.gisLoaded = new Promise<void>((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
    return this.gisLoaded;
  }
}
