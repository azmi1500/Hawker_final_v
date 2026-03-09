// frontend/src/utils/currencyHelper.ts

export class CurrencyHelper {
  
  // Format price with currency symbol
  static formatPrice(amount: number, currencySymbol: string = '$'): string {
    return `${currencySymbol}${amount.toFixed(2)}`;
  }

  // Format for display
  static formatForDisplay(amount: number, currencyCode: string = 'SGD'): string {
    const symbols: Record<string, string> = {
      'SGD': '$',
      'MYR': 'RM',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥',
      'CNY': '¥',
      'THB': '฿',
      'VND': '₫',
      'IDR': 'Rp',
      'KRW': '₩'
    };
    
    const symbol = symbols[currencyCode] || '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  // Get all currencies
  static getCurrencies() {
    return [
      { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
      { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
      { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
      { code: 'THB', symbol: '฿', name: 'Thai Baht' },
      { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
      { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
      { code: 'KRW', symbol: '₩', name: 'South Korean Won' }
    ];
  }
}