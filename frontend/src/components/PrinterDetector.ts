// components/PrinterDetector.ts
import { NativeModules, Platform } from 'react-native';

export class PrinterDetector {
  
  // Check what printer is available
  static async detectPrinter(): Promise<string> {
    if (Platform.OS !== 'android') return 'pdf';
    
    try {
      // Check for Sunmi printer
      if (NativeModules.SunmiPrinter) {
        const hasPrinter = await NativeModules.SunmiPrinter.hasPrinter();
        if (hasPrinter) return 'sunmi';
      }
      
      // Check for built-in print service
      const hasPrintService = await this.checkPrintService();
      if (hasPrintService) return 'android_print';
      
      // Default to PDF
      return 'pdf';
      
    } catch (error) {
      return 'pdf';
    }
  }
  
  static async checkPrintService(): Promise<boolean> {
    // Android always has print service
    return Platform.OS === 'android';
  }
}