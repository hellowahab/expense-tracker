import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ExpenseStore } from '../store/expense.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {

  const store = inject(ExpenseStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // clear any previous error
      store.clearError();

      // build user friendly message
      let message = 'Something went wrong. Please try again.';

      if (error.status === 0) {
        message = 'Cannot reach the server. Please check your connection.';
      } else if (error.status === 400) {
        message = 'Invalid request. Please check your input.';
      } else if (error.status === 401) {
        message = 'You are not authorised. Please log in.';
      } else if (error.status === 403) {
        message = 'You do not have permission to do that.';
      } else if (error.status === 404) {
        message = 'The requested resource was not found.';
      } else if (error.status === 500) {
        message = 'Server error. Please try again later.';
      }

      // set error via store method
      store.setError(message);

      // auto clear after 4 seconds
      setTimeout(() => store.clearError(), 4000);

      return throwError(() => error);
    })
  );
};