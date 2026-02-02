import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import Template1 from './smartinvoice/templates/Template1';
import Template3 from './smartinvoice/templates/Template3';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import axios from 'axios';
import { useAuth } from '../../../../src/context/AuthContext'; // Adjust path as needed
import InvoicePreviewModal from './InvoicePreviewModal';
import { API_BASE } from '@/lib/api'; // Import API_BASE

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

const SmartInvoiceGeneratorPage: React.FC = () => {
  const [businessName, setBusinessName] = useState<string>('');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [businessAddress, setBusinessAddress] = useState<string>(''); 
  const [businessEmail, setBusinessEmail] = useState<string>('');
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>(''); 
  const [clientAddress, setClientAddress] = useState<string>(''); 
  const [clientPhoneNumber, setClientPhoneNumber] = useState<string>('');
  const [items, setItems] = useState<Item[]>([
    { itemName: '', rate: 0, quantity: 0, taxPercentage: 0, finalPrice: 0 },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('Template1');
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [confirmDeleteSnackbarOpen, setConfirmDeleteSnackbarOpen] = useState<boolean>(false);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
  const [outcomeSnackbarOpen, setOutcomeSnackbarOpen] = useState<boolean>(false);
  const [outcomeSnackbarMessage, setOutcomeSnackbarMessage] = useState<string>('');
  const [outcomeSnackbarType, setOutcomeSnackbarType] = useState<'success' | 'error'>('success');
  const [warningSnackbarOpen, setWarningSnackbarOpen] = useState<boolean>(false);
  const [warningSnackbarMessage, setWarningSnackbarMessage] = useState<string>('');

  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  const { token } = useAuth();

  const axiosInstance = axios.create({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    baseURL: API_BASE, // Set the base URL from API_BASE
  });

  // Regex for email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  // Regex for Indian phone number validation (10 digits)
  const phoneRegex = /^\d{10}$/;

  // Fetch invoice history on component mount
  const fetchInvoiceHistory = async () => {
    try {
      const response = await axiosInstance.get('/smartdocs/smart-invoices');
      setInvoiceHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching invoice history:', error);
    }
  };

  React.useEffect(() => {
    fetchInvoiceHistory();
  }, [axiosInstance]);

  const handleDeleteInvoice = (invoiceId: number) => {
    setDeleteInvoiceId(invoiceId);
    setConfirmDeleteSnackbarOpen(true);
  };

  const confirmDeletion = async () => {
    setConfirmDeleteSnackbarOpen(false); // Close confirmation snackbar
    if (deleteInvoiceId === null) return;

    try {
      await axiosInstance.delete(`/smartdocs/smart-invoices/${deleteInvoiceId}`);
      setOutcomeSnackbarMessage('Invoice deleted successfully.');
      setOutcomeSnackbarType('success');
      setOutcomeSnackbarOpen(true);
      fetchInvoiceHistory(); // Refresh the list after deletion
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setOutcomeSnackbarMessage('Failed to delete invoice.');
      setOutcomeSnackbarType('error');
      setOutcomeSnackbarOpen(true);
    } finally {
      setDeleteInvoiceId(null);
      setTimeout(() => setOutcomeSnackbarOpen(false), 3000); // Hide outcome snackbar after 3 seconds
    }
  };

  const validateExport = () => {
    if (!businessName.trim() || !clientName.trim() || items.length === 0 || items.some(item => !item.itemName.trim() || item.rate <= 0 || item.quantity <= 0)) {
      setWarningSnackbarMessage('Please fill in all essential invoice details  before exporting.');
      setWarningSnackbarOpen(true);
      setTimeout(() => setWarningSnackbarOpen(false), 5000); // Hide after 5 seconds
      return false;
    }
    return true;
  };

  const handleExportPdf = async () => {
    if (!validateExport()) return;
    if (!invoicePreviewRef.current) return;

    const canvas = await html2canvas(invoicePreviewRef.current, {
      scale: 2,
      useCORS: true, // Required for images from external sources
      windowWidth: invoicePreviewRef.current.scrollWidth,
      windowHeight: invoicePreviewRef.current.scrollHeight,
      x: 0,
      y: 0,
    });
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

    pdf.save(`Invoice_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const handleExportImage = async () => {
    if (!validateExport()) return;
    if (!invoicePreviewRef.current) return;

    const canvas = await html2canvas(invoicePreviewRef.current, {
      scale: 2,
      useCORS: true, // Required for images from external sources
      windowWidth: invoicePreviewRef.current.scrollWidth,
      windowHeight: invoicePreviewRef.current.scrollHeight,
      x: 0,
      y: 0,
    });
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Invoice_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = imgData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { itemName: '', rate: 0, quantity: 0, taxPercentage: 0, finalPrice: 0 },
    ]);
  };

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value;

    const item = newItems[index];
    const itemSubtotal = (item.rate || 0) * (item.quantity || 0);
    const itemTaxAmount = itemSubtotal * ((item.taxPercentage || 0) / 100);
    item.finalPrice = itemSubtotal + itemTaxAmount;

    setItems(newItems);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach((item) => {
      subtotal += (item.rate || 0) * (item.quantity || 0);
    });

    let totalTaxAmount = 0;
    items.forEach((item) => {
      totalTaxAmount += ((item.rate || 0) * (item.quantity || 0)) * ((item.taxPercentage || 0) / 100);
    });

    const grandTotal = subtotal + totalTaxAmount;

    return { subtotal, totalTaxAmount, grandTotal };
  };

  const { subtotal, totalTaxAmount, grandTotal } = calculateTotals();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateInvoice = async () => {
    // Validate form before creating invoice
    const isValid = validateForm();
    if (!isValid) {
      return; // Stop if validation fails
    }

    try {
      const invoiceData = {
        businessName,
        clientName,
        clientEmail,
        businessLogo, 
        businessAddress, 
        businessEmail,
        businessPhoneNumber,
        clientAddress, 
        clientPhoneNumber,
        items,
        subtotal,
        taxAmount: totalTaxAmount,
        grandTotal,
      };
      const response = await axiosInstance.post('/smartdocs/smart-invoices', invoiceData);
      console.log('Invoice created successfully:', response.data);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
      const updatedHistoryResponse = await axiosInstance.get('/smartdocs/smart-invoices');
      setInvoiceHistory(Array.isArray(updatedHistoryResponse.data) ? updatedHistoryResponse.data : []);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please ensure all required fields are filled and try again.');
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!businessName.trim()) errors.businessName = 'Business Name is required.';
    if (!businessAddress.trim()) errors.businessAddress = 'Business Address is required.';
    if (!businessPhoneNumber.trim()) errors.businessPhoneNumber = 'Business Phone Number is required.';
    if (!phoneRegex.test(businessPhoneNumber)) errors.businessPhoneNumber = 'Invalid Business Phone Number. Must be 10 digits.';
    if (!businessEmail.trim()) errors.businessEmail = 'Business Email is required.';
    if (!emailRegex.test(businessEmail)) errors.businessEmail = 'Invalid Business Email address.';
    if (!clientName.trim()) errors.clientName = 'Client Name is required.';
    if (!clientAddress.trim()) errors.clientAddress = 'Client Address is required.';
    if (!clientPhoneNumber.trim()) errors.clientPhoneNumber = 'Client Phone Number is required.';
    if (!phoneRegex.test(clientPhoneNumber)) errors.clientPhoneNumber = 'Invalid Client Phone Number. Must be 10 digits.';
    if (!clientEmail.trim()) errors.clientEmail = 'Client Email is required.';
    if (!emailRegex.test(clientEmail)) errors.clientEmail = 'Invalid Client Email address.';

    items.forEach((item, index) => {
      if (!item.itemName.trim()) errors[`itemName-${index}`] = 'Item Name is required.';
      if (item.rate <= 0 || isNaN(item.rate)) errors[`rate-${index}`] = 'Rate must be greater than 0.';
      if (item.quantity <= 0 || isNaN(item.quantity)) errors[`quantity-${index}`] = 'Quantity must be greater than 0.';
      if (item.taxPercentage < 0 || isNaN(item.taxPercentage)) errors[`taxPercentage-${index}`] = 'Tax % cannot be negative.';
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <div className="container mx-auto p-4 bg-white text-gray-900 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Column: Input Form */}
        <div className="flex-1">
          <Card className="w-full shadow-lg bg-white text-gray-900 border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="businessName" className="text-gray-900">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.businessName && <p className="text-red-500 text-sm mt-1">{validationErrors.businessName}</p>}
                </div>
                <div>
                  <Label htmlFor="businessLogo" className="text-gray-900">Business Logo</Label>
                  <Input
                    id="businessLogo"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-gray-900 file:text-gray-900 file:bg-gray-100 bg-white border border-gray-300"
                  />
                  {businessLogo && <p className="text-sm text-gray-700 mt-1">Logo selected</p>}
                </div>
                <div>
                  <Label htmlFor="businessEmail" className="text-gray-900">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="business@example.com"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.businessEmail && <p className="text-red-500 text-sm mt-1">{validationErrors.businessEmail}</p>}
                </div>
                <div>
                  <Label htmlFor="businessPhoneNumber" className="text-gray-900">Business Phone Number</Label>
                  <Input
                    id="businessPhoneNumber"
                    type="tel"
                    value={businessPhoneNumber}
                    onChange={(e) => setBusinessPhoneNumber(e.target.value)}
                    placeholder="(123) 456-7890"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.businessPhoneNumber && <p className="text-red-500 text-sm mt-1">{validationErrors.businessPhoneNumber}</p>}
                </div>
                <div>
                  <Label htmlFor="businessAddress" className="text-gray-900">Business Address</Label>
                  <Input
                    id="businessAddress"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Your Business Address"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.businessAddress && <p className="text-red-500 text-sm mt-1">{validationErrors.businessAddress}</p>}
                </div>
                <div>
                  <Label htmlFor="clientName" className="text-gray-900">Client Name</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client Name"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.clientName && <p className="text-red-500 text-sm mt-1">{validationErrors.clientName}</p>}
                </div>
                <div>
                  <Label htmlFor="clientEmail" className="text-gray-900">Client Contact Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.clientEmail && <p className="text-red-500 text-sm mt-1">{validationErrors.clientEmail}</p>}
                </div>
                <div>
                  <Label htmlFor="clientAddress" className="text-gray-900">Client Address</Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Client Address"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.clientAddress && <p className="text-red-500 text-sm mt-1">{validationErrors.clientAddress}</p>}
                </div>
                <div>
                  <Label htmlFor="clientPhoneNumber" className="text-gray-900">Client Phone Number</Label>
                  <Input
                    id="clientPhoneNumber"
                    type="tel"
                    value={clientPhoneNumber}
                    onChange={(e) => setClientPhoneNumber(e.target.value)}
                    placeholder="(987) 654-3210"
                    className="bg-white text-gray-900 border border-gray-300"
                  />
                  {validationErrors.clientPhoneNumber && <p className="text-red-500 text-sm mt-1">{validationErrors.clientPhoneNumber}</p>}
                </div>
              </div>

              {showSuccessMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <strong className="font-bold">Success!</strong>
                  <span className="block sm:inline"> Invoice created successfully.</span>
                </div>
              )}

              <h3 className="text-xl font-semibold mb-4 text-gray-900">Items</h3>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 border rounded-md border-gray-200 bg-white">
                  <div>
                    <Label htmlFor={`itemName-${index}`} className="text-gray-900">Item Name</Label>
                    <Input
                      id={`itemName-${index}`}
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      placeholder="Item Name"
                      className="bg-white text-gray-900 border border-gray-300"
                    />
                    {validationErrors[`itemName-${index}`] && <p className="text-red-500 text-sm mt-1">{validationErrors[`itemName-${index}`]}</p>}
                  </div>
                  <div>
                    <Label htmlFor={`rate-${index}`} className="text-gray-900">Rate</Label>
                    <Input
                      id={`rate-${index}`}
                      type="number"
                      value={item.rate === 0 ? '' : item.rate} // Allow clearing 0
                      onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || '')}
                      placeholder="Rate"
                      className="bg-white text-gray-900 border border-gray-300"
                    />
                    {validationErrors[`rate-${index}`] && <p className="text-red-500 text-sm mt-1">{validationErrors[`rate-${index}`]}</p>}
                  </div>
                  <div>
                    <Label htmlFor={`quantity-${index}`} className="text-gray-900">Quantity</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      value={item.quantity === 0 ? '' : item.quantity} // Allow clearing 0
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || '')}
                      placeholder="Quantity"
                      className="bg-white text-gray-900 border border-gray-300"
                    />
                    {validationErrors[`quantity-${index}`] && <p className="text-red-500 text-sm mt-1">{validationErrors[`quantity-${index}`]}</p>}
                  </div>
                  <div>
                    <Label htmlFor={`taxPercentage-${index}`} className="text-gray-900">Tax %</Label>
                    <Input
                      id={`taxPercentage-${index}`}
                      type="number"
                      value={item.taxPercentage === 0 ? '' : item.taxPercentage} // Allow clearing 0
                      onChange={(e) => handleItemChange(index, 'taxPercentage', parseFloat(e.target.value) || '')}
                      placeholder="Tax %"
                      className="bg-white text-gray-900 border border-gray-300"
                    />
                    {validationErrors[`taxPercentage-${index}`] && <p className="text-red-500 text-sm mt-1">{validationErrors[`taxPercentage-${index}`]}</p>}
                  </div>
                  <div>
                    <Label className="text-gray-900">Final Price</Label>
                    <Input value={item.finalPrice.toFixed(2)} readOnly className="bg-gray-100 text-gray-900 border border-gray-300" />
                  </div>
                </div>
              ))}
              <Button onClick={handleAddItem} className="mb-6">Add Item</Button>

              <div className="flex justify-end items-center space-x-4 text-lg font-semibold mb-6 text-gray-900">
                <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
                <p>Tax Amount: ₹{totalTaxAmount.toFixed(2)}</p>
                <p>Grand Total: ₹{grandTotal.toFixed(2)}</p>
              </div>

              <div className="flex justify-between items-center mb-6">
                <Label htmlFor="templateSelect" className="text-gray-900">Select Template:</Label>
                <Select onValueChange={setSelectedTemplate} value={selectedTemplate}>
                  <SelectTrigger id="templateSelect" className="w-[180px] text-gray-900 bg-white border border-gray-300">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent className="text-gray-900 bg-white">
                    <SelectItem value="Template1">Professional Template</SelectItem>
                    <SelectItem value="Template3">Minimalist Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between">
                <Button onClick={handleCreateInvoice}>Save</Button>
                <div className="space-x-2">
                  {/* Export buttons will be moved to modal */}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice History Section */}
          <Card className="w-full shadow-lg mt-4 bg-white text-gray-900 border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Invoice History</CardTitle>
            </CardHeader>
            <CardContent>
              {
                invoiceHistory.length === 0 ? (
                  <p className="text-gray-700">No invoices generated yet.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto pr-2">
                    <ul>
                      {invoiceHistory.map((invoice) => (
                        <li
                          key={invoice.id}
                          className="mb-2 p-2 border rounded-md flex justify-between items-center bg-gray-100 text-gray-900 border-gray-200 cursor-pointer hover:bg-gray-200"
                        >
                          <span
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsModalOpen(true);
                            }}
                            className="flex-grow"
                          >
                            {invoice.clientName} - ₹{invoice.grandTotal.toFixed(2)} on {new Date(invoice.createdAt).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening modal when clicking delete
                              handleDeleteInvoice(invoice.id);
                            }}
                            className="text-red-500 hover:bg-red-100 p-1 rounded-full"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 01-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                            </svg>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Invoice Preview Area */}
        <div className="flex-1 mt-8 lg:mt-0">
          <Card className="w-full shadow-lg bg-white text-gray-900 border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Invoice Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={invoicePreviewRef} className="p-4 bg-white rounded-lg">
                {
                  selectedTemplate === 'Template1' && (
                    <Template1 invoiceData={{
                      businessName,
                      businessLogo,
                      businessAddress,
                      businessEmail,
                      businessPhoneNumber,
                      clientName,
                      clientEmail,
                      clientAddress,
                      clientPhoneNumber,
                      items,
                      subtotal,
                      taxAmount: totalTaxAmount,
                      grandTotal,
                    }} />
                  )
                }
                {
                  selectedTemplate === 'Template3' && (
                    <Template3 invoiceData={{
                      businessName,
                      businessLogo,
                      businessAddress,
                      businessEmail,
                      businessPhoneNumber,
                      clientName,
                      clientEmail,
                      clientAddress,
                      clientPhoneNumber,
                      items,
                      subtotal,
                      taxAmount: totalTaxAmount,
                      grandTotal,
                    }} />
                  )
                }
              </div>
            </CardContent>
          </Card>

          {/* Export Buttons Here */}
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={handleExportPdf} variant="outline" className="text-gray-900 bg-white border border-gray-300">Export PDF</Button>
            <Button onClick={handleExportImage} variant="outline" className="text-gray-900 bg-white border border-gray-300">Export Image</Button>
          </div>

        </div>
      </div>
      <InvoicePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoiceData={selectedInvoice}
        selectedTemplate={selectedTemplate}
      />

      {/* Confirmation Snackbar */}
      {confirmDeleteSnackbarOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-4 rounded-md shadow-lg flex items-center space-x-4 z-50">
          <span>Are you sure you want to delete this invoice?</span>
          <Button onClick={confirmDeletion} className="bg-white text-blue-800 hover:bg-gray-100">Yes</Button>
          <Button onClick={() => setConfirmDeleteSnackbarOpen(false)} className="bg-red-500 text-white hover:bg-red-600">No</Button>
        </div>
      )}

      {/* Outcome Snackbar */}
      {outcomeSnackbarOpen && (
        <div className={`fixed bottom-16 left-1/2 -translate-x-1/2 p-4 rounded-md shadow-lg z-50 ${outcomeSnackbarType === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          <span>{outcomeSnackbarMessage}</span>
        </div>
      )}

      {/* Warning Snackbar */}
      {warningSnackbarOpen && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 p-4 rounded-md shadow-lg z-50 bg-yellow-500 text-white">
          <span>{warningSnackbarMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SmartInvoiceGeneratorPage;

