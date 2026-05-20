import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ExpenseStore } from '../../store/expense.store';
import { Category } from '../../models/expense.model';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { PkrCurrencyPipe } from '../../pipes/pkr-currency.pipe';
import { CategoryIconPipe } from '../../pipes/category-icon.pipe';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [TimeAgoPipe, PkrCurrencyPipe, CategoryIconPipe],
  templateUrl: './expenses.html',
})
export class ExpensesComponent {

  private store = inject(ExpenseStore);

  filteredExpenses = this.store.filteredExpenses;
  selectedCategory = this.store.selectedCategory;
  isLoading        = this.store.isLoading;
  error            = this.store.error;

  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  setCategory(cat: string) {
    this.store.setCategory(cat);
  }

  deleteExpense(id: number) {
    this.store.deleteExpense(id);
  }
}