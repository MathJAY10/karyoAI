import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableRow, TableCell } from 'docx';

import { tmpdir } from 'os';

// Utility: Save buffer to temp file
const saveTempFile = (buffer: Buffer, ext: string) => {
    const tempPath = path.join(tmpdir(), `pdfconv_${Date.now()}${Math.random().toString(36).slice(2)}.${ext}`);
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
};

export const convertPdfToExcel = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
        const pdfBuffer = req.file.buffer;
        const data = await pdfParse(pdfBuffer);
        // Naive table extraction: split by lines, then by whitespace (improve as needed)
        const rows = data.text.split('\n').map(line => line.split(/\s{2,}|\t/));
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');
        rows.forEach(row => worksheet.addRow(row));
        const outBuffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', 'attachment; filename="converted.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(outBuffer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to convert PDF to Excel', details: err });
    }
};

export const convertPdfToCsv = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
        const pdfBuffer = req.file.buffer;
        const data = await pdfParse(pdfBuffer);
        const rows = data.text.split('\n').map(line => line.split(/\s{2,}|\t/));
        const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        res.setHeader('Content-Disposition', 'attachment; filename="converted.csv"');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: 'Failed to convert PDF to CSV', details: err });
    }
};

export const convertPdfToWord = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
        const pdfBuffer = req.file.buffer;
        const data = await pdfParse(pdfBuffer);
        const rows = data.text.split('\n').map(line => line.split(/\s{2,}|\t/));
        const doc = new Document({
            sections: [
                {
                    children: [
                        new Table({
                            rows: rows.map(row => new TableRow({
                                children: row.map(cell => new TableCell({ children: [new Paragraph(cell)] }))
                            }))
                        })
                    ]
                }
            ]
        });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Disposition', 'attachment; filename="converted.docx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to convert PDF to Word', details: err });
    }
};



