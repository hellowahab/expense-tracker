import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Category } from '../../models/expense.model';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { PkrCurrencyPipe } from '../../pipes/pkr-currency.pipe';
import { CategoryIconPipe } from '../../pipes/category-icon.pipe';


@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [ TimeAgoPipe, PkrCurrencyPipe, CategoryIconPipe],
  templateUrl: 'expenses.html',
})
export class ExpensesComponent {

  // ── Inject service
  private expenseService = inject(ExpenseService);

  // ── Expose signals
  filteredExpenses = this.expenseService.filteredExpenses;
  selectedCategory = this.expenseService.selectedCategory;
  isLoading        = this.expenseService.isLoading;   
  error            = this.expenseService.error;   
  
  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  // ── Method
  setCategory(cat: string) {
    this.expenseService.setCategory(cat);
  }
}