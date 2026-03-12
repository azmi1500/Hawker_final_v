// components/BillPDFGenerator.ts - SINGAPORE GST INCLUSIVE ✅

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import API from '../api';

interface CompanySettings {
  name: string;
  address: string;
  gstNo: string;
  gstPercentage: number;
  phone: string;
  email: string;
  cashierName: string;
  currency: string;
  currencySymbol: string;
}

class BillPDFGenerator {
  
  static async loadSettings(userId?: string | number): Promise<CompanySettings> {
    try {
      if (!userId) return this.getDefaultSettings();
      
      const response = await API.get(`/company-settings/${userId}`);
      
      if (response.data && response.data.success) {
        const settings = response.data.settings;
        return {
          name: settings.CompanyName || '',
          address: settings.Address || '',
          gstNo: settings.GSTNo || '',
          gstPercentage: settings.GSTPercentage || 9,
          phone: settings.Phone || '',
          email: settings.Email || '',
          cashierName: settings.CashierName || '',
          currency: settings.Currency || 'SGD',
          currencySymbol: settings.CurrencySymbol || '$',
        };
      }
      return this.getDefaultSettings();
    } catch (error) {
      return this.getDefaultSettings();
    }
  }

  private static getDefaultSettings(): CompanySettings {
    return {
      name: '',
      address: '',
      gstNo: '',
      gstPercentage: 9,
      phone: '',
      email: '',
      cashierName: '',
      currency: 'SGD',
      currencySymbol: '$',
    };
  }
  static async saveSettings(settings: CompanySettings, userId?: string | number): Promise<boolean> {
    try {
      if (!userId) return false;
      
      const dbSettings = {
        CompanyName: settings.name,
        Address: settings.address,
        GSTNo: settings.gstNo,
        GSTPercentage: settings.gstPercentage,
        Phone: settings.phone,
        Email: settings.email,
        CashierName: settings.cashierName,
        Currency: settings.currency,
        CurrencySymbol: settings.currencySymbol
      };
      
      const response = await API.post(`/company-settings/${userId}`, dbSettings);
      return response.data?.success || false;
      
    } catch (error) {
      console.log('❌ Error saving settings:', error);
      return false;
    }
  }
  // ✅ GENERATE HTML WITH SINGAPORE GST INCLUSIVE
  static async generateHTML(saleData: any, userId?: string | number): Promise<string> {
    const company = await this.loadSettings(userId);
    
    const date = new Date();
    const billNo = `INV-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(1000 + Math.random()*9000)}`;
    
    // ✅ SINGAPORE GST INCLUSIVE FORMULA
    const hasGST = company.gstPercentage > 0;
    const gstRate = company.gstPercentage || 9;
    
    // Total with GST included
    const grandTotal = saleData.total; // This already includes GST
    
    // Calculate GST component (back calculation)
    // If total includes 9% GST, then GST = total × (9/109)
    const gstAmount = hasGST ? grandTotal * (gstRate / (100 + gstRate)) : 0;
    const amountWithoutGST = hasGST ? grandTotal - gstAmount : grandTotal;
    
    const currencySymbol = company.currencySymbol || '$';

    // Generate items HTML
    const itemsHTML = saleData.items.map((item: any) => `
      <tr>
        <td class="item-name">${item.name}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">${currencySymbol}${item.price.toFixed(2)}</td>
        <td class="item-total">${currencySymbol}${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Tax Invoice</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Courier New', Courier, monospace;
            background: #fff;
            display: flex;
            justify-content: center;
            padding: 0;
            margin: 0;
          }
          
         
          .receipt {
            width: 72mm;
            max-width: 72mm;
            background: white;
            padding: 3mm 2mm;
            margin: 0 auto;
          }
          
         
          .header {
            text-align: center;
            margin-bottom: 4mm;
            border-bottom: 2px solid #000;
            padding-bottom: 2mm;
          }
          
          .shop-name {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 2mm;
            letter-spacing: 1px;
          }
          
          .shop-address {
            font-size: 10px;
            font-weight: 400;
            line-height: 1.3;
            margin-bottom: 1mm;
          }
          
          .gst-no {
            font-size: 10px;
            font-weight: 700;
            background: #f0f0f0;
            padding: 1mm;
            margin: 2mm 0;
          }
          
         
          .bill-details {
            margin-bottom: 4mm;
            padding: 2mm;
            border: 1px solid #000;
            font-size: 11px;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          
          .detail-label {
            font-weight: 700;
          }
          
          .detail-value {
            font-weight: 400;
          }
          
        
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4mm;
            font-size: 11px;
          }
          
          .items-table th {
            font-weight: 800;
            text-align: center;
            padding: 2mm 1mm;
            border-bottom: 2px solid #000;
            border-top: 2px solid #000;
            text-transform: uppercase;
            font-size: 11px;
          }
          
          .items-table th:first-child { text-align: left; }
          .items-table th:last-child { text-align: right; }
          
          .items-table td {
            padding: 1.5mm 1mm;
            border-bottom: 1px dashed #ccc;
            font-weight: 400;
          }
          
          .item-name {
            text-align: left;
            font-weight: 400;
            max-width: 35mm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .item-qty {
            text-align: center;
            font-weight: 700;
          }
          
          .item-price {
            text-align: right;
            font-weight: 400;
          }
          
          .item-total {
            text-align: right;
            font-weight: 700;
          }
          
        
          .totals {
            margin-bottom: 4mm;
            padding: 2mm;
            border: 1px solid #000;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 11px;
          }
          
          .total-label {
            font-weight: 700;
          }
          
          .total-value {
            font-weight: 700;
          }
          
          .grand-total {
            display: flex;
            justify-content: space-between;
            margin-top: 2mm;
            padding-top: 2mm;
            border-top: 2px solid #000;
            font-weight: 800;
            font-size: 14px;
          }
          
          .grand-label {
            font-weight: 800;
          }
          
          .grand-value {
            font-weight: 800;
            color: #000;
          }
          
         
          .payment-info {
            margin-bottom: 4mm;
            padding: 2mm;
            border: 1px solid #000;
            background: #f9f9f9;
          }
          
          .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 11px;
          }
          
          .payment-label {
            font-weight: 700;
          }
          
          .payment-value {
            font-weight: 700;
          }
          
          
          .footer {
            text-align: center;
            padding-top: 3mm;
            border-top: 2px solid #000;
          }
          
          .thankyou {
            font-size: 14px;
            font-weight: 800;
            margin-bottom: 2mm;
          }
          
          .contact {
            font-size: 9px;
            font-weight: 400;
            line-height: 1.3;
            margin-bottom: 1mm;
          }
          
 
.copyright {
  font-size: 8px;
  font-weight: 800;      
  color: #000000;
  margin-top: 2mm;
}
        </style>
      </head>
      <body>
        <div class="receipt">
          
          
          <div class="header">
            <div class="shop-name">${company.name || 'POS SYSTEM'}</div>
            <div class="shop-address">${company.address}</div>
            ${company.gstNo ? `<div class="gst-no">GST: ${company.gstNo}</div>` : ''}
            <div class="contact">${company.phone ? `📞 ${company.phone}` : ''} ${company.email ? `📧 ${company.email}` : ''}</div>
          </div>
          
        
          <div class="bill-details">
            <div class="detail-row">
              <span class="detail-label">Bill No:</span>
              <span class="detail-value">${billNo}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
            </div>
            ${company.cashierName ? `
            <div class="detail-row" style="margin-top: 2mm; border-top: 1px dashed #000; padding-top: 2mm;">
              <span class="detail-label">Cashier:</span>
              <span class="detail-value">${company.cashierName}</span>
            </div>
            ` : ''}
          </div>
          
         
          <table class="items-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>QTY</th>
                <th>PRICE</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span class="total-label">Sub Total (without GST):</span>
              <span class="total-value">${currencySymbol}${amountWithoutGST.toFixed(2)}</span>
            </div>
            ${hasGST ? `
            <div class="total-row">
              <span class="total-label">GST (${gstRate}%):</span>
              <span class="total-value">${currencySymbol}${gstAmount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="grand-total">
              <span class="grand-label">GRAND TOTAL (incl GST):</span>
              <span class="grand-value">${currencySymbol}${grandTotal.toFixed(2)}</span>
            </div>
          </div>
     
          <div class="payment-info">
            <div class="payment-row">
              <span class="payment-label">Payment:</span>
              <span class="payment-value">${saleData.paymentMethod || 'Cash'}</span>
            </div>
            ${saleData.cashPaid ? `
            <div class="payment-row">
              <span class="payment-label">Paid:</span>
              <span class="payment-value">${currencySymbol}${saleData.cashPaid.toFixed(2)}</span>
            </div>
            <div class="payment-row">
              <span class="payment-label">Change:</span>
              <span class="payment-value">${currencySymbol}${(saleData.change || 0).toFixed(2)}</span>
            </div>
            ` : ''}
          </div>
          
        
          <div class="footer">
            <div class="thankyou">THANK YOU! COME AGAIN!</div>
            <div class="copyright">UNIPRO SOFTWARES SG PTE LTD</div>
          </div>
          
        </div>
      </body>
      </html>
    `;
  }

  static async generatePDF(saleData: any, userId?: string | number): Promise<string> {
    try {
      const html = await this.generateHTML(saleData, userId);
      
      const { uri } = await Print.printToFileAsync({
        html: html,
        base64: false,
        width: 226
      });
      
      return uri;
    } catch (error) {
      throw error;
    }
  }

  static async downloadPDF(saleData: any, userId?: string | number): Promise<void> {
    try {
      const pdfUri = await this.generatePDF(saleData, userId);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Receipt',
        });
      } else {
        Alert.alert('✅ Receipt Ready', `Saved at:\n${pdfUri}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate receipt');
    }
  }
}

export default BillPDFGenerator;