// frontend/src/components/UniversalPrinter.ts - FIXED WITH TIMEOUT ✅

import { Alert, Platform, NativeModules } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import BillPDFGenerator from './BillPDFGenerator';

// Printer types
export type PrinterType = 
  | 'thermal'      // Thermal receipt printer (Sunmi, Epson TM, etc.)
  | 'receipt'      // Standard receipt printer
  | 'label'        // Label printer (Zebra, etc.)
  | 'laser'        // Laser/Inkjet printer (A4)
  | 'bluetooth'    // Bluetooth printer
  | 'network'      // Network printer (WiFi/Ethernet)
  | 'usb'          // USB connected printer
  | 'unknown';

interface PrinterInfo {
  type: PrinterType;
  name: string;
  address?: string;
  isDefault: boolean;
  paperSize?: '58mm' | '80mm' | 'A4' | 'label';
}

class UniversalPrinter {
  
  private static detectedPrinters: PrinterInfo[] = [];
  private static defaultPrinter: PrinterInfo | null = null;

  /**
   * 🔍 DETECT ALL PRINTER TYPES
   */
  static async detectAllPrinters(): Promise<PrinterInfo[]> {
    const printers: PrinterInfo[] = [];
    
    if (Platform.OS !== 'android') return printers;
    
    try {
      // 1️⃣ SUNMI THERMAL PRINTER (Built-in)
      try {
        const SunmiPrinter = require('react-native-sunmi-inner-printer');
        if (SunmiPrinter) {
          const hasPrinter = await SunmiPrinter.hasPrinter();
          if (hasPrinter) {
            printers.push({
              type: 'thermal',
              name: 'Sunmi Thermal Printer',
              isDefault: true,
              paperSize: '58mm'
            });
            console.log('✅ Sunmi Thermal Printer detected');
          }
        }
      } catch (e) {}

      // 2️⃣ BLUETOOTH PRINTERS
      try {
        const BluetoothPrinter = require('react-native-bluetooth-printer');
        const devices = await BluetoothPrinter.getDeviceList();
        devices.forEach((device: any) => {
          printers.push({
            type: 'bluetooth',
            name: device.name || 'Bluetooth Printer',
            address: device.address,
            isDefault: false,
            paperSize: this.guessPaperSize(device.name)
          });
        });
        console.log(`✅ ${devices.length} Bluetooth printers detected`);
      } catch (e) {}

      // 3️⃣ NETWORK PRINTERS (WiFi/Ethernet)
      try {
        const NetPrinter = require('react-native-thermal-printer');
        const printers_list = await NetPrinter.getPrinterList();
        printers_list.forEach((printer: any) => {
          printers.push({
            type: 'network',
            name: printer.name || 'Network Printer',
            address: printer.address,
            isDefault: false,
            paperSize: '80mm'
          });
        });
      } catch (e) {}

      // 4️⃣ USB PRINTERS
      try {
        const UsbPrinter = require('react-native-usb-printer');
        const devices = await UsbPrinter.getDeviceList();
        devices.forEach((device: any) => {
          printers.push({
            type: 'usb',
            name: device.name || 'USB Printer',
            address: device.address,
            isDefault: false
          });
        });
      } catch (e) {}

      // 5️⃣ CHECK ANDROID PRINT SERVICE (for Laser/Inkjet)
      try {
        const hasPrintService = await this.checkAndroidPrintService();
        if (hasPrintService) {
          printers.push({
            type: 'laser',
            name: 'Android Print Service',
            isDefault: false,
            paperSize: 'A4'
          });
        }
      } catch (e) {}

      // Store detected printers
      this.detectedPrinters = printers;
      
      // Set default printer (first thermal, then first of any)
      this.defaultPrinter = printers.find(p => p.type === 'thermal') || printers[0] || null;
      
      return printers;
      
    } catch (error) {
      console.log('❌ Printer detection error:', error);
      return [];
    }
  }

  /**
   * 🔍 Guess paper size from printer name
   */
  private static guessPaperSize(printerName: string): '58mm' | '80mm' | 'A4' | 'label' {
    const name = printerName.toLowerCase();
    if (name.includes('58') || name.includes('2inch')) return '58mm';
    if (name.includes('80') || name.includes('3inch')) return '80mm';
    if (name.includes('label') || name.includes('zebra')) return 'label';
    if (name.includes('laser') || name.includes('inkjet')) return 'A4';
    return '80mm'; // default
  }

