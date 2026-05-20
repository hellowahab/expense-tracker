import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ExpenseStore } from '../store/expense.store';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {

  const store = inject(ExpenseStore);

  store.setLoading(true);

  return next(req).pipe(
    finalize(() => store.setLoading(false))
  );
};