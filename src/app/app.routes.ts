import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { expenseResolver } from './resolvers/expense.resolver';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login')
        .then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    resolve: { data: expenseResolver },
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
    path: 'reports',
    loadComponent: () =>
      import('./features/reports/reports')
        .then(m => m.ReportsComponent)
  },
  {
    path: 'add',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/add-expense/add-expense')
        .then(m => m.AddExpenseComponent)
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings')
        .then(m => m.SettingsComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];