  /**
   * 📏 Get print width based on printer type and paper size
   */
  private static getPrintWidth(printer: PrinterInfo): number {
    switch (printer.paperSize) {
      case '58mm': return 164;  // 58mm thermal
      case '80mm': return 226;  // 80mm receipt
      case 'A4': return 612;    // A4 paper
      case 'label': return 300;  // Label printer
      default: return 226;
    }
  }

  /**
   * 🖨️ PRINT WITH AUTO PRINTER DETECTION
   */
  static async smartPrint(
    saleData: any, 
    userId?: string | number, 
    t?: any,
    preferredType?: PrinterType
  ): Promise<boolean> {
    try {
      // Detect all printers
      const printers = await this.detectAllPrinters();
      console.log('📋 Available printers:', printers.map(p => `${p.name} (${p.type})`));

      if (printers.length === 0) {
        // No printers - fallback to PDF
        return await this.offerPDFFallback(saleData, userId, t);
      }

      // Select printer (preferred type or default)
      let selectedPrinter = preferredType 
        ? printers.find(p => p.type === preferredType)
        : this.defaultPrinter;

      if (!selectedPrinter) {
        selectedPrinter = printers[0]; // First available
      }

      console.log(`🎯 Selected printer: ${selectedPrinter.name} (${selectedPrinter.type})`);

      // ✅ ADD TIMEOUT TO ALL PRINT OPERATIONS
      const printWithTimeout = async (printFn: () => Promise<boolean>, timeoutMs = 5000) => {
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Print timeout')), timeoutMs);
        });
        
        return Promise.race([
          printFn(),
          timeoutPromise
        ]) as Promise<boolean>;
      };

      // Print based on printer type
      let printed = false;

      switch (selectedPrinter.type) {
        case 'thermal':
        case 'receipt':
          printed = await printWithTimeout(() => this.printThermalReceipt(saleData, userId, selectedPrinter));
          break;
        case 'label':
          printed = await printWithTimeout(() => this.printLabel(saleData, selectedPrinter));
          break;
        case 'laser':
          printed = await printWithTimeout(() => this.printLaser(saleData, userId, selectedPrinter));
          break;
        case 'bluetooth':
          printed = await printWithTimeout(() => this.printBluetooth(saleData, userId, selectedPrinter));
          break;
        case 'network':
          printed = await printWithTimeout(() => this.printNetwork(saleData, userId, selectedPrinter));
          break;
        case 'usb':
          printed = await printWithTimeout(() => this.printUSB(saleData, userId, selectedPrinter));
          break;
        default:
          printed = await printWithTimeout(() => this.printThermalReceipt(saleData, userId, selectedPrinter));
      }

      if (printed) {
        Alert.alert('✅ Success', `Printed on ${selectedPrinter.name}`);
        return true;
      }

