import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard')
        .then(m => m.DashboardComponent)
  },
  {
    path: 'expenses',
    loadComponent: () =>
      import('./features/expenses/expenses')
        .then(m => m.ExpensesComponent)
  },
  {
    path: 'budgets',
    loadComponent: () =>
      import('./features/budgets/budgets')
        .then(m => m.BudgetsComponent)
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./features/add-expense/add-expense')
        .then(m => m.AddExpenseComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];