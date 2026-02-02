import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, FileDown } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';


const PDFConverterPro: React.FC = () => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('converted');
    const [exportFormat, setExportFormat] = useState('excel');
    const [loading, setLoading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setPdfFile(file);
    setFileName(file.name.split('.')[0]);
    }, []);

    // PDF parsing removed; handled by backend

    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } });

    const handleExport = async () => {
        if (!pdfFile) return;
        setLoading(true);
        let endpoint = '';
        let ext = '';
        switch (exportFormat) {
            case 'excel':
                endpoint = '/api/pdf/convert/to-excel';
                ext = 'xlsx';
                break;
            case 'csv':
                endpoint = '/api/pdf/convert/to-csv';
                ext = 'csv';
                break;
            case 'word':
                endpoint = '/api/pdf/convert/to-word';
                ext = 'docx';
                break;
           
            default:
                setLoading(false);
                return;
        }
        try {
            const formData = new FormData();
            formData.append('file', pdfFile);
            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Conversion failed');
            const blob = await res.blob();
            saveAs(blob, `${fileName}.${ext}`);
        } catch (err) {
            alert('Failed to convert PDF.');
        }
        setLoading(false);
    };

    return (
    <div className="w-full max-w-5xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl p-10 mt-8 flex flex-col">
            <div className="flex items-center gap-5 mb-9">
                <button onClick={() => navigate('/premium/pdfhub')} className="p-3 rounded-lg bg-[#23263a] hover:bg-blue-900 transition-colors duration-200 border border-blue-900" aria-label="Go back to PDF tools">
                    <ArrowLeft className="w-7 h-7 text-blue-400" />
                </button>
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white">PDF Converter Pro</h1>
                    <p className="text-blue-300 text-lg mt-2">Convert your PDF to Excel, Word, CSV with a single click.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                <div {...getRootProps()} className="border-2 border-dashed border-blue-900 rounded-2xl p-10 cursor-pointer hover:border-blue-400 bg-[#23263a] flex flex-col items-center justify-center text-center min-h-[315px]">
                    <input {...getInputProps()} />
                    <Upload className="w-14 h-14 text-blue-400 mb-5" />
                    <p className="text-xl font-semibold text-white mb-2">Drop your PDF here</p>
                    <p className="text-[15px] text-blue-300 mb-2">or click to browse</p>
                    <p className="text-xs text-blue-400">Supported formats: PDF up to 20MB</p>
                </div>
                <div className="bg-[#23263a] rounded-2xl p-10 flex flex-col gap-7 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-5">Export Settings</h2>
                    <div className="flex flex-col gap-5">
                        <div>
                            <label htmlFor="fileNameInput" className="text-[15px] font-semibold text-blue-400 mb-2 block">File Name</label>
                            <input id="fileNameInput" type="text" value={fileName} onChange={e => setFileName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 text-base" />
                        </div>
                        <div>
                            <label htmlFor="formatSelect" className="text-[15px] font-semibold text-blue-400 mb-2 block">Export Format</label>
                            <select id="formatSelect" value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 text-base">
                                <option value="excel">Excel (.xlsx)</option>
                                <option value="word">Word (.docx)</option>
                                <option value="csv">CSV (.csv)</option>
                            </select>
                        </div>
                        <button onClick={handleExport} disabled={loading || !pdfFile} className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg mt-5 flex items-center justify-center gap-2 text-base disabled:opacity-50">
                            <FileDown className="w-5 h-5" />
                            {loading ? 'Converting...' : 'Convert & Export'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PDFConverterPro;

