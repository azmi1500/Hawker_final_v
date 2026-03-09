declare module 'react-native-thermal-receipt-printer' {
  export interface PrinterOptions {
    [key: string]: any;
  }

  export function printBill(content: string, options?: PrinterOptions): Promise<any>;
  export function printHTML(content: string, options?: PrinterOptions): Promise<any>;
  export function printRawData(data: any[], options?: PrinterOptions): Promise<any>;
  
  // Add any other functions you use
}