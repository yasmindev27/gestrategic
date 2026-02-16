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

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const dataGerada = format(new Date(), "dd/MM/yyyy 'às' HH:mm");

  // Load logo and render all pages
  const logoImg = new Image();
  logoImg.crossOrigin = 'anonymous';
  logoImg.src = '/assets/logo-gestrategic.jpg';

  const renderPDF = (logoLoaded: boolean) => {
    // --- HEADER ---
    // Left: title + date
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${dataGerada}`, 14, 25);

    // Right: logo Gestrategic
    if (logoLoaded) {
      try {
        doc.addImage(logoImg, 'PNG', pageWidth - 44, 8, 30, 15);
      } catch {
        // fallback: text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Gestrategic', pageWidth - 14, 18, { align: 'right' });
      }
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Gestrategic', pageWidth - 14, 18, { align: 'right' });
    }

    // --- TABLE ---
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 32,
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
      margin: { top: 32, bottom: 28 },
    });

    // --- FOOTER (all pages) ---
    const pageCount = doc.getNumberOfPages();
    const lgpdText =
      'Este relatório contém dados tratados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). ' +
      'O conteúdo é estritamente confidencial e destinado apenas ao uso autorizado.';

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Re-add header on subsequent pages
      if (i > 1) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${dataGerada}`, 14, 25);
        if (logoLoaded) {
          try {
            doc.addImage(logoImg, 'PNG', pageWidth - 44, 8, 30, 15);
          } catch {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Gestrategic', pageWidth - 14, 18, { align: 'right' });
          }
        } else {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Gestrategic', pageWidth - 14, 18, { align: 'right' });
        }
      }

      // Divider line
      const footerY = pageHeight - 20;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(14, footerY, pageWidth - 14, footerY);

      // LGPD notice
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const splitLgpd = doc.splitTextToSize(lgpdText, pageWidth - 28);
      doc.text(splitLgpd, 14, footerY + 4);

      // Page number
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );

      // Reset text color
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`${fileName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Try to load logo, fallback to text if fails
  logoImg.onload = () => renderPDF(true);
  logoImg.onerror = () => renderPDF(false);
};
