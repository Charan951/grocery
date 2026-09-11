import { jsPDF } from 'jspdf';

interface InvoiceItem {
  name: string;
  weightSpec?: string;
  price: number;
  mrp?: number;
  qty: number;
}

interface InvoiceOrder {
  orderNumber: string;
  orderPlacedAt?: string;
  createdAt?: string;
  items: InvoiceItem[];
  itemTotal: number;
  itemTotalMrp?: number;
  deliveryFee: number;
  handlingFee: number;
  totalAmount: number;
  deliveryAddress?: string;
  paymentMethod?: string;
}

const money = (n: number) => `Rs. ${Number(n || 0).toFixed(2)}`;

/** Client-generated tax invoice / credit note as a downloadable PDF — the
 * order already contains everything needed, no server round-trip. */
export function downloadInvoice(order: InvoiceOrder) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(46, 125, 50); // brand green
  doc.text('FreshCart', marginX, y);

  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text('Tax Invoice / Credit Note', pageWidth - marginX, y, { align: 'right' });

  y += 20;
  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const placedAt = order.orderPlacedAt || order.createdAt || '';
  doc.text(`Order ID: #${order.orderNumber}`, marginX, y);
  doc.text(`Date: ${placedAt}`, pageWidth - marginX, y, { align: 'right' });
  y += 16;
  if (order.paymentMethod) {
    doc.text(`Payment method: ${order.paymentMethod}`, marginX, y);
    y += 16;
  }
  if (order.deliveryAddress) {
    doc.text(`Delivery address: ${order.deliveryAddress}`, marginX, y, {
      maxWidth: pageWidth - marginX * 2,
    });
    y += 16;
  }

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text('Item', marginX, y);
  doc.text('Qty', pageWidth - 220, y, { align: 'right' });
  doc.text('Price', pageWidth - 130, y, { align: 'right' });
  doc.text('Amount', pageWidth - marginX, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(210, 210, 210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const item of order.items) {
    const lineTotal = Number(item.price) * Number(item.qty);
    doc.setTextColor(30, 30, 30);
    doc.text(item.name, marginX, y, { maxWidth: pageWidth - 300 });
    if (item.weightSpec) {
      doc.setTextColor(140, 140, 140);
      doc.setFontSize(8.5);
      doc.text(item.weightSpec, marginX, y + 11);
      doc.setFontSize(10);
    }
    doc.setTextColor(30, 30, 30);
    doc.text(String(item.qty), pageWidth - 220, y, { align: 'right' });
    doc.text(money(item.price), pageWidth - 130, y, { align: 'right' });
    doc.text(money(lineTotal), pageWidth - marginX, y, { align: 'right' });
    y += item.weightSpec ? 26 : 20;
  }

  y += 8;
  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 22;

  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(bold ? 20 : 80, bold ? 20 : 80, bold ? 20 : 80);
    doc.text(label, pageWidth - 220, y);
    doc.text(value, pageWidth - marginX, y, { align: 'right' });
    y += bold ? 20 : 16;
  };

  row('Item Total', money(order.itemTotal));
  row('Delivery Fee', order.deliveryFee > 0 ? money(order.deliveryFee) : 'FREE');
  row('Handling Fee', order.handlingFee > 0 ? money(order.handlingFee) : 'FREE');
  y += 4;
  doc.setDrawColor(210, 210, 210);
  doc.line(pageWidth - 220, y, pageWidth - marginX, y);
  y += 20;
  row('Total Bill', money(order.totalAmount), true);

  y += 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a system-generated invoice and does not require a signature.', marginX, y);

  doc.save(`FreshCart-Invoice-${order.orderNumber}.pdf`);
}
