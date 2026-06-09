import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  withHooks,
  patchState,
} from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
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

// ── state shape
export interface ExpenseState {
  expenses:         Expense[];
  limits:           Record<string, number>;
  selectedCategory: string;
  isLoading:        boolean;
  error:            string | null;
}

// ── initial values
const initialState: ExpenseState = {
  expenses: loadFromStorage<Expense[]>('et_expenses', []),
  limits:   loadFromStorage<Record<string, number>>('et_limits', {
    Food:          12000,
    Transport:      8000,
    Shopping:      10000,
    Bills:         20000,
    Health:         5000,
    Entertainment:  5000,
    Other:          3000,
  }),
  selectedCategory: 'All',
  isLoading:        false,
  error:            null,
};

// ── the store
export const ExpenseStore = signalStore(
  { providedIn: 'root' },

  // ── Step 2: state
  withState(initialState),

  // ── Step 3: computed
  withComputed(({ expenses, limits, selectedCategory }) => {

    const currentMonth = new Date().toISOString().slice(0, 7);

    const thisMonthExpenses = computed(() =>
      expenses().filter(e => e.date.startsWith(currentMonth))
    );

    const spendByCategory = computed(() => {
      const result: Record<string, number> = {};
      for (const e of thisMonthExpenses()) {
        result[e.category] = (result[e.category] || 0) + e.amount;
      }
      return result;
    });

    const budgets = computed<Budget[]>(() =>
      Object.entries(limits()).map(([category, limit]) => {
        const spent      = spendByCategory()[category] || 0;
        const percentage = Math.min((spent / limit) * 100, 100);
        const status     =
          spent >= limit       ? 'over'    :
          spent >= limit * 0.8 ? 'warning' : 'safe';
        return { category: category as Category, limit, spent, percentage, status };
      })
    );

    const totals = computed(() => {
      const spent  = thisMonthExpenses().reduce((sum, e) => sum + e.amount, 0);
      const budget = Object.values(limits()).reduce((sum, l) => sum + l, 0);
      return { spent, budget, remaining: budget - spent };
    });

    const filteredExpenses = computed(() => {
      const cat = selectedCategory();
      return cat === 'All'
        ? thisMonthExpenses()
        : thisMonthExpenses().filter(e => e.category === cat);
    });

    return {
      thisMonthExpenses,
      spendByCategory,
      budgets,
      totals,
      filteredExpenses,
    };
  }),

  // ── Step 4: methods
  withMethods((store, http = inject(HttpClient)) => {

    const apiUrl = environment.apiUrl;

    function saveExpenses(expenses: Expense[]) {
      localStorage.setItem('et_expenses', JSON.stringify(expenses));
    }

    function saveLimits(limits: Record<string, number>) {
      localStorage.setItem('et_limits', JSON.stringify(limits));
    }

    return {

      addExpense(expense: Omit<Expense, 'id' | 'date'>) {
        const newExpense: Expense = {
          ...expense,
          id:   Date.now(),
          date: new Date().toISOString().slice(0, 10),
        };
        const updated = [...store.expenses(), newExpense];
        patchState(store, { expenses: updated });
        saveExpenses(updated);
        if (apiUrl) {
          http.post<Expense>(`${apiUrl}/expenses`, newExpense)
            .pipe(catchError(() => of(null)))
            .subscribe();
        }
      },

      // ── Validate voice-parsed data, then add the expense
      createExpenseFromVoice(parsed: {
        title:    string;
        amount:   number | null;
        category: Category;
        date:     string;
      }): { success: boolean; error?: string } {

        const title = (parsed.title ?? '').trim();
        if (title.length < 3) {
          return { success: false, error: "Couldn't understand the expense title." };
        }
        if (
          parsed.amount === null ||
          !Number.isFinite(parsed.amount) ||
          parsed.amount < 1
        ) {
          return { success: false, error: "Couldn't understand the amount." };
        }

        const categories: Category[] = [
          'Food', 'Transport', 'Shopping',
          'Bills', 'Health', 'Entertainment', 'Other',
        ];
        if (!categories.includes(parsed.category)) {
          return { success: false, error: 'Unknown category.' };
        }

        const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
          ? parsed.date
          : new Date().toISOString().slice(0, 10);

        const newExpense: Expense = {
          id:       Date.now(),
          title,
          amount:   parsed.amount,
          category: parsed.category,
          date,
        };
        const updated = [...store.expenses(), newExpense];
        patchState(store, { expenses: updated });
        saveExpenses(updated);
        if (apiUrl) {
          http.post<Expense>(`${apiUrl}/expenses`, newExpense)
            .pipe(catchError(() => of(null)))
            .subscribe();
        }
        return { success: true };
      },

      deleteExpense(id: number) {
        const updated = store.expenses().filter(e => e.id !== id);
        patchState(store, { expenses: updated });
        saveExpenses(updated);
        if (apiUrl) {
          http.delete(`${apiUrl}/expenses/${id}`)
            .pipe(catchError(() => of(null)))
            .subscribe();
        }
      },

      updateLimit(category: string, limit: number) {
        const updated = { ...store.limits(), [category]: limit };
        patchState(store, { limits: updated });
        saveLimits(updated);
        if (apiUrl) {
          http.patch(`${apiUrl}/limits`, { [category]: limit })
            .pipe(catchError(() => of(null)))
            .subscribe();
        }
      },

      setCategory(category: string) {
        patchState(store, { selectedCategory: category });
      },

      clearError() {
        patchState(store, { error: null });
      },

      setLoading(isLoading: boolean) {
        patchState(store, { isLoading });
      },

      setError(error: string | null) {
        patchState(store, { error });
      },

      loadExpenses() {
        if (!apiUrl) return;
        if (store.expenses().length > 0) return;
        patchState(store, { isLoading: true });
        http.get<Expense[]>(`${apiUrl}/expenses`)
          .pipe(catchError(() => {
            patchState(store, {
              isLoading: false,
              error: 'Failed to load expenses.'
            });
            return of(null);
          }))
          .subscribe(expenses => {
            if (expenses) {
              patchState(store, { expenses, isLoading: false });
              saveExpenses(expenses);
            }
          });
      },

      loadLimits() {
        if (!apiUrl) return;
        if (Object.keys(store.limits()).length > 0) return;
        http.get<Record<string, number>>(`${apiUrl}/limits`)
          .pipe(catchError(() => of(null)))
          .subscribe(limits => {
            if (limits) {
              patchState(store, { limits });
              saveLimits(limits);
            }
          });
      },

      clearStorage() {
        localStorage.removeItem('et_expenses');
        localStorage.removeItem('et_limits');
      },
    };
  }),

  // ── Step 5: hooks
  withHooks({
    onInit(store) {
      store.loadExpenses();
      store.loadLimits();
    },
    onDestroy(store) {
      // cleanup if needed in future
    }
  })
);