import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, catchError, of ,tap} from 'rxjs';
import { Expense, Budget, Category } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';

  // ── Refresh triggers
private expensesRefresh$ = new BehaviorSubject<void>(undefined);
private limitsRefresh$   = new BehaviorSubject<void>(undefined);
 // ── Loading and error signals
isLoading = signal<boolean>(false);
error     = signal<string | null>(null);


// ── Source signals — loaded from API
expenses = toSignal(
  this.expensesRefresh$.pipe(
    switchMap(() => {
      this.isLoading.set(true);
      return this.http.get<Expense[]>(`${this.apiUrl}/expenses`).pipe(
        tap(() => this.isLoading.set(false)),
        catchError(() => {
          this.isLoading.set(false);
          this.error.set('Failed to load expenses.');
          return of([]);
        })
      );
    })
  ),
  { initialValue: [] as Expense[] }
);

limits = toSignal(
  this.limitsRefresh$.pipe(
    switchMap(() => {
      this.isLoading.set(true);
      return this.http.get<Record<string, number>>(`${this.apiUrl}/limits`).pipe(
        catchError(() => {
          this.error.set('Failed to load limits.');
          return of({} as Record<string, number>);        })
      );
    })
  ),
  { initialValue: {} as Record<string, number> }
  );

  // ── UI state signal
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
      const spent      = this.spendByCategory()[category] || 0;
      const percentage = Math.min((spent / limit) * 100, 100);
      const status     =
        spent >= limit       ? 'over'    :
        spent >= limit * 0.8 ? 'warning' : 'safe';
      return { category: category as Category, limit, spent, percentage, status };
    })
  );

  // ── Computed: summary totals
  totals = computed(() => {
    const spent  = this.thisMonthExpenses().reduce((sum, e) => sum + e.amount, 0);
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
    this.isLoading.set(true);
    this.error.set(null);

    const newExpense: Omit<Expense, 'id'> = {
      ...expense,
      date: new Date().toISOString().slice(0, 10),
    };

    this.http.post<Expense>(`${this.apiUrl}/expenses`, newExpense)
      .pipe(catchError(err => {
        this.error.set('Failed to add expense. Please try again.');
        return of(null);
      }))
      .subscribe(result => {
        this.isLoading.set(false);
        if (result) this.expensesRefresh$.next();
      });
  }

  updateLimit(category: string, limit: number) {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.patch<Record<string, number>>(
      `${this.apiUrl}/limits`,
      { [category]: limit }
    )
    .pipe(catchError(err => {
      this.error.set('Failed to update limit. Please try again.');
      return of(null);
    }))
    .subscribe(result => {
      this.isLoading.set(false);
      if (result) this.limitsRefresh$.next();
    });
  }

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }
}