import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ExpenseService } from '../services/expense.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {

  const expenseService = inject(ExpenseService);

  // set loading true before request goes out
  expenseService.isLoading.set(true);

  return next(req).pipe(
    finalize(() => {
      // set loading false when response arrives — success or error
      expenseService.isLoading.set(false);
    })
  );
};