import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ExpenseStore } from '../store/expense.store';

export const expenseResolver: ResolveFn<void> = (route, state) => {

  const store = inject(ExpenseStore);

  // load data if not already in store
  store.loadExpenses();
  store.loadLimits();
};