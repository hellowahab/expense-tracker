import { Component, inject, signal, effect } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ExpenseStore } from '../../store/expense.store';
import { VoiceCaptureService } from '../../services/voice-capture.service';
import { PkrCurrencyPipe } from '../../pipes/pkr-currency.pipe';
import { parseVoiceExpense, ParsedExpense } from '../../utils/voice-parser';
import { Category } from '../../models/expense.model';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  imports: [ReactiveFormsModule, PkrCurrencyPipe],
  templateUrl: './add-expense.html',
})
export class AddExpenseComponent {

  private store  = inject(ExpenseStore);
  private router = inject(Router);
  private voice  = inject(VoiceCaptureService);

  isLoading = this.store.isLoading;
  error     = this.store.error;

  // ── Voice capture state (read-only signals from the service)
  voiceSupported    = this.voice.isSupported;
  isListening       = this.voice.isListening;
  interimTranscript = this.voice.interimTranscript;
  voiceTranscript   = this.voice.transcript;
  voiceError        = this.voice.error;

  // ── Parsed result awaiting user confirmation (null = no card shown)
  parsed    = signal<ParsedExpense | null>(null);
  saveError = signal<string | null>(null);

  constructor() {
    // when a final transcript arrives, parse it and show the confirmation card
    effect(() => {
      const text = this.voiceTranscript();
      if (text) {
        this.saveError.set(null);
        this.parsed.set(parseVoiceExpense(text));
      }
    });
  }

  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  expenseForm = new FormGroup({
    title: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    category: new FormControl<Category>('Food', [
      Validators.required,
    ]),
    note: new FormControl(''),
  });

  get titleControl()    { return this.expenseForm.get('title');    }
  get amountControl()   { return this.expenseForm.get('amount');   }
  get categoryControl() { return this.expenseForm.get('category'); }
  get noteControl()     { return this.expenseForm.get('note');     }

  addExpense() {
    if (this.expenseForm.invalid) return;
    const { title, amount, category, note } = this.expenseForm.getRawValue();
    this.store.addExpense({
      title:    title!,
      amount:   amount!,
      category: category!,
      note:     note || undefined,
    });
    this.router.navigate(['/expenses']);
  }

  cancel() {
    this.router.navigate(['/expenses']);
  }

  // ── Toggle voice capture on/off
  toggleVoice() {
    if (this.isListening()) {
      this.voice.stop();
    } else {
      this.voice.reset();
      this.voice.start();
    }
  }

  // ── User confirmed the parsed card — save through the store
  confirmVoiceExpense() {
    const parsed = this.parsed();
    if (!parsed) return;

    const result = this.store.createExpenseFromVoice(parsed);
    if (result.success) {
      this.parsed.set(null);
      this.voice.reset();
      this.router.navigate(['/expenses']);
    } else {
      this.saveError.set(result.error ?? 'Could not save the expense.');
    }
  }

  // ── Parse missed something — drop the parsed values into the manual form
  editVoiceInForm() {
    const parsed = this.parsed();
    if (!parsed) return;

    this.expenseForm.patchValue({
      title:    parsed.title,
      amount:   parsed.amount,
      category: parsed.category,
    });
    this.dismissVoiceCard();
  }

  // ── Discard the parsed card and reset voice state
  dismissVoiceCard() {
    this.parsed.set(null);
    this.saveError.set(null);
    this.voice.reset();
  }
}