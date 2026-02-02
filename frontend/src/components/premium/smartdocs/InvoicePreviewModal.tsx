import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import Template1 from './smartinvoice/templates/Template1';
import Template3 from './smartinvoice/templates/Template3';

interface Item {
  itemName: string;
  rate: number;
  quantity: number;
  taxPercentage: number;
  finalPrice: number;
}

interface Invoice {
  id: number;
  businessName: string;
  businessLogo: string | null;
  businessAddress: string;
  businessEmail: string;
  businessPhoneNumber: string;
  clientName: string;
  clientEmail: string; 
  clientAddress: string; 
  clientPhoneNumber: string;
  items: Item[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  createdAt: string;
}

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: Invoice | null;
  selectedTemplate: string;
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceData,
  selectedTemplate,
}) => {
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!invoicePreviewRef.current) return;

    const canvas = await html2canvas(invoicePreviewRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`invoice_${invoiceData?.id || 'new'}.pdf`);
  };

  const handleExportImage = async () => {
    if (!invoicePreviewRef.current) return;

    const canvas = await html2canvas(invoicePreviewRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `invoice_${invoiceData?.id || 'new'}.png`;
    link.href = imgData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!invoiceData) return null; // Don't render if no invoice data

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[90vw] max-h-[90vh] overflow-y-auto bg-white text-gray-900 border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Invoice Preview</DialogTitle>
          <DialogDescription className="text-gray-700">Review and download your invoice.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center my-4 space-x-2">
          <Button onClick={handleExportPdf} variant="outline" className="text-gray-900 bg-white border border-gray-300">Download PDF</Button>
          <Button onClick={handleExportImage} variant="outline" className="text-gray-900 bg-white border border-gray-300">Download Image</Button>
        </div>
        <div ref={invoicePreviewRef} className="p-4 bg-white rounded-lg border border-gray-200 shadow-md">
          {
            selectedTemplate === 'Template1' && (
              <Template1 invoiceData={invoiceData} />
            )
          }
          {
            selectedTemplate === 'Template3' && (
              <Template3 invoiceData={invoiceData} />
            )
          }
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreviewModal;
