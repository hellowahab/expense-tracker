import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ExpenseStore } from '../../store/expense.store';
import { Category } from '../../models/expense.model';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './add-expense.html',
})
export class AddExpenseComponent {

  private store  = inject(ExpenseStore);
  private router = inject(Router);

  isLoading = this.store.isLoading;
  error     = this.store.error;

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
}