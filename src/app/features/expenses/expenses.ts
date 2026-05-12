import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Category } from '../../models/expense.model';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: 'expenses.html',
})
export class ExpensesComponent {

  // ── Inject service
  private expenseService = inject(ExpenseService);

  // ── Expose signals
  filteredExpenses = this.expenseService.filteredExpenses;
  selectedCategory = this.expenseService.selectedCategory;

  categories: Category[] = [
    'Food', 'Transport', 'Shopping',
    'Bills', 'Health', 'Entertainment', 'Other'
  ];

  // ── Method
  setCategory(cat: string) {
    this.expenseService.setCategory(cat);
  }
}