import React, { useState, useRef } from 'react';
import { FileText, Upload, ArrowLeft, Download, Home } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { useUserLimit } from '@/lib/useUserLimit';

const UPLOAD_AND_EXTRACT_API = `${API_BASE}/pdf/smartdata/upload-and-extract`;

interface ExtractedData {
  summary?: string;
  fields?: Record<string, string>;
  [key: string]: any;
}

interface SmartDataExtractorPanelProps {
  onBack?: () => void;
}

const SmartDataExtractorPanel: React.FC<SmartDataExtractorPanelProps> = ({ onBack }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [view, setView] = useState<'upload' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { limitReached, checkLimit, Snackbar } = useUserLimit();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (await checkLimit(0) || limitReached) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf' || file.size > 20 * 1024 * 1024) {
      alert('Only PDF files up to 20MB are allowed.');
      return;
    }
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (await checkLimit(0) || limitReached) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf' || file.size > 20 * 1024 * 1024) {
      alert('Only PDF files up to 20MB are allowed.');
      return;
    }
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const response = await fetch(UPLOAD_AND_EXTRACT_API, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to upload PDF');
      const data = await response.json();
      // Find the last bot message with valid JSON
      let extracted = null;
      if (Array.isArray(data.messages)) {
        const botMsg = [...data.messages].reverse().find(m => m.sender === 'bot' && m.content && m.content.trim().startsWith('{'));
        if (botMsg) {
          try {
            extracted = JSON.parse(botMsg.content);
          } catch (e) {
            extracted = { error: 'Failed to parse extracted data.' };
          }
        } else {
          extracted = { error: 'No structured data found.' };
        }
      } else {
        extracted = { error: 'No structured data found.' };
      }
      setExtracted(extracted);
      setView('result');
    } catch (err) {
      alert('Failed to upload PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadAnother = () => {
    setExtracted(null);
    setView('upload');
  };

  const handleBack = () => {
    setView('upload');
  };

  const handleExport = (type: 'pdf' | 'csv') => {
    if (!extracted) return;
    if (type === 'pdf') {
      const win = window.open('', '', 'width=800,height=600');
      if (win) {
        win.document.write('<pre>' + JSON.stringify(extracted, null, 2) + '</pre>');
        win.print();
        win.close();
      }
    } else if (type === 'csv') {
      const rows = Object.entries(extracted.fields || {}).map(([k, v]) => `${k},${v}`);
      const csv = 'Field,Value\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Best-practice renderer: show all top-level fields (except 'error') in a clean, flat layout
  function renderStructuredData(data: any, depth = 0) {
    if (data === null || data === undefined) return <span className="text-gray-400">null</span>;
    if (Array.isArray(data)) {
      if (data.length === 0) return <span className="text-gray-400">[]</span>;
      return (
        <ul className={`ml-${depth * 4} pl-2 border-l border-blue-900`}> 
          {data.map((item, idx) => (
            <li key={idx} className="mb-1">{renderStructuredData(item, depth + 1)}</li>
          ))}
        </ul>
      );
    }
    if (typeof data === 'object') {
      return (
        <div className={`ml-${depth * 4} pl-2 border-l border-blue-900 space-y-2`}> 
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex flex-row items-start gap-2">
              <span className="font-semibold text-blue-300 min-w-[100px]">{k}:</span>
              <span className="flex-1">{renderStructuredData(v, depth + 1)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-gray-100">{String(data)}</span>;
  }

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto bg-[#0f1220] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[70vh] my-6" style={{ minHeight: '70vh' }}>
      {Snackbar}
      <div className="flex items-center gap-3 px-4 md:px-12 py-6 md:py-8 border-b border-blue-900 bg-[#161a2f]">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-[#0f1220] hover:bg-blue-900 border border-blue-900 mr-2"
          aria-label="Back to PDFHub Dashboard"
          title="Back to PDFHub Dashboard"
        >
          <Home className="w-6 h-6 text-blue-400" />
        </button>
        <FileText className="w-7 h-7 text-blue-400" />
        <div className="flex-1">
          <h2 className="font-bold text-3xl text-white">Smart Data Extractor</h2>
          <p className="text-base text-blue-300">Extract structured data from PDFs automatically</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2 md:px-12 py-6 md:py-12">
        {view === 'upload' && (
          <div
            className={`border-2 border-dashed border-blue-800 hover:border-blue-600 transition-colors rounded-xl w-full max-w-2xl p-6 md:p-10 text-center bg-[#0b0e1a] cursor-pointer flex flex-col items-center justify-center`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 bg-blue-400/80 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                  <span className="w-2.5 h-2.5 bg-blue-400/80 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-2.5 h-2.5 bg-blue-400/80 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
                <p className="text-sm text-blue-200">Extracting your PDF...</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                <p className="text-sm mb-4">Drag & drop your PDF here or click to choose</p>
                <p className="text-[11px] mt-1 text-blue-400">PDF only, up to 20MB</p>
                <input
                  id="pdf-upload-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isUploading}
                  aria-label="Upload PDF file"
                  title="Upload PDF file"
                />
              </>
            )}
          </div>
        )}
        {view === 'result' && extracted && (
          <div className="w-full max-w-6xl bg-[#181c2a] rounded-2xl shadow-xl p-6 md:p-10 flex flex-col gap-6 items-center overflow-auto" style={{ maxHeight: '80vh' }}>
            <div className="w-full flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-blue-900 text-white text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />Back
              </button>
              <button
                onClick={handleUploadAnother}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-sm font-semibold"
              >
                <Upload className="w-4 h-4" />Upload another PDF
              </button>
            </div>
            <div className="w-full">
              <h3 className="text-2xl font-bold mb-6 text-indigo-400">Extracted Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {extracted.error ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-8">
                    <div className="text-3xl text-red-400 mb-2">❌</div>
                    <div className="text-lg font-semibold text-red-300">{extracted.error}</div>
                  </div>
                ) : Object.keys(extracted).filter(k => k !== 'error').length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-8">
                    <div className="text-3xl text-blue-400 mb-2">📄</div>
                    <div className="text-lg font-semibold text-blue-200">No structured data extracted from this PDF.</div>
                  </div>
                ) : (
                  Object.entries(extracted)
                    .filter(([k]) => k !== 'error')
                    .map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1 border-b border-blue-900 pb-3 last:border-b-0">
                        <span className="font-semibold text-blue-300 text-base mb-1">{key}</span>
                        <div className="ml-2">{renderStructuredData(value)}</div>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="w-full flex flex-row gap-4 justify-end mt-4">
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 text-sm hover:scale-105"
                title="Export as PDF"
              >
                <Download className="w-4 h-4" />PDF
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 text-sm hover:scale-105"
                title="Export as CSV"
              >
                <Download className="w-4 h-4" />CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartDataExtractorPanel;
