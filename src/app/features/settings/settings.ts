import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GoogleDriveService, BackupPayload } from '../../services/google-drive.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './settings.html',
})
export class SettingsComponent {

  private drive = inject(GoogleDriveService);

  // ── Read-only Drive state straight from the service signals
  isSignedIn    = this.drive.isSignedIn;
  account       = this.drive.account;
  error         = this.drive.error;
  isBackingUp   = this.drive.isBackingUp;
  lastBackupAt  = this.drive.lastBackupAt;
  isRestoring   = this.drive.isRestoring;
  lastRestoreAt = this.drive.lastRestoreAt;

  // ── Local UI state: the fetched backup awaiting the user's confirmation.
  pendingRestore = signal<BackupPayload | null>(null);

  connect()   { this.drive.signIn(); }
  signOut()   { this.drive.signOut(); }
  backUpNow() { this.drive.backup(); }

  // ── Step 1: download the backup, then open the confirmation if it's valid.
  async startRestore() {
    const payload = await this.drive.fetchBackup();
    if (payload) this.pendingRestore.set(payload);
  }

  // ── Step 2: user confirmed — overwrite current data with the backup.
  confirmRestore() {
    const payload = this.pendingRestore();
    if (payload) this.drive.restore(payload);
    this.pendingRestore.set(null);
  }

  cancelRestore() {
    this.pendingRestore.set(null);
  }
}
