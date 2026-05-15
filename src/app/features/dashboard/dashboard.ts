import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Category } from '../../models/expense.model';
import { ExpenseService } from '../../services/expense.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {

  // ── Inject the service
  private expenseService = inject(ExpenseService);

  // ── Expose service signals and computed directly to the template
  budgets          = this.expenseService.budgets;
  totals           = this.expenseService.totals;
  filteredExpenses = this.expenseService.filteredExpenses;
  selectedCategory = this.expenseService.selectedCategory;
  limits           = this.expenseService.limits;
  isLoading        = this.expenseService.isLoading;   
  error            = this.expenseService.error;       

  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  // ── Expense form
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

  addExpense() {
    if (this.expenseForm.invalid) return;

    const { title, amount, category, note } = this.expenseForm.getRawValue();

    this.expenseService.addExpense({
      title: title!,
      amount: amount!,
      category: category!,
      note: note || undefined,
    });

    this.expenseForm.reset({ category: 'Food' });
  }

  saveBudget() {
    if (this.budgetForm.invalid) return;

    const { category, limit } = this.budgetForm.getRawValue();

    this.expenseService.updateLimit(category!, limit!);

    this.budgetForm.reset({ category: 'Food' });
    this.onBudgetCategoryChange('Food');
  }

  setCategory(cat: string) {
    this.expenseService.setCategory(cat);
  }
}