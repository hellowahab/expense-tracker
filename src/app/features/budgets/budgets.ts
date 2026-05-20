import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ExpenseStore } from '../../store/expense.store';
import { Category } from '../../models/expense.model';
import { PkrCurrencyPipe } from '../../pipes/pkr-currency.pipe';
import { CategoryIconPipe } from '../../pipes/category-icon.pipe';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [ReactiveFormsModule, PkrCurrencyPipe, CategoryIconPipe],
  templateUrl: './budgets.html',
})
export class BudgetsComponent {

  private store = inject(ExpenseStore);

  budgets   = this.store.budgets;
  limits    = this.store.limits;
  isLoading = this.store.isLoading;
  error     = this.store.error;

  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

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

  onBudgetCategoryChange(category: string) {
    const currentLimit = this.store.limits()[category] || 0;
    this.budgetForm.patchValue({ limit: currentLimit });
  }

  saveBudget() {
    if (this.budgetForm.invalid) return;
    const { category, limit } = this.budgetForm.getRawValue();
    this.store.updateLimit(category!, limit!);
    this.budgetForm.reset({ category: 'Food' });
    this.onBudgetCategoryChange('Food');
  }
}