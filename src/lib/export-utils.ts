import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ExportOptions {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Export data to CSV file
 */
export const exportToCSV = (options: ExportOptions): void => {
  const { headers, rows, fileName } = options;
  
  const csvContent = [
    headers.join(';'),
    ...rows.map((r) => r.map(cell => {
      const cellStr = String(cell);
      // Escape quotes and wrap in quotes if contains semicolon or quote
      if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(';'))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Export data to PDF file
 */
export const exportToPDF = (options: ExportOptions): void => {
  const { title, headers, rows, fileName, orientation = 'portrait' } = options;
  
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });
  
  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 28);
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 35 },
  });
  
  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const pageHeight = doc.internal.pageSize.height;
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`${fileName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
