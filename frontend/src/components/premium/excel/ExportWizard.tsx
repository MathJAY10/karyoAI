import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';

const ExportWizard: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState('data');
    const [exportFormat, setExportFormat] = useState('csv');
    const tableRef = useRef(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        setFileName(file.name.split('.')[0]);
        const reader = new FileReader();
        reader.onload = (e: any) => {
            const fileData = e.target.result;
            const workbook = XLSX.read(fileData, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (jsonData.length > 0) {
                const rawHeaders:any = jsonData[0];
                setHeaders(rawHeaders);
                const tableData:any = jsonData.slice(1).map((row: any) => {
                    const newRow: any = {};
                    rawHeaders.forEach((header:any, index:any) => {
                        newRow[header] = row[index];
                    });
                    return newRow;
                });
                setData(tableData);
            }
        };
        reader.readAsBinaryString(file);
    }, []);

    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] } });

    const handleExport = () => {
        if (data.length === 0) return;

        if (exportFormat === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const csvData = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `${fileName}.csv`);
        } else if (exportFormat === 'json') {
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
            saveAs(blob, `${fileName}.json`);
        } else if (exportFormat === 'pdf') {
            const doc = new jsPDF();
            (doc as any).autoTable({
                head: [headers],
                body: data.map(row => headers.map(header => row[header])),
            });
            doc.save(`${fileName}.pdf`);
        } else if (exportFormat === 'png' || exportFormat === 'jpeg') {
            if (tableRef.current) {
                html2canvas(tableRef.current).then(canvas => {
                    const image = canvas.toDataURL(`image/${exportFormat}`);
                    saveAs(image, `${fileName}.${exportFormat}`);
                });
            }
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-[#181c2a] rounded-2xl shadow-xl p-8 mt-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/premium/excel')} className="p-2 rounded-lg bg-[#23263a] hover:bg-blue-900 transition-colors duration-200 border border-blue-900" aria-label="Go back to Excel suite">
                    <ArrowLeft className="w-6 h-6 text-blue-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Export Wizard</h1>
                    <p className="text-blue-300 text-base">Upload, preview, and export your data.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div {...getRootProps()} className="border-2 border-dashed border-blue-900 rounded-xl p-8 cursor-pointer hover:border-blue-400 bg-[#23263a] flex flex-col items-center justify-center text-center">
                    <input {...getInputProps()} />
                    <Upload className="w-12 h-12 text-blue-400 mb-4" />
                    <p className="text-lg font-semibold text-white">Drop your file here</p>
                    <p className="text-sm text-blue-300">or click to browse</p>
                </div>
                <div className="bg-[#23263a] rounded-xl p-8">
                    <h2 className="text-xl font-bold text-white mb-4">Export Settings</h2>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="fileNameInput" className="text-sm font-semibold text-blue-400 mb-2 block">File Name</label>
                            <input id="fileNameInput" type="text" value={fileName} onChange={e => setFileName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100" />
                        </div>
                        <div>
                            <label htmlFor="formatSelect" className="text-sm font-semibold text-blue-400 mb-2 block">Export Format</label>
                            <select id="formatSelect" value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100">
                                <option value="csv">CSV (.csv)</option>
                                <option value="json">JSON (.json)</option>
                                <option value="pdf">PDF (.pdf)</option>
                                <option value="png">PNG (.png)</option>
                                <option value="jpeg">JPEG (.jpeg)</option>
                            </select>
                        </div>
                        <button onClick={handleExport} className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg mt-4 flex items-center justify-center gap-2">
                            <FileDown className="w-5 h-5" />
                            Export Data
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-8 bg-[#23263a] rounded-xl p-8">
                <h2 className="text-xl font-bold text-white mb-4">Data Preview</h2>
                <div className="overflow-x-auto" ref={tableRef}>
                    <table className="w-full text-sm text-left text-blue-200">
                        <thead className="text-xs text-blue-400 uppercase bg-[#181c2a]">
                            <tr>
                                {headers.map(header => <th key={header} className="px-6 py-3">{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice(0, 10).map((row, index) => (
                                <tr key={index} className="bg-[#23263a] border-b border-blue-900">
                                    {headers.map(header => <td key={header} className="px-6 py-4">{row[header]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExportWizard; 