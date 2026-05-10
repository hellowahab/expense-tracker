import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Expense, Budget, Category } from '../../models/expense.model';
import { SEED_EXPENSES, SEED_LIMITS } from '../../data/expenses.data';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {

  // ── Source signals
  expenses = signal<Expense[]>(SEED_EXPENSES);
  limits = signal<Record<string, number>>(SEED_LIMITS);
  selectedCategory = signal<string>('All');

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



  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  // ── Computed: this month's expenses only
  thisMonthExpenses = computed(() => {
    const month = new Date().toISOString().slice(0, 7); // "2026-05"
    return this.expenses().filter(e => e.date.startsWith(month));
  });

  // ── Computed: spending per category
  spendByCategory = computed(() => {
    const result: Record<string, number> = {};
    for (const e of this.thisMonthExpenses()) {
      result[e.category] = (result[e.category] || 0) + e.amount;
    }
    return result;
  });

  // ── Computed: budget rows with alert status
  budgets = computed<Budget[]>(() =>
    Object.entries(this.limits()).map(([category, limit]) => {
      const spent = this.spendByCategory()[category] || 0;
      const percentage = Math.min((spent / limit) * 100, 100);
      const status =
        spent >= limit ? 'over' :
        spent >= limit * 0.8 ? 'warning' : 'safe';
      return { category: category as Category, limit, spent, percentage, status };
    })
  );

  // ── Computed: summary totals for the top cards
  totals = computed(() => {
    const spent = this.thisMonthExpenses()
      .reduce((sum, e) => sum + e.amount, 0);
    const budget = Object.values(this.limits())
      .reduce((sum, l) => sum + l, 0);
    return { spent, budget, remaining: budget - spent };
  });

  // ── Computed: filtered list for the expense table
  filteredExpenses = computed(() => {
    const cat = this.selectedCategory();
    return cat === 'All'
      ? this.thisMonthExpenses()
      : this.thisMonthExpenses().filter(e => e.category === cat);
  });

  // ── Methods
  addExpense() {
    if (this.expenseForm.invalid) return;

    const { title, amount, category, note } = this.expenseForm.getRawValue();

    this.expenses.update(prev => [...prev, {
      id: Date.now(),
      title: title!,
      amount: amount!,
      category: category!,
      date: new Date().toISOString().slice(0, 10),
      note: note || undefined,
    }]);

    this.expenseForm.reset({ category: 'Food' });
  }

  onBudgetCategoryChange(category: string) {
    const currentLimit = this.limits()[category] || 0;
    this.budgetForm.patchValue({ limit: currentLimit });
  }

  saveBudget() {
    if (this.budgetForm.invalid) return;

    const { category, limit } = this.budgetForm.getRawValue();

    this.limits.update(prev => ({
      ...prev,
      [category!]: limit!,
    }));

    this.budgetForm.reset({ category: 'Food' });
    this.onBudgetCategoryChange('Food');
  }

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }
}