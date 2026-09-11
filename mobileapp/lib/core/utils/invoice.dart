import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';

String _money(num n) => 'Rs. ${n.toStringAsFixed(2)}';

/// Client-generated tax invoice / credit note as a PDF — the order already
/// has everything needed, no server round-trip. Mirrors the web app's
/// `frontend/src/utils/invoice.ts` output.
Future<void> downloadInvoice(OrderModel order) async {
  final doc = pw.Document();
  final green = PdfColor.fromInt(0xFF2E7D32);

  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(48),
      build: (context) {
        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'FreshCart',
                  style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold, color: green),
                ),
                pw.Text('Tax Invoice / Credit Note', style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey700)),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Divider(color: PdfColors.grey300),
            pw.SizedBox(height: 16),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Order ID: #${order.id}', style: const pw.TextStyle(fontSize: 10)),
                pw.Text(_dateLabel(order), style: const pw.TextStyle(fontSize: 10)),
              ],
            ),
            if (order.paymentMethod.isNotEmpty) ...[
              pw.SizedBox(height: 6),
              pw.Text('Payment method: ${order.paymentMethod}', style: const pw.TextStyle(fontSize: 10)),
            ],
            if (order.deliveryAddress.isNotEmpty) ...[
              pw.SizedBox(height: 6),
              pw.Text('Delivery address: ${order.deliveryAddress}', style: const pw.TextStyle(fontSize: 10)),
            ],
            pw.SizedBox(height: 18),
            pw.Table(
              columnWidths: const {
                0: pw.FlexColumnWidth(3),
                1: pw.FlexColumnWidth(1),
                2: pw.FlexColumnWidth(1.2),
                3: pw.FlexColumnWidth(1.2),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(
                    border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey400)),
                  ),
                  children: [
                    _headCell('Item'),
                    _headCell('Qty', align: pw.TextAlign.right),
                    _headCell('Price', align: pw.TextAlign.right),
                    _headCell('Amount', align: pw.TextAlign.right),
                  ],
                ),
                for (final item in order.items)
                  pw.TableRow(children: [
                    pw.Padding(
                      padding: const pw.EdgeInsets.symmetric(vertical: 6),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(item.product.name, style: const pw.TextStyle(fontSize: 10)),
                          if (item.selectedWeight.isNotEmpty)
                            pw.Text(item.selectedWeight, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
                        ],
                      ),
                    ),
                    _cell('${item.quantity}', align: pw.TextAlign.right),
                    _cell(_money(item.product.price), align: pw.TextAlign.right),
                    _cell(_money(item.totalPrice), align: pw.TextAlign.right),
                  ]),
              ],
            ),
            pw.SizedBox(height: 18),
            pw.Divider(color: PdfColors.grey300),
            pw.SizedBox(height: 8),
            _billRow('Item Total', _money(order.subtotal)),
            _billRow('Delivery Fee', order.deliveryFee > 0 ? _money(order.deliveryFee) : 'FREE'),
            _billRow('Handling Fee', order.platformFee > 0 ? _money(order.platformFee) : 'FREE'),
            if (order.discount > 0) _billRow('Discount', '- ${_money(order.discount)}'),
            pw.SizedBox(height: 4),
            pw.Divider(color: PdfColors.grey300),
            pw.SizedBox(height: 4),
            _billRow('Total Bill', _money(order.total), bold: true),
            pw.SizedBox(height: 28),
            pw.Text(
              'This is a system-generated invoice and does not require a signature.',
              style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.grey500),
            ),
          ],
        );
      },
    ),
  );

  // layoutPdf (not sharePdf) is the reliable cross-platform path: on web it
  // triggers the browser's native print/"Save as PDF" dialog (a plain
  // Blob-anchor download can get silently swallowed by some browser/embed
  // contexts), and on mobile it opens the native print/share sheet.
  await Printing.layoutPdf(
    onLayout: (_) => doc.save(),
    name: 'FreshCart-Invoice-${order.id}',
  );
}

String _dateLabel(OrderModel order) {
  final d = order.date;
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}

pw.Widget _headCell(String text, {pw.TextAlign align = pw.TextAlign.left}) => pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6),
      child: pw.Text(text, textAlign: align, style: pw.TextStyle(fontSize: 10.5, fontWeight: pw.FontWeight.bold)),
    );

pw.Widget _cell(String text, {pw.TextAlign align = pw.TextAlign.left}) => pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 6),
      child: pw.Text(text, textAlign: align, style: const pw.TextStyle(fontSize: 10)),
    );

pw.Widget _billRow(String label, String value, {bool bold = false}) => pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 3),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(fontSize: bold ? 12 : 10, fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
          pw.Text(value, style: pw.TextStyle(fontSize: bold ? 12 : 10, fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        ],
      ),
    );
