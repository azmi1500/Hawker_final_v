import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import BillPDFGenerator from './BillPDFGenerator';
import UniversalPrinter from './UniversalPrinter';  // ✅ Import UniversalPrinter

class PrinterManager {
  
  // ✅ STEP 1: Check if printer is available
  static async isPrinterAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // Use UniversalPrinter to detect printer type
      const printerType = await UniversalPrinter.getPrinterType();
      return printerType !== 'pdf'; // If not PDF, printer available
      
    } catch (error) {
      console.log('Printer check error:', error);
      return false;
    }
  }
  
  // ✅ STEP 2: Try to print directly (using UniversalPrinter)
  static async tryPrint(saleData: any, userId?: string | number): Promise<boolean> {
    try {
      // Use UniversalPrinter's smartPrint
      const printed = await UniversalPrinter.smartPrint(saleData, userId);
      return printed;
      
    } catch (error) {
      console.log('Print failed:', error);
      return false;
    }
  }
  
  // ✅ STEP 3: Generate PDF (same as before)
  static async generatePDF(saleData: any, userId?: string | number): Promise<string | null> {
    try {
      const html = await BillPDFGenerator.generateHTML(saleData, userId);
      const { uri } = await Print.printToFileAsync({
        html: html,
        base64: false
      });
      return uri;
    } catch (error) {
      console.log('PDF generation failed:', error);
      return null;
    }
  }
  
  // ✅ STEP 4: Share PDF (same as before)
  static async sharePDF(pdfUri: string): Promise<boolean> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Bill Receipt',
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  
  // ✅ MAIN FUNCTION: Complete flow with translations
  static async handleBillPrint(
    saleData: any, 
    t: any,
    userId?: string | number,
    onComplete?: () => void
  ): Promise<void> {
    
    // Show checking message
    Alert.alert(
      t?.checkingPrinter || '🖨️ Checking Printer',
      t?.pleaseWait || 'Please wait...',
      [{ text: t?.ok || 'OK' }]
    );
    
    // STEP 1: Check printer availability
    const hasPrinter = await this.isPrinterAvailable();
    
    if (hasPrinter) {
      // ✅ PRINTER AVAILABLE - Try to print using UniversalPrinter
      const printed = await this.tryPrint(saleData, userId);
      
      if (printed) {
        Alert.alert(
          t?.printSuccess || '✅ Print Success',
          t?.billGenerated || 'Bill printed successfully!',
          [
            { 
              text: t?.ok || 'OK', 
              onPress: () => {
                if (onComplete) onComplete();
              }
            }
          ]
        );
      } else {
        // Printer available but print failed
        Alert.alert(
          t?.printFailed || '❌ Print Failed',
          t?.printerNotResponding || 'Printer not responding. Do you want PDF?',
          [
            { 
              text: t?.yes || 'Yes', 
              onPress: () => this.handlePDFOption(saleData, t, userId, onComplete)
            },
            { 
              text: t?.no || 'No', 
              onPress: () => {
                Alert.alert(
                  t?.success || '✅ Transaction Success',
                  t?.saleCompleted || 'Sale completed without bill',
                  [{ text: t?.ok || 'OK', onPress: onComplete }]
                );
              },
              style: 'cancel'
            }
          ]
        );
      }
      
    } else {
      // ❌ NO PRINTER - Ask for PDF
      Alert.alert(
        t?.printerNotFound || '🖨️ No Printer Detected',
        t?.wantPDF || 'No printer is available. Do you want PDF?',
        [
          { 
            text: t?.yes || 'Yes', 
            onPress: () => this.handlePDFOption(saleData, t, userId, onComplete)
          },
          { 
            text: t?.no || 'No', 
            onPress: () => {
              Alert.alert(
                t?.success || '✅ Transaction Success',
                t?.saleCompleted || 'Sale completed without bill',
                [{ text: t?.ok || 'OK', onPress: onComplete }]
              );
            },
            style: 'cancel'
          }
        ]
      );
    }
  }
  
  // Handle PDF option with translations
  static async handlePDFOption(
    saleData: any, 
    t: any,
    userId?: string | number,
    onComplete?: () => void
  ): Promise<void> {
    
    // Generate PDF
    const pdfUri = await this.generatePDF(saleData, userId);
    
    if (pdfUri) {
      // Share PDF
      const shared = await this.sharePDF(pdfUri);
      
      if (shared) {
        Alert.alert(
          t?.pdfGenerated || '✅ PDF Generated',
          t?.billSaved || 'Bill saved successfully!',
          [{ text: t?.ok || 'OK', onPress: onComplete }]
        );
      } else {
        Alert.alert(
          t?.pdfReady || '📄 PDF Ready',
          t?.billSavedAt || `Bill saved at:\n${pdfUri}`,
          [{ text: t?.ok || 'OK', onPress: onComplete }]
        );
      }
    } else {
      Alert.alert(
        t?.error || '❌ Error',
        t?.pdfFailed || 'Failed to generate PDF',
        [{ text: t?.ok || 'OK', onPress: onComplete }]
      );
    }
  }
}

export default PrinterManager;