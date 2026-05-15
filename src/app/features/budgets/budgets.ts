import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Category } from '../../models/expense.model';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './budgets.html',
})
export class BudgetsComponent {

  // ── Inject service
  private expenseService = inject(ExpenseService);

  // ── Expose signals
  budgets = this.expenseService.budgets;
  limits  = this.expenseService.limits;
  isLoading        = this.expenseService.isLoading;   
  error            = this.expenseService.error;   
  
  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  // ── Budget editor form
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

  // ── Methods
  onBudgetCategoryChange(category: string) {
    const currentLimit = this.expenseService.limits()[category] || 0;
    this.budgetForm.patchValue({ limit: currentLimit });
  }

  saveBudget() {
    if (this.budgetForm.invalid) return;

    const { category, limit } = this.budgetForm.getRawValue();

    this.expenseService.updateLimit(category!, limit!);

    this.budgetForm.reset({ category: 'Food' });
    this.onBudgetCategoryChange('Food');
  }
}