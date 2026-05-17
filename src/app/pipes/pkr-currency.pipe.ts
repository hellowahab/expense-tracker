import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pkrCurrency',
  standalone: true,
})
export class PkrCurrencyPipe implements PipeTransform {

  transform(
    value: number | null | undefined,
    showSymbol: boolean = true,
    decimals: number = 0
  ): string {

    // handle null, undefined, NaN
    if (value === null || value === undefined || isNaN(value)) return '';

    // format the number with commas and decimal places
    const formatted = new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);

    // prepend symbol if requested
    return showSymbol ? `Rs ${formatted}` : formatted;
  }
}