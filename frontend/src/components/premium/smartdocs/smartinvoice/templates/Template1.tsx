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

const Template1: React.FC<InvoiceTemplateProps> = ({ invoiceData }) => {
  return (
    <div className="p-8 bg-white border border-gray-300 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-900">Invoice</h2>

      <div className="flex justify-between items-start mb-8">
        <div>
          {invoiceData.businessLogo && (
            <img src={invoiceData.businessLogo} alt="Business Logo" className="h-16 mb-4" />
          )}
          <p className="text-xl font-semibold text-gray-800">{invoiceData.businessName}</p>
          <p className="text-gray-700">{invoiceData.businessAddress}</p>
          {invoiceData.businessEmail && <p className="text-gray-700">Email: {invoiceData.businessEmail}</p>}
          {invoiceData.businessPhoneNumber && <p className="text-gray-700">Phone: {invoiceData.businessPhoneNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-gray-800">Invoice #INV-2023-001</p>
          <p className="text-gray-800">Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2 text-gray-800">Bill To:</h3>
        <p className="text-lg text-gray-900">{invoiceData.clientName}</p>
        <p className="text-gray-700">{invoiceData.clientAddress}</p>
        {invoiceData.clientEmail && <p className="text-gray-700">Email: {invoiceData.clientEmail}</p>}
        {invoiceData.clientPhoneNumber && <p className="text-gray-700">Phone: {invoiceData.clientPhoneNumber}</p>}
      </div>

      <div className="mb-8">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-gray-800 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Item</th>
              <th className="py-3 px-6 text-left">Rate</th>
              <th className="py-3 px-6 text-left">Quantity</th>
              <th className="py-3 px-6 text-left">Tax %</th>
              <th className="py-3 px-6 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {invoiceData.items.map((item: any, index: number) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-left whitespace-nowrap">{item.itemName}</td>
                <td className="py-3 px-6 text-left">₹{item.rate.toFixed(2)}</td>
                <td className="py-3 px-6 text-left">{item.quantity}</td>
                <td className="py-3 px-6 text-left">{item.taxPercentage}%</td>
                <td className="py-3 px-6 text-right">₹{item.finalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="text-right w-full md:w-1/3">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-800">Subtotal:</span>
            <span className="font-semibold text-gray-900">₹{invoiceData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-800">Tax:</span>
            <span className="font-semibold text-gray-900">₹{invoiceData.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 mt-4 text-xl font-bold text-gray-900">
            <span>Grand Total:</span>
            <span>₹{invoiceData.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-gray-600 text-sm mt-8">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
};

export default Template1;
