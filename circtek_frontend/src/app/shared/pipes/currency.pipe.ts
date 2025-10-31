import { Pipe, PipeTransform, inject, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { CurrencyService } from '../../core/services/currency.service';
import { Observable, map } from 'rxjs';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false // Important: makes pipe reactive to service changes
})
export class CurrencyPipe implements PipeTransform {
  private readonly currencyService = inject(CurrencyService);

  transform(
    amount: number, 
    options: { decimals?: number; space?: boolean } = {}
  ): Observable<string> {
    const { decimals = 2, space = false } = options;
    
    return this.currencyService.current$.pipe(
      map(currency => {
        const n = isFinite(amount) ? amount : 0;
        const formatted = n.toFixed(decimals);
        return space ? `${currency.symbol} ${formatted}` : `${currency.symbol}${formatted}`;
      })
    );
  }
}