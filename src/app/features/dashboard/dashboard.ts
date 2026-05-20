import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Category } from '../../models/expense.model';
import { ExpenseStore } from '../../store/expense.store';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { PkrCurrencyPipe } from '../../pipes/pkr-currency.pipe';
import { CategoryIconPipe } from '../../pipes/category-icon.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, PkrCurrencyPipe, CategoryIconPipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {

  // ── inject store instead of service
  private store = inject(ExpenseStore);

  // ── expose store signals to template
  budgets          = this.store.budgets;
  totals           = this.store.totals;
  filteredExpenses = this.store.filteredExpenses;
  selectedCategory = this.store.selectedCategory;
  limits           = this.store.limits;
  isLoading        = this.store.isLoading;
  error            = this.store.error;

  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  // ── expense form
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

  // ── budget editor form
  budgetForm = new FormGroup({
    category: new FormControl<Category>('Food', [
      Validators.required,
    ]),
    limit: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
  });

  get budgetCategoryControl() { return this.budgetForm.get('category'); }
  get budgetLimitControl()    { return this.budgetForm.get('limit');    }

  // ── methods
  onBudgetCategoryChange(category: string) {
    const currentLimit = this.store.limits()[category] || 0;
    this.budgetForm.patchValue({ limit: currentLimit });
  }

  addExpense() {
    if (this.expenseForm.invalid) return;
    const { title, amount, category, note } = this.expenseForm.getRawValue();
    this.store.addExpense({
      title:    title!,
      amount:   amount!,
      category: category!,
      note:     note || undefined,
    });
    this.expenseForm.reset({ category: 'Food' });
  }

  saveBudget() {
    if (this.budgetForm.invalid) return;
    const { category, limit } = this.budgetForm.getRawValue();
    this.store.updateLimit(category!, limit!);
    this.budgetForm.reset({ category: 'Food' });
    this.onBudgetCategoryChange('Food');
  }

  setCategory(cat: string) {
    this.store.setCategory(cat);
  }
}