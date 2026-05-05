export type Category =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Health'
  | 'Entertainment'
  | 'Other';

export interface Expense {
  id: number;
  title: string;
  amount: number;
  category: Category;
  date: string;        // "2026-05-01"
  note?: string;
}

export interface Budget {
  category: Category;
  limit: number;
  spent: number;
  percentage: number;
  status: 'safe' | 'warning' | 'over';
}