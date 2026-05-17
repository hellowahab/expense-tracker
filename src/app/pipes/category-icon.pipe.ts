import { Pipe, PipeTransform } from '@angular/core';
import { Category } from '../models/expense.model';

@Pipe({
  name: 'categoryIcon',
  standalone: true,
})
export class CategoryIconPipe implements PipeTransform {

  private icons: Record<Category, string> = {
    Food:          '🍔',
    Transport:     '🚗',
    Shopping:      '🛍️',
    Bills:         '💡',
    Health:        '💊',
    Entertainment: '🎬',
    Other:         '📦',
  };

  transform(
    value: Category | string,
    showLabel: boolean = true
  ): string {

    if (!value) return '';

    const icon = this.icons[value as Category] || '📦';

    return showLabel ? `${icon} ${value}` : icon;
  }
}