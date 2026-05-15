// src/app/services/expense.service.ts

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, catchError, of, tap } from 'rxjs';
import { Expense, Budget, Category } from '../models/expense.model';
import { environment } from '../../environments/environment';

// ── localStorage helper
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  private http   = inject(HttpClient);
  //private apiUrl = 'http://localhost:3000';
  private apiUrl = environment.apiUrl;


  // ── Refresh triggers
  private expensesRefresh$ = new BehaviorSubject<void>(undefined);
  private limitsRefresh$   = new BehaviorSubject<void>(undefined);

  // ── Source signals — initialize from localStorage immediately
  expenses = signal<Expense[]>(
    loadFromStorage<Expense[]>('et_expenses', [])
  );

  limits = signal<Record<string, number>>(
    loadFromStorage<Record<string, number>>('et_limits', {
      Food:          12000,
      Transport:      8000,
      Shopping:      10000,
      Bills:         20000,
      Health:         5000,
      Entertainment:  5000,
      Other:          3000,
    })
  );

  // ── UI state signals
  selectedCategory = signal<string>('All');
  isLoading        = signal<boolean>(false);
  error            = signal<string | null>(null);

  constructor() {

    // ── effect() — auto save expenses to localStorage on every change
    effect(() => {
      localStorage.setItem('et_expenses', JSON.stringify(this.expenses()));
    });

    // ── effect() — auto save limits to localStorage on every change
    effect(() => {
      localStorage.setItem('et_limits', JSON.stringify(this.limits()));
    });

    // ── Load from API only if localStorage was empty
    this.expensesRefresh$.pipe(
      switchMap(() => {
        if (this.expenses().length > 0) return of(null); // localStorage had data
        this.isLoading.set(true);
        return this.http.get<Expense[]>(`${this.apiUrl}/expenses`).pipe(
          tap(() => this.isLoading.set(false)),
          catchError(() => {
            this.isLoading.set(false);
            this.error.set('Failed to load expenses.');
            return of(null);
          })
        );
      })
    ).subscribe(expenses => {
      if (expenses) this.expenses.set(expenses);
    });

    this.limitsRefresh$.pipe(
      switchMap(() => {
        if (Object.keys(this.limits()).length > 0) return of(null); // localStorage had data
        this.isLoading.set(true);
        return this.http.get<Record<string, number>>(`${this.apiUrl}/limits`).pipe(
          tap(() => this.isLoading.set(false)),
          catchError(() => {
            this.isLoading.set(false);
            this.error.set('Failed to load limits.');
            return of(null);
          })
        );
      })
    ).subscribe(limits => {
      if (limits) this.limits.set(limits);
    });
  }

  // ── Computed signals
  thisMonthExpenses = computed(() => {
    const month = new Date().toISOString().slice(0, 7);
    return this.expenses().filter(e => e.date.startsWith(month));
  });

  spendByCategory = computed(() => {
    const result: Record<string, number> = {};
    for (const e of this.thisMonthExpenses()) {
      result[e.category] = (result[e.category] || 0) + e.amount;
    }
    return result;
  });

  budgets = computed<Budget[]>(() =>
    Object.entries(this.limits()).map(([category, limit]) => {
      const spent      = this.spendByCategory()[category] || 0;
      const percentage = Math.min((spent / limit) * 100, 100);
      const status     =
        spent >= limit       ? 'over'    :
        spent >= limit * 0.8 ? 'warning' : 'safe';
      return { category: category as Category, limit, spent, percentage, status };
    })
  );

  totals = computed(() => {
    const spent  = this.thisMonthExpenses().reduce((sum, e) => sum + e.amount, 0);
    const budget = Object.values(this.limits()).reduce((sum, l) => sum + l, 0);
    return { spent, budget, remaining: budget - spent };
  });

  filteredExpenses = computed(() => {
    const cat = this.selectedCategory();
    return cat === 'All'
      ? this.thisMonthExpenses()
      : this.thisMonthExpenses().filter(e => e.category === cat);
  });

  // ── Methods
  addExpense(expense: Omit<Expense, 'id' | 'date'>) {
  const newExpense: Expense = {
    ...expense,
    id:   Date.now(),
    date: new Date().toISOString().slice(0, 10),
  };

  this.expenses.update(prev => [...prev, newExpense]);

  // only call API in development
  if (this.apiUrl) {
    this.http.post<Expense>(`${this.apiUrl}/expenses`, newExpense)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}

updateLimit(category: string, limit: number) {
  this.limits.update(prev => ({ ...prev, [category]: limit }));

  // only call API in development
  if (this.apiUrl) {
    this.http.patch<Record<string, number>>(
      `${this.apiUrl}/limits`,
      { [category]: limit }
    )
    .pipe(catchError(() => of(null)))
    .subscribe();
  }
}

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }

  // ── Clear localStorage — useful for testing
  clearStorage() {
    localStorage.removeItem('et_expenses');
    localStorage.removeItem('et_limits');
}
  }