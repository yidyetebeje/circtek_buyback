import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../../core/services/currency.service';

@Pipe({
  name: 'appCurrency',
  pure: false, // Not pure since it depends on service state that can change
  standalone: true
})
export class AppCurrencyPipe implements PipeTransform {
  private readonly currencyService = inject(CurrencyService);

  transform(amount: number, decimals = 2, space = false): string {
    const symbol = this.currencyService.getSymbolSync() || '$';
    const n = isFinite(amount) ? amount : 0;
    const formatted = n.toFixed(decimals);
    
    return space ? `${symbol} ${formatted}` : `${symbol}${formatted}`;
  }
}