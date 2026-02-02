import React from 'react';

interface InvoiceTemplateProps {
  invoiceData: {
    businessName: string;
    businessLogo: string | null;
    businessAddress: string;
    businessEmail: string;
    businessPhoneNumber: string;
    clientName: string;
    clientEmail: string;
    clientAddress: string;
    clientPhoneNumber: string;
    items: any[]; 
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
  };
}

const Template3: React.FC<InvoiceTemplateProps> = ({ invoiceData }) => {
  return (
    <div className="p-8 bg-white border border-gray-300 rounded-lg shadow-lg font-sans">
      <div className="flex justify-between items-start mb-8 border-b pb-4 border-gray-200">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">INVOICE</h1>
          <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
          <p className="text-sm text-gray-600">Invoice #: INV-{new Date().getFullYear()}-003</p>
        </div>
        <div className="text-right">
          {invoiceData.businessLogo && (
            <img src={invoiceData.businessLogo} alt="Business Logo" className="h-16 mb-2 mx-auto" />
          )}
          <p className="text-xl font-semibold text-gray-800">{invoiceData.businessName}</p>
          <p className="text-gray-700">{invoiceData.businessAddress}</p>
          {invoiceData.businessEmail && <p className="text-gray-700">Email: {invoiceData.businessEmail}</p>}
          {invoiceData.businessPhoneNumber && <p className="text-gray-700">Phone: {invoiceData.businessPhoneNumber}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">BILL TO:</h3>
          <p className="text-gray-900 text-xl font-medium">{invoiceData.clientName}</p>
          <p className="text-gray-700">{invoiceData.clientAddress}</p>
          {invoiceData.clientEmail && <p className="text-gray-700">Email: {invoiceData.clientEmail}</p>}
          {invoiceData.clientPhoneNumber && <p className="text-gray-700">Phone: {invoiceData.clientPhoneNumber}</p>}
        </div>
        <div className="text-right">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">SHIP TO:</h3>
          <p className="text-gray-900 text-xl font-medium">{invoiceData.clientName}</p>
          <p className="text-gray-700">Shipping Address Line 1</p>
          <p className="text-gray-700">Shipping City, State, Zip</p>
        </div>
      </div>

      <table className="min-w-full bg-white border border-gray-200 mb-8">
        <thead>
          <tr className="bg-gray-100 text-gray-800 uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left">#</th>
            <th className="py-3 px-6 text-left">Item Description</th>
            <th className="py-3 px-6 text-center">Qty</th>
            <th className="py-3 px-6 text-right">Unit Price</th>
            <th className="py-3 px-6 text-right">Tax (%)</th>
            <th className="py-3 px-6 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 text-sm font-light">
          {invoiceData.items.map((item: any, index: number) => (
            <tr key={index} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
              <td className="py-3 px-6 text-left">{index + 1}</td>
              <td className="py-3 px-6 text-left">{item.itemName}</td>
              <td className="py-3 px-6 text-center">{item.quantity}</td>
              <td className="py-3 px-6 text-right">₹{item.rate.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{item.taxPercentage}%</td>
              <td className="py-3 px-6 text-right">₹{item.finalPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="text-right w-full md:w-1/2">
          <div className="flex justify-between py-2">
            <span className="text-gray-800">Subtotal:</span>
            <span className="font-semibold text-gray-900">₹{invoiceData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-800">Tax ({invoiceData.items.reduce((acc: number, item: any) => acc + item.taxPercentage, 0) / invoiceData.items.length || 0}%):</span>
            <span className="font-semibold text-gray-900">₹{invoiceData.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-4 text-xl font-bold text-gray-900">
            <span>GRAND TOTAL:</span>
            <span>₹{invoiceData.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-gray-600 text-sm mt-8 p-4 bg-gray-50 rounded-md">
        <p>Thank you for your business. We appreciate your prompt payment.</p>
        <p className="mt-2">Payment terms: Net 30</p>
      </div>
    </div>
  );
};

export default Template3;
