import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ExpenseService } from '../services/expense.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {

  const expenseService = inject(ExpenseService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // clear any previous error first
      expenseService.error.set(null);

      // build a user friendly message based on status code
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

      // set the error message on the service
      expenseService.error.set(message);

      // auto clear after 4 seconds
      setTimeout(() => expenseService.error.set(null), 4000);

      // re-throw so the Observable chain still errors out
      return throwError(() => error);
    })
  );
};