import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, FileSpreadsheet, Brain, Download,BarChart3, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { useUserLimit } from '../../../lib/useUserLimit';

interface AISheetSummarizerProps {
  isDarkMode?: boolean;
  onBack?: () => void;
  isFullPage?: boolean;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

const LOCAL_STORAGE_KEY = 'aisheet_excel_data';

const AISheetSummarizer: React.FC<AISheetSummarizerProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [insights, setInsights] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const { data, file, summary: storedSummary, insights: storedInsights } = JSON.parse(stored);
        setParsedData(data);
        setUploadedFile(file);
        setSummary(storedSummary || '');
        setInsights(storedInsights || []);
        setCurrentStep(3); // Go directly to summary if data exists
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    (async () => {
      if (await checkLimit(parsedData.length) || limitReached) return;
      const file = acceptedFiles[0];
      if (file) {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type
        });
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            setParsedData(jsonData as any[]);
            // Set default selected columns
            if (jsonData && jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null) {
              const keys = Object.keys(jsonData[0] as Record<string, any>);
              setSelectedColumns(keys.slice(0, Math.min(5, keys.length))); // Select first 5 columns by default
            }
            // Save to localStorage
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ 
              data: jsonData, 
              file: {
                name: file.name,
                size: file.size,
                type: file.type
              }
            }));
            setTimeout(() => {
              setIsAnalyzing(false);
              setCurrentStep(2);
            }, 1200);
          } catch (err: any) {
            if (err?.response?.status === 429) handle429Error();
            setIsAnalyzing(false);
            alert('Failed to parse Excel file. Please upload a valid .xlsx or .xls file.');
          }
        };
        reader.readAsArrayBuffer(file);
      }
    })();
  }, [checkLimit, parsedData.length, limitReached, handle429Error]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  });

  const handleAnalyze = () => {
    (async () => {
      if (await checkLimit(parsedData.length) || limitReached) return;
      setIsAnalyzing(true);
      // Simulate AI analysis
      setTimeout(() => {
        const mockSummary = `This dataset contains ${parsedData.length} rows with ${Object.keys(parsedData[0] || {}).length} columns. The data appears to be well-structured with consistent formatting. Key observations include patterns in data distribution and potential outliers that may require attention.`;
        const mockInsights = [
          'Data quality appears high with minimal missing values',
          'Several columns show strong correlations',
          'Outliers detected in 3 columns that may need review',
          'Data distribution is relatively normal across most metrics',
          'Recommendation: Consider data validation for future entries'
        ];
        setSummary(mockSummary);
        setInsights(mockInsights);
        // Save to localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ 
          data: parsedData, 
          file: uploadedFile,
          summary: mockSummary,
          insights: mockInsights
        }));
        setIsAnalyzing(false);
        setCurrentStep(3);
      }, 2000);
    })();
  };

  const handleDownload = async () => {
    const summaryArea = document.getElementById('summary-area');
    if (summaryArea) {
      const canvas = await html2canvas(summaryArea, { backgroundColor: null });
      canvas.toBlob(blob => {
        if (blob) saveAs(blob, 'sheet-summary.png');
      });
    }
  };

  const handleClearData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setParsedData([]);
    setUploadedFile(null);
    setSummary('');
    setInsights([]);
    setSelectedColumns([]);
    setCurrentStep(1);
  };

  // --- UI ---
  return (
    <div className={
      `w-full max-w-4xl mx-auto bg-[#181c2a] rounded-2xl shadow-xl p-0 md:p-8 mt-4`
    }>
      {Snackbar}
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-6 pb-2 md:px-0">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-[#23263a] hover:bg-blue-900 transition-colors duration-200 border border-blue-900"
          aria-label="Go back"
          title="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-blue-400" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1 text-white">AI Sheet Summarizer</h1>
          <p className="text-blue-300 text-sm md:text-base">Get intelligent insights from your spreadsheets</p>
        </div>
      </div>
      {/* Content */}
      <div className="w-full flex flex-col items-center justify-center py-6 px-2 md:px-0">
        {isAnalyzing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="rounded-xl shadow-xl px-8 py-10 flex flex-col items-center bg-[#23263a]"> 
              <svg className="animate-spin h-12 w-12 text-blue-400 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <h2 className="text-2xl font-bold mb-2 text-blue-300">Analyzing your data…</h2>
              <p className="text-blue-200 text-center max-w-xs">Our AI is processing your spreadsheet and generating intelligent insights.</p>
            </div>
          </div>
        )}
        {/* Stepper */}
        <div className="flex items-center justify-end gap-2 mb-8">
          {[1,2,3].map((step, idx) => (
            <React.Fragment key={step}>
              <button
                onClick={() => setCurrentStep(step)}
                className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm border-2 transition-all duration-200 focus:outline-none
                  ${currentStep === step ? 'bg-blue-600 text-white border-blue-400' :
                    'bg-[#23263a] text-blue-300 border-blue-900'}`}
                aria-label={`Go to step ${step}`}
              >{step}</button>
              {idx < 2 && <div className={`w-8 h-1 rounded-full ${currentStep > step ? 'bg-blue-400' : 'bg-[#23263a]'}`}></div>}
            </React.Fragment>
          ))}
        </div>
        {/* Steps */}
        {currentStep === 1 && (
          <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full max-w-md mx-auto text-center bg-transparent">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h1 className="text-2xl font-extrabold mb-2 tracking-tight text-white">Upload Your Excel File</h1>
              <p className="text-base mb-6 text-blue-200">Our AI will analyze your spreadsheet and provide intelligent insights.</p>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
                ${isDragActive ? 'border-blue-400 bg-blue-950' : 'border-blue-900 bg-[#23263a] hover:border-blue-400'}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mb-2 text-blue-400" />
                <span className="text-base font-semibold mb-1 text-blue-100">Drop your Excel file here</span>
                <span className="text-blue-300 mb-1">or click to browse your files</span>
                <div className="text-xs text-blue-300">Supports .xlsx and .xls files • Max 10MB</div>
              </div>
              {uploadedFile && (
                <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg">
                  <p className="text-blue-200 font-medium">
                    ✓ {uploadedFile.name} uploaded successfully
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {currentStep === 2 && (
          <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl shadow p-6 bg-[#23263a]"> 
                <h3 className="text-lg font-bold mb-3 text-blue-400">Data Structure</h3>
                <div className="space-y-2 text-blue-200 text-sm">
                  <div className="flex justify-between"><span>Rows:</span><span className="font-semibold text-blue-100">{parsedData.length}</span></div>
                  <div className="flex justify-between"><span>Columns:</span><span className="font-semibold text-blue-100">{Object.keys(parsedData[0] || {}).length}</span></div>
                  <div className="flex justify-between"><span>Data Types:</span><span className="font-semibold text-blue-100">Mixed</span></div>
                </div>
              </div>
              <div className="rounded-xl shadow p-6 bg-[#23263a]"> 
                <h3 className="text-lg font-bold mb-3 text-blue-400">AI Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Brain className="w-5 h-5 text-blue-400" /><span className="text-blue-200">Pattern Recognition</span></div>
                  <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-pink-400" /><span className="text-blue-200">Statistical Analysis</span></div>
                  <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" /><span className="text-blue-200">Trend Detection</span></div>
                </div>
              </div>
              <div className="col-span-2 text-center mt-6">
                <button onClick={handleAnalyze} className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white px-8 py-2 rounded-xl font-bold shadow-lg transition-all duration-200">Generate AI Summary</button>
              </div>
            </div>
          </div>
        )}
        {currentStep === 3 && (
          <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full max-w-4xl mx-auto flex justify-end mb-4">
              <button onClick={handleClearData} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow transition-all duration-200 text-sm">Clear Data</button>
            </div>
            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Panel */}
              <div className="rounded-xl shadow p-6 flex flex-col gap-5 border-l-4 bg-[#23263a] border-blue-700"> 
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold tracking-wide text-blue-300">AI Summary</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-400 mb-2">Selected Columns</label>
                    <div className="space-y-2">
                      {Object.keys(parsedData[0] || {}).map((column) => (
                        <label key={column} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(column)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedColumns([...selectedColumns, column]);
                              } else {
                                setSelectedColumns(selectedColumns.filter(c => c !== column));
                              }
                            }}
                            className="rounded border-blue-700 text-blue-400 focus:ring-blue-500 bg-[#181c2a]"
                          />
                          <span className="text-sm text-blue-200">{column}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Summary Content */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="rounded-xl shadow-lg p-6 flex flex-col gap-4 bg-gradient-to-br from-[#23263a] via-[#181c2a] to-blue-950 transition-all duration-300" id="summary-area"> 
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">AI Sheet Analysis</h3>
                      <p className="text-blue-300 text-sm">Intelligent insights from your spreadsheet data.</p>
                    </div>
                    <button onClick={handleDownload} className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white px-5 py-2 rounded-xl font-semibold shadow transition-all duration-200 text-sm">
                      <Download className="w-5 h-5" />
                      <span>Download Summary</span>
                    </button>
                  </div>
                  {/* Summary Text */}
                  <div className="bg-[#181c2a] rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-white mb-2">Executive Summary</h4>
                    <p className="text-blue-200 text-sm leading-relaxed">
                      {summary || 'No summary available. Please analyze your data first.'}
                    </p>
                  </div>
                  {/* Key Insights */}
                  <div className="bg-[#181c2a] rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Key Insights</h4>
                    <div className="space-y-2">
                      {insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                          <p className="text-blue-200 text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISheetSummarizer; 