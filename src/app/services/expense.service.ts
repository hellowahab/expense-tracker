import { Injectable, signal, computed } from '@angular/core';
import { Expense, Budget, Category } from '../models/expense.model';
import { SEED_EXPENSES, SEED_LIMITS } from '../data/expenses.data';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  // ── Source signals
  expenses = signal<Expense[]>(SEED_EXPENSES);
  limits = signal<Record<string, number>>(SEED_LIMITS);
  selectedCategory = signal<string>('All');

  // ── Computed: this month's expenses only
  thisMonthExpenses = computed(() => {
    const month = new Date().toISOString().slice(0, 7);
    return this.expenses().filter(e => e.date.startsWith(month));
  });

  // ── Computed: total spent per category
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
        spent >= limit       ? 'over'    :
        spent >= limit * 0.8 ? 'warning' : 'safe';
      return { category: category as Category, limit, spent, percentage, status };
    })
  );

  // ── Computed: summary totals
  totals = computed(() => {
    const spent = this.thisMonthExpenses().reduce((sum, e) => sum + e.amount, 0);
    const budget = Object.values(this.limits()).reduce((sum, l) => sum + l, 0);
    return { spent, budget, remaining: budget - spent };
  });

  // ── Computed: filtered expense list
  filteredExpenses = computed(() => {
    const cat = this.selectedCategory();
    return cat === 'All'
      ? this.thisMonthExpenses()
      : this.thisMonthExpenses().filter(e => e.category === cat);
  });

  // ── Methods
  addExpense(expense: Omit<Expense, 'id' | 'date'>) {
    this.expenses.update(prev => [...prev, {
      ...expense,
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
    }]);
  }

  updateLimit(category: string, limit: number) {
    this.limits.update(prev => ({
      ...prev,
      [category]: limit,
    }));
  }

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }
}