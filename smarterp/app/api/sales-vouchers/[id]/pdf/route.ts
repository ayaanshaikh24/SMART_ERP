import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Optional auth: verify JWT
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // 1. Fetch voucher details
    const { data: voucher, error: voucherError } = await supabase
      .from('sales_vouchers')
      .select('*, customers(*)')
      .eq('id', id)
      .maybeSingle();

    if (voucherError || !voucher) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Fetch line items
    const { data: items, error: itemsError } = await supabase
      .from('sales_voucher_items')
      .select('*, stock_items(name, sku, unit, gst_percent)')
      .eq('sales_voucher_id', id);

    if (itemsError || !items) {
      return NextResponse.json({ error: 'Failed to retrieve invoice line items' }, { status: 500 });
    }

    // 3. Generate PDF Document in memory
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Brand Title
      doc.fillColor('#1f2937').fontSize(24).font('Helvetica-Bold').text('SmartERP Solutions Inc.', 40, 40);
      doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text('Standard Billing & Inventory System', 40, 68);

      // Invoice Subheader
      doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', 400, 40, { align: 'right' });
      
      // Metadata Details
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151');
      doc.text('Invoice No:', 350, 75, { width: 100, align: 'right' });
      doc.font('Helvetica').text(voucher.invoice_number, 460, 75, { width: 100, align: 'left' });

      doc.font('Helvetica-Bold').text('Date:', 350, 90, { width: 100, align: 'right' });
      doc.font('Helvetica').text(new Date(voucher.created_at).toLocaleDateString(), 460, 90, { width: 100, align: 'left' });

      // Horizontal Line
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, 120).lineTo(555, 120).stroke();

      // Customer Details
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('BILL TO:', 40, 135);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text(voucher.customers.name, 40, 155);
      if (voucher.customers.mobile) {
        doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`Mobile: ${voucher.customers.mobile}`, 40, 172);
      }
      if (voucher.customers.address) {
        doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`Address: ${voucher.customers.address}`, 40, 187, { width: 250 });
      }

      // Draw Items Table Header
      const tableTop = 240;
      doc.strokeColor('#9ca3af').lineWidth(1).moveTo(40, tableTop).lineTo(555, tableTop).stroke();
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827');
      doc.text('Item Description', 45, tableTop + 6, { width: 180 });
      doc.text('SKU', 230, tableTop + 6, { width: 80 });
      doc.text('Rate', 320, tableTop + 6, { width: 60, align: 'right' });
      doc.text('Qty', 390, tableTop + 6, { width: 40, align: 'right' });
      doc.text('GST %', 440, tableTop + 6, { width: 45, align: 'right' });
      doc.text('Total', 495, tableTop + 6, { width: 55, align: 'right' });
      
      doc.strokeColor('#d1d5db').lineWidth(1).moveTo(40, tableTop + 22).lineTo(555, tableTop + 22).stroke();

      // Render Line Items
      let currentY = tableTop + 22;
      items.forEach((item, index) => {
        const rowHeight = 22;
        currentY += rowHeight;

        // Alternating row background for clean look
        if (index % 2 === 0) {
          doc.fillColor('#f9fafb').rect(40, currentY - 4, 515, rowHeight).fill();
        }

        doc.fontSize(9).font('Helvetica').fillColor('#374151');
        doc.text(item.stock_items.name, 45, currentY, { width: 180, height: 16, ellipsis: true });
        doc.text(item.stock_items.sku, 230, currentY, { width: 80, height: 16 });
        doc.text(Number(item.rate).toFixed(2), 320, currentY, { width: 60, align: 'right' });
        doc.text(`${item.quantity} ${item.stock_items.unit}`, 390, currentY, { width: 40, align: 'right' });
        doc.text(`${Number(item.stock_items.gst_percent).toFixed(0)}%`, 440, currentY, { width: 45, align: 'right' });
        doc.text(Number(item.line_total).toFixed(2), 495, currentY, { width: 55, align: 'right' });

        doc.strokeColor('#f3f4f6').lineWidth(0.5).moveTo(40, currentY + 14).lineTo(555, currentY + 14).stroke();
      });

      // Bottom border of table
      doc.strokeColor('#9ca3af').lineWidth(1).moveTo(40, currentY + 16).lineTo(555, currentY + 16).stroke();

      // Totals Block
      const totalsY = currentY + 30;
      doc.fontSize(10).font('Helvetica').fillColor('#4b5563');
      doc.text('Subtotal (Excl. GST):', 350, totalsY, { width: 120, align: 'right' });
      doc.text(`Rs. ${Number(voucher.total_amount).toFixed(2)}`, 480, totalsY, { width: 70, align: 'right' });

      doc.text('Total GST Amount:', 350, totalsY + 18, { width: 120, align: 'right' });
      doc.text(`Rs. ${Number(voucher.gst_amount).toFixed(2)}`, 480, totalsY + 18, { width: 70, align: 'right' });

      // Double lines above Grand Total
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(350, totalsY + 34).lineTo(555, totalsY + 34).stroke();
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
      doc.text('Grand Total:', 350, totalsY + 40, { width: 120, align: 'right' });
      doc.text(`Rs. ${Number(voucher.grand_total).toFixed(2)}`, 480, totalsY + 40, { width: 70, align: 'right' });

      doc.strokeColor('#111827').lineWidth(1.5).moveTo(350, totalsY + 56).lineTo(555, totalsY + 56).stroke();

      // Footer
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#9ca3af').text('This is a computer-generated tax invoice. No signature required.', 40, 750, { align: 'center' });

      doc.end();
    });

    // Return the response as a downloadable PDF stream
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${voucher.invoice_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
  }
}
