const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { execute, getOne } = require('../database');

// Ensure invoices directory exists
const invoicesDir = path.join(__dirname, '..', 'invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber() {
  const prefix = process.env.INVOICE_PREFIX || 'INV';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Generate PDF invoice
 */
async function generateInvoice(client, subscription, invoiceType = 'new') {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    const invoiceDate = new Date();
    
    // Company info from env
    const companyName = process.env.COMPANY_NAME || 'IPTV Solutions';
    const companyAddress = process.env.COMPANY_ADDRESS || 'Business Address';
    const companyPhone = process.env.COMPANY_PHONE || '+1234567890';
    const companyEmail = process.env.COMPANY_EMAIL || 'info@example.com';
    const companyWebsite = process.env.COMPANY_WEBSITE || 'www.example.com';
    const currency = process.env.CURRENCY_SYMBOL || '$';
    const taxRate = parseFloat(process.env.TAX_RATE || 0);

    // Calculate amounts
    const amount = parseFloat(subscription.price || 0);
    const taxAmount = (amount * taxRate) / 100;
    const totalAmount = amount + taxAmount;

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `${invoiceNumber}.pdf`;
    const filepath = path.join(invoicesDir, filename);
    
    // Pipe to file
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header - Company Info
    doc.fontSize(24)
       .fillColor('#2563eb')
       .text(companyName, 50, 50);
    
    doc.fontSize(10)
       .fillColor('#64748b')
       .text(companyAddress, 50, 85)
       .text(`Phone: ${companyPhone}`, 50, 100)
       .text(`Email: ${companyEmail}`, 50, 115)
       .text(`Web: ${companyWebsite}`, 50, 130);

    // Invoice Title
    doc.fontSize(28)
       .fillColor('#1e293b')
       .text('INVOICE', 400, 50, { align: 'right' });
    
    doc.fontSize(10)
       .fillColor('#64748b')
       .text(`Invoice #: ${invoiceNumber}`, 400, 85, { align: 'right' })
       .text(`Date: ${format(invoiceDate, 'dd/MM/yyyy')}`, 400, 100, { align: 'right' })
       .text(`Type: ${invoiceType === 'new' ? 'New Subscription' : 'Renewal'}`, 400, 115, { align: 'right' });

    // Line separator
    doc.moveTo(50, 160)
       .lineTo(545, 160)
       .strokeColor('#e2e8f0')
       .stroke();

    // Bill To Section
    doc.fontSize(12)
       .fillColor('#1e293b')
       .text('BILL TO:', 50, 180);
    
    doc.fontSize(10)
       .fillColor('#475569')
       .text(client.name, 50, 200)
       .text(client.email || '', 50, 215)
       .text(client.phone, 50, 230)
       .text(client.address || '', 50, 245);

    // Subscription Details Box
    const boxTop = 180;
    doc.rect(320, boxTop, 225, 100)
       .fillAndStroke('#f8fafc', '#e2e8f0');
    
    doc.fillColor('#1e293b')
       .fontSize(10)
       .text('SUBSCRIPTION DETAILS', 330, boxTop + 10);
    
    doc.fillColor('#475569')
       .fontSize(9)
       .text(`Username: ${subscription.username}`, 330, boxTop + 30)
       .text(`Duration: ${subscription.package_duration} month(s)`, 330, boxTop + 45)
       .text(`Start: ${format(new Date(subscription.start_date), 'dd/MM/yyyy')}`, 330, boxTop + 60)
       .text(`Expiry: ${format(new Date(subscription.end_date), 'dd/MM/yyyy')}`, 330, boxTop + 75);

    // Items Table
    const tableTop = 320;
    
    // Table Header
    doc.rect(50, tableTop, 495, 30)
       .fillAndStroke('#2563eb', '#2563eb');
    
    doc.fillColor('#ffffff')
       .fontSize(10)
       .text('DESCRIPTION', 60, tableTop + 10)
       .text('DURATION', 300, tableTop + 10)
       .text('AMOUNT', 480, tableTop + 10, { align: 'right', width: 55 });

    // Table Row
    const rowTop = tableTop + 30;
    doc.rect(50, rowTop, 495, 40)
       .fillAndStroke('#ffffff', '#e2e8f0');
    
    const packageName = invoiceType === 'new' ? 'IPTV Subscription Package' : 'IPTV Subscription Renewal';
    doc.fillColor('#1e293b')
       .fontSize(10)
       .text(packageName, 60, rowTop + 12)
       .text(`${subscription.package_duration} month(s)`, 300, rowTop + 12)
       .text(`${currency}${amount.toFixed(2)}`, 480, rowTop + 12, { align: 'right', width: 55 });

    // Subtotal, Tax, Total
    let summaryTop = rowTop + 60;
    
    doc.fillColor('#64748b')
       .fontSize(10)
       .text('Subtotal:', 380, summaryTop)
       .text(`${currency}${amount.toFixed(2)}`, 480, summaryTop, { align: 'right', width: 55 });
    
    if (taxRate > 0) {
      summaryTop += 20;
      doc.text(`Tax (${taxRate}%):`, 380, summaryTop)
         .text(`${currency}${taxAmount.toFixed(2)}`, 480, summaryTop, { align: 'right', width: 55 });
    }
    
    summaryTop += 30;
    doc.rect(380, summaryTop - 5, 165, 30)
       .fillAndStroke('#f1f5f9', '#e2e8f0');
    
    doc.fontSize(12)
       .fillColor('#1e293b')
       .text('TOTAL:', 390, summaryTop + 5, { bold: true })
       .text(`${currency}${totalAmount.toFixed(2)}`, 480, summaryTop + 5, { align: 'right', width: 55, bold: true });

    // Payment Status
    const paymentStatus = subscription.payment_status === 'paid' ? 'PAID' : 'PENDING';
    const statusColor = subscription.payment_status === 'paid' ? '#10b981' : '#f59e0b';
    
    summaryTop += 50;
    doc.fontSize(11)
       .fillColor(statusColor)
       .text(`Payment Status: ${paymentStatus}`, 380, summaryTop);

    // Footer
    const footerTop = 700;
    doc.moveTo(50, footerTop)
       .lineTo(545, footerTop)
       .strokeColor('#e2e8f0')
       .stroke();
    
    doc.fontSize(9)
       .fillColor('#94a3b8')
       .text('Thank you for your business!', 50, footerTop + 15, { align: 'center', width: 495 })
       .text('For support, please contact us at ' + companyEmail, 50, footerTop + 30, { align: 'center', width: 495 });

    // Watermark if not paid
    if (subscription.payment_status !== 'paid') {
      doc.fontSize(60)
         .fillColor('#f59e0b')
         .opacity(0.1)
         .text('UNPAID', 150, 400, { rotate: -45 });
    }

    // Finalize PDF
    doc.end();

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Save invoice record to database
    await execute(
      `INSERT INTO invoices 
       (invoice_number, client_id, subscription_id, invoice_date, amount, tax_amount, total_amount, 
        payment_status, invoice_type, pdf_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        client.id,
        subscription.id,
        format(invoiceDate, 'yyyy-MM-dd'),
        amount,
        taxAmount,
        totalAmount,
        subscription.payment_status,
        invoiceType,
        filepath
      ]
    );

    // Update subscription invoice_generated flag
    await execute(
      'UPDATE subscriptions SET invoice_generated = TRUE WHERE id = ?',
      [subscription.id]
    );

    console.log(`✅ Invoice generated: ${invoiceNumber}`);

    return {
      success: true,
      invoiceNumber,
      filepath,
      filename
    };

  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get invoice file
 */
function getInvoiceFile(filename) {
  const filepath = path.join(invoicesDir, filename);
  if (fs.existsSync(filepath)) {
    return filepath;
  }
  return null;
}

/**
 * Delete invoice file
 */
function deleteInvoiceFile(filename) {
  try {
    const filepath = path.join(invoicesDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
}

module.exports = {
  generateInvoice,
  generateInvoiceNumber,
  getInvoiceFile,
  deleteInvoiceFile
};