      // If selected printer fails, offer PDF
      return await this.offerPDFFallback(saleData, userId, t);

    } catch (error) {
      console.log('❌ Smart print error:', error);
      return await this.offerPDFFallback(saleData, userId, t);
    }
  }

  /**
   * 🔥 Print Thermal Receipt (58mm/80mm) - WITH TIMEOUT
   */
  private static async printThermalReceipt(
    saleData: any, 
    userId?: string | number,
    printer?: PrinterInfo
  ): Promise<boolean> {
    try {
      // ✅ Load settings with timeout
      let company;
      try {
        const settingsPromise = BillPDFGenerator.loadSettings(userId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Settings timeout')), 3000)
        );
        company = await Promise.race([settingsPromise, timeoutPromise]);
      } catch {
        console.log('⚠️ Using default settings for thermal print');
        company = this.getDefaultSettings(saleData);
      }

      const width = this.getPrintWidth(printer || { paperSize: '58mm' } as PrinterInfo);
      
      // Try Sunmi first
      try {
        const SunmiPrinter = require('react-native-sunmi-inner-printer');
        if (SunmiPrinter) {
          await SunmiPrinter.initPrinter();
          const text = this.formatThermalText(saleData, company);
          await SunmiPrinter.printText(text);
          await SunmiPrinter.cutPaper();
          return true;
        }
      } catch (e) {}

      // Try other thermal libraries
      try {
        const ThermalPrinter = require('react-native-thermal-printer');
        await ThermalPrinter.printText(this.formatThermalText(saleData, company));
        return true;
      } catch (e) {}

      return false;

    } catch (error) {
      console.log('❌ Thermal print error:', error);
      return false;
    }
  }

  /**
   * 📄 Print Laser/Inkjet (A4) - FIXED WITH TIMEOUT
   */
  private static async printLaser(
    saleData: any,
    userId?: string | number,
    printer?: PrinterInfo
  ): Promise<boolean> {
    try {
      // ✅ Load settings with timeout - don't wait more than 3 seconds
      let company;
      let html;
      
      try {
        console.log('📄 Loading settings for laser print...');
        const settingsPromise = BillPDFGenerator.loadSettings(userId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Settings timeout')), 3000)
        );
        
        company = await Promise.race([settingsPromise, timeoutPromise]);
        console.log('✅ Settings loaded successfully');
        
        // Generate HTML with company settings
        html = await BillPDFGenerator.generateHTML(saleData, userId);
        
      } catch (settingsError) {
        console.log('⚠️ Settings timeout - using minimal template');
        // Use minimal template without waiting for API
        html = this.generateMinimalHTML(saleData);
      }

      // ✅ Print immediately - don't wait for anything else
      console.log('🖨️ Sending to Android print service...');
      await Print.printAsync({ 
        html,
        orientation: Print.Orientation.portrait
      });
      
      console.log('✅ Print job sent successfully');
      return true;
      
    } catch (error) {
      console.log('❌ Laser print error:', error);
      return false;
    }
  }

  /**
   * 📝 Generate minimal HTML when settings fail
   */
  private static generateMinimalHTML(saleData: any): string {
    const date = new Date();
    const symbol = '$'; // Default
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; max-width: 80mm; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .shop-name { font-size: 20px; font-weight: bold; }
          .items { width: 100%; border-collapse: collapse; }
          .items td { padding: 8px 0; border-bottom: 1px dashed #ccc; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
          .footer { text-align: center; margin-top: 30px; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${saleData.shopName || 'POS System'}</div>
          <div>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>
        </div>
        
        <table class="items">
          ${saleData.items.map((item: any) => `
            <tr>
              <td>${item.name} x${item.quantity}</td>
              <td align="right">${symbol}${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        
        <hr/>
        <div class="total">
          Total: ${symbol}${saleData.total.toFixed(2)}
        </div>
        <div class="footer">
          Thank you! Come again!
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 🏷️ Print Label (for barcode/label printers)
   */
  private static async printLabel(
    saleData: any,
    printer: PrinterInfo
  ): Promise<boolean> {
    try {
      let company = await this.getSettingsWithTimeout(saleData, printer);
      let labelText = '';
      saleData.items.forEach((item: any) => {
        labelText += `${item.name}\n`;
        labelText += `Qty: ${item.quantity}\n`;
        labelText += `Price: ${company?.currencySymbol || '$'}${(item.price * item.quantity).toFixed(2)}\n`;
        labelText += '---\n';
      });

      try {
        const LabelPrinter = require('react-native-label-printer');
        await LabelPrinter.print(labelText);
        return true;
      } catch (e) {}

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📱 Print Bluetooth
   */
  private static async printBluetooth(
    saleData: any,
    userId?: string | number,
    printer?: PrinterInfo
  ): Promise<boolean> {
    try {
      const BluetoothPrinter = require('react-native-bluetooth-printer');
      
      if (printer?.address) {
        await BluetoothPrinter.connect(printer.address);
      }
      
      const company = await this.getSettingsWithTimeout(saleData, printer);
      const text = this.formatThermalText(saleData, company);
      await BluetoothPrinter.print(text);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🌐 Print Network Printer
   */
  private static async printNetwork(
    saleData: any,
    userId?: string | number,
    printer?: PrinterInfo
  ): Promise<boolean> {
    try {
      const NetPrinter = require('react-native-thermal-printer');
      const company = await this.getSettingsWithTimeout(saleData, printer);
      
      await NetPrinter.printIP(printer?.address || '', {
        text: this.formatThermalText(saleData, company)
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🔌 Print USB Printer
   */
  private static async printUSB(
    saleData: any,
    userId?: string | number,
    printer?: PrinterInfo
  ): Promise<boolean> {
    try {
      const UsbPrinter = require('react-native-usb-printer');
      const company = await this.getSettingsWithTimeout(saleData, printer);
      
      if (printer?.address) {
        await UsbPrinter.connect(printer.address);
      }
      
      await UsbPrinter.print(this.formatThermalText(saleData, company));
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * ⏱️ Helper to get settings with timeout
   */
  private static async getSettingsWithTimeout(saleData: any, printer?: PrinterInfo): Promise<any> {
    try {
      const settingsPromise = BillPDFGenerator.loadSettings(saleData.userId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Settings timeout')), 2000)
      );
      
      return await Promise.race([settingsPromise, timeoutPromise]);
    } catch {
      return this.getDefaultSettings(saleData);
    }
  }

  /**
   * 📝 Get default settings
   */
  private static getDefaultSettings(saleData: any): any {
    return {
      name: saleData.shopName || 'POS System',
      address: '',
      gstNo: '',
      gstPercentage: 9,
      phone: '',
      email: '',
      cashierName: saleData.cashier || 'Admin',
      currency: 'SGD',
      currencySymbol: '$',
    };
  }

  /**
   * 📝 Format text for thermal printers
   */
  private static formatThermalText(saleData: any, company: any): string {
    const symbol = company.currencySymbol || '$';
    let text = '\n';
    text += '='.repeat(32) + '\n';
    text += (company.name || 'POS').padCenter(32) + '\n';
    text += '='.repeat(32) + '\n';
    text += `Bill: ${Date.now()}\n`;
    text += `Date: ${new Date().toLocaleString()}\n`;
    text += '-'.repeat(32) + '\n';
    
    saleData.items.forEach((item: any) => {
      const name = (item.name || 'Item').substring(0, 15).padEnd(15);
      const total = (item.price * item.quantity).toFixed(2);
      text += `${name} ${item.quantity}  ${symbol}${total}\n`;
    });
    
    text += '-'.repeat(32) + '\n';
    text += `Total: ${symbol}${saleData.total.toFixed(2)}\n`;
    text += '='.repeat(32) + '\n';
    text += 'THANK YOU!\n';
    text += '\n\n';
    
    return text;
  }

  /**
   * ✅ Check Android Print Service
   */
  private static async checkAndroidPrintService(): Promise<boolean> {
    return Platform.OS === 'android';
  }

  /**
   * 📄 PDF Fallback
   */
  static async offerPDFFallback(saleData: any, userId?: string | number, t?: any): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        t?.printerNotFound || '🖨️ No Printer Available',
        t?.wantPDF || 'Save as PDF?',
        [
          { text: t?.no || 'No', onPress: () => resolve(false), style: 'cancel' },
          { text: t?.yes || 'Yes', onPress: async () => {
              try {
                // ✅ Generate PDF with timeout
                let html;
                try {
                  html = await BillPDFGenerator.generateHTML(saleData, userId);
                } catch {
                  html = this.generateMinimalHTML(saleData);
                }
                
                const { uri } = await Print.printToFileAsync({ html, width: 226 });
                if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
                resolve(true);
              } catch { resolve(false); }
            }
          }
        ]
      );
    });
  }

  /**
   * 🧪 Test all printers
   */
  static async testAllPrinters(): Promise<void> {
    const printers = await this.detectAllPrinters();
    
    let message = `📋 Found ${printers.length} printer(s):\n\n`;
    printers.forEach((p, i) => {
      message += `${i+1}. ${p.name}\n`;
      message += `   Type: ${p.type}\n`;
      message += `   Paper: ${p.paperSize || 'Unknown'}\n`;
      message += `   Default: ${p.isDefault ? '✅' : '❌'}\n\n`;
    });
    
    Alert.alert('Printer Detection', message);
  }
}

// Add padCenter method if not available
declare global {
  interface String {
    padCenter(length: number, char?: string): string;
  }
}

String.prototype.padCenter = function(length: number, char: string = ' '): string {
  const str = this.toString();
  const spaces = length - str.length;
  const left = Math.floor(spaces / 2);
  const right = spaces - left;
  return char.repeat(left) + str + char.repeat(right);
};

export default UniversalPrinter;