import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSmartInvoice = async (req: Request, res: Response) => {
  try {
    const { businessName, businessLogo, clientName, items, clientEmail, businessAddress, clientAddress, businessEmail: newBusinessEmail, businessPhoneNumber, clientPhoneNumber } = req.body; 
    const userId = (req as any).user.id; 

    let subtotal = 0;
    let taxAmount = 0;

    const invoiceItems = items.map((item: any) => {
      const itemSubtotal = item.rate * item.quantity;
      const itemTaxAmount = itemSubtotal * (item.taxPercentage / 100);
      const itemFinalPrice = itemSubtotal + itemTaxAmount;

      subtotal += itemSubtotal;
      taxAmount += itemTaxAmount;

      return {
        itemName: item.itemName,
        rate: item.rate,
        quantity: item.quantity,
        taxPercentage: item.taxPercentage,
        finalPrice: itemFinalPrice,
      };
    });

    const grandTotal = subtotal + taxAmount;

    const smartInvoice = await prisma.smartInvoice.create({
      data: {
        userId,
        businessName,
        businessLogo,
        businessAddress,
        businessEmail: newBusinessEmail,
        businessPhoneNumber,
        clientName,
        clientEmail,
        clientAddress,
        clientPhoneNumber,
        subtotal,
        taxAmount,
        grandTotal,
        items: {
          create: invoiceItems,
        },
      },
    });

    res.status(201).json(smartInvoice);
  } catch (error) {
    console.error('Error creating smart invoice:', error);
    res.status(500).json({ message: 'Failed to create smart invoice' });
  }
};

export const getSmartInvoices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const smartInvoices = await prisma.smartInvoice.findMany({
      where: { userId },
      include: { items: true },
    });
    res.status(200).json(smartInvoices);
  } catch (error) {
    console.error('Error fetching smart invoices:', error);
    res.status(500).json({ message: 'Failed to retrieve smart invoices' });
  }
};

export const getSmartInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const smartInvoice = await prisma.smartInvoice.findUnique({
      where: { id: parseInt(id), userId },
      include: { items: true },
    });

    if (!smartInvoice) {
      return res.status(404).json({ message: 'Smart invoice not found' });
    }

    res.status(200).json(smartInvoice);
  } catch (error) {
    console.error('Error fetching smart invoice by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve smart invoice' });
  }
};

export const updateSmartInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { businessName, businessLogo, clientName, items, clientEmail, businessAddress, clientAddress, businessEmail: newBusinessEmail, businessPhoneNumber, clientPhoneNumber } = req.body;

    let subtotal = 0;
    let taxAmount = 0;

    const invoiceItems = items.map((item: any) => {
      const itemSubtotal = item.rate * item.quantity;
      const itemTaxAmount = itemSubtotal * (item.taxPercentage / 100);
      const itemFinalPrice = itemSubtotal + itemTaxAmount;

      subtotal += itemSubtotal;
      taxAmount += itemTaxAmount;

      return {
        id: item.id, // Include ID for updating existing items
        itemName: item.itemName,
        rate: item.rate,
        quantity: item.quantity,
        taxPercentage: item.taxPercentage,
        finalPrice: itemFinalPrice,
      };
    });

    const grandTotal = subtotal + taxAmount;

    const existingInvoice = await prisma.smartInvoice.findUnique({
      where: { id: parseInt(id), userId },
      include: { items: true },
    });

    if (!existingInvoice) {
      return res.status(404).json({ message: 'Smart invoice not found' });
    }

    // Separate items to create, update, and delete
    const itemsToCreate = invoiceItems.filter((item: { id: any; }) => !item.id);
    const itemsToUpdate = invoiceItems.filter((item: { id: any; }) => item.id);
    const existingItemIds = existingInvoice.items.map((item: { id: any; }) => item.id);
    const itemsToDelete = existingItemIds.filter((existingId: any) => !itemsToUpdate.some((item: { id: any; }) => item.id === existingId));

    const smartInvoice = await prisma.smartInvoice.update({
      where: { id: parseInt(id) },
      data: {
        businessName,
        businessLogo,
        businessAddress,
        businessEmail: newBusinessEmail,
        businessPhoneNumber,
        clientName,
        clientEmail,
        clientAddress,
        clientPhoneNumber,
        subtotal,
        taxAmount,
        grandTotal,
        items: {
          deleteMany: {
            id: { in: itemsToDelete },
          },
          create: itemsToCreate,
          update: itemsToUpdate.map((item: any) => ({
            where: { id: item.id },
            data: item,
          })),
        },
      },
      include: { items: true },
    });

    res.status(200).json(smartInvoice);
  } catch (error) {
    console.error('Error updating smart invoice:', error);
    res.status(500).json({ message: 'Failed to update smart invoice' });
  }
};

export const deleteSmartInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const existingInvoice = await prisma.smartInvoice.findUnique({
      where: { id: parseInt(id), userId },
    });

    if (!existingInvoice) {
      return res.status(404).json({ message: 'Smart invoice not found' });
    }

    await prisma.smartInvoice.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting smart invoice:', error);
    res.status(500).json({ message: 'Failed to delete smart invoice' });
  }
};
