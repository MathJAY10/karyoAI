import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, BarChart3, Lightbulb, Download, Trash2, PieChart, LineChart as LineChartIcon, BarChart as BarChartIcon, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import api from '../../../lib/api';
import jsPDF from 'jspdf';
// @ts-ignore: No types for pptxgenjs
import pptxgen from 'pptxgenjs';

// import { API_BASE } from '@/lib/api';
import { useUserLimit } from '@/lib/useUserLimit';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LOCAL_STORAGE_KEY = 'pdfbrain_analysis_data';

// Remove isDarkMode prop and logic, force dark mode
// Update all color classes and chart colors to use a professional, modern dark palette

const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#a21caf', '#0ea5e9', '#f43f5e', '#84cc16', '#eab308'
];


interface PDFBrainPageProps {
  // isDarkMode?: boolean; // Removed as per edit hint
  onBack?: () => void;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface AnalysisData {
  summary: string;
  insights: string;
  wordFrequencies: { word: string; count: number }[];
  file: UploadedFile;
  entities?: { type: string; text: string }[];
  topics?: string[];
  charts?: { type: string; title: string; data: { label: string; value: number }[] }[];
}

const STEP_LABELS = [
  'Upload',
  'Analyze',
  'Visualize'
];

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="flex flex-col items-center justify-center h-full py-8 pr-2">
    {STEP_LABELS.map((label, idx) => {
      const stepNum = idx + 1;
      const isActive = currentStep === stepNum;
      const isCompleted = currentStep > stepNum;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg border-2 transition-all duration-200
                ${isActive || isCompleted ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}
              `}
            >
              {isCompleted ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                stepNum
              )}
            </div>
            <span className={`mt-2 mb-4 text-xs font-semibold tracking-wide text-center truncate ${isActive || isCompleted ? 'text-green-400' : 'text-slate-400'}`}>{label}</span>
          </div>
          {idx < STEP_LABELS.length - 1 && (
            <div className={`w-1 h-8 rounded transition-all duration-200 ${currentStep > stepNum ? 'bg-green-400' : 'bg-slate-700'}`}></div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const PDFBrainPage: React.FC<PDFBrainPageProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [suggestedChart, setSuggestedChart] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null); // 'image' | 'pdf' | 'ppt' | null
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'pie' | 'line'>('bar');

  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAnalysis(parsed);
        setUploadedFile(parsed.file);
        setCurrentStep(2);
      } catch {}
    }
  }, []);

  // PDF text extraction using pdfjs-dist (no longer needed for backend analysis)
  // const extractTextFromPDF = async (file: File): Promise<string> => { ... }

  // Remove getOpenAISummary and getWordFrequencies from frontend

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (await checkLimit(analysis ? 1 : 0) || limitReached) return;
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile({ name: file.name, size: file.size, type: file.type });
      setIsAnalyzing(true);
      try {
        // Send file to backend for analysis
        const formData = new FormData();
        formData.append('pdf', file);
        // Ensure Authorization header is sent (in addition to interceptor)
        const token = localStorage.getItem('accessToken');
        if (!token) {
          alert('Please log in to analyze PDFs.');
          return;
        }
        // Use a relative path (no leading slash) so axios preserves the baseURL path (which includes /api)
        // and let the browser set the multipart Content-Type with boundary automatically.
        const response = await api.post('pdf/brain/analyze', formData, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = response.data;
        const analysisData = data.analysis;
        setAnalysis(analysisData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(analysisData));
        setCurrentStep(2);
      } catch (err: any) {
        if (err?.response?.status === 429) handle429Error();
        if (err?.response?.status === 401) {
          alert('Unauthorized. Please log in again to analyze PDFs.');
        } else {
          alert('Failed to analyze PDF.');
        }
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [checkLimit, analysis, limitReached, handle429Error]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false
  });

  const handleVisualize = () => setCurrentStep(3); // Move to visualization step

  const handleClearData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setAnalysis(null);
    setUploadedFile(null);
    setCurrentStep(1);
  };


  // CSV data for download

  // Fetch chart suggestion after analysis
  useEffect(() => {
    if (analysis) {
      let dataToUse: any[] = [];
      
      // First try to use charts data from backend
      if (analysis.charts && analysis.charts.length > 0) {
        dataToUse = analysis.charts[0].data;
      }
      // Fallback to word frequencies if no charts
      else if (analysis.wordFrequencies && analysis.wordFrequencies.length > 0) {
        dataToUse = analysis.wordFrequencies.slice(0, 10).map(wf => ({
          label: wf.word,
          value: wf.count
        }));
      }
      
      if (dataToUse.length > 0) {
        setChartData(dataToUse);
        setChartLoading(true);
        api.post('pdf/chart/suggest-chart', { data: dataToUse })
          .then(res => {
            const data = res.data;
            setSuggestedChart(data.chartType);
            if (['bar', 'pie', 'line'].includes(data.chartType)) {
              setSelectedChartType(data.chartType);
            }
          })
          .catch(() => setSuggestedChart(null))
          .finally(() => setChartLoading(false));
      } else {
        setChartData([]);
        setSuggestedChart(null);
      }
    }
  }, [analysis]);

  // Download handlers
  const handleDownloadImage = async () => {
    setDownloadLoading('image');
    const chartArea = document.getElementById('pdfbrain-chart-area');
    if (chartArea) {
      const canvas = await html2canvas(chartArea, { backgroundColor: null });
      canvas.toBlob(blob => {
        if (blob) saveAs(blob, 'chart.png');
        setDownloadLoading(null);
      });
    } else {
      setDownloadLoading(null);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadLoading('pdf');
    const chartArea = document.getElementById('pdfbrain-chart-area');
    if (chartArea) {
      const canvas = await html2canvas(chartArea, { backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape' });
      pdf.addImage(imgData, 'PNG', 10, 10, 270, 150);
      pdf.save('chart.pdf');
    }
    setDownloadLoading(null);
  };

  const handleDownloadPPT = async () => {
    setDownloadLoading('ppt');
    const chartArea = document.getElementById('pdfbrain-chart-area');
    if (chartArea) {
      const canvas = await html2canvas(chartArea, { backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pptx = new pptxgen();
      const slide = pptx.addSlide();
      slide.addImage({ data: imgData, x: 0.5, y: 0.5, w: 9, h: 5 });
      await pptx.writeFile({ fileName: 'chart.pptx' });
    }
    setDownloadLoading(null);
  };

  // Chart rendering
  const renderDynamicChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-blue-100 dark:from-slate-800 dark:to-blue-900 rounded-full flex items-center justify-center shadow-lg">
            <BarChart3 className="w-8 h-8 text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No Chart Data Available</h3>
          <p className="text-slate-400 text-sm">This document doesn't contain data suitable for visualization.</p>
        </div>
      );
    }
    
    // Limit data points for better readability
    const displayData = chartData.slice(0, 8);
    
    switch (selectedChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.4} />
              <XAxis 
                dataKey="label" 
                stroke="#94a3b8" 
                interval={0} 
                angle={-15} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12, fontWeight: 600, fill: '#f3f4f6' }}
                tickFormatter={(label) => label.length > 15 ? label.slice(0, 12) + '...' : label}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fontSize: 12, fontWeight: 600, fill: '#f3f4f6' }}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#1e293b', 
                  borderRadius: 12, 
                  border: '1px solid #475569', 
                  color: '#f8fafc', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  fontSize: 14,
                  fontWeight: 500
                }} 
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} 
                formatter={(value) => [`${value}`, 'Value']}
                labelFormatter={(label) => label.length > 20 ? label.slice(0, 17) + '...' : label}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}
              />
              <Bar 
                dataKey="value" 
                fill="url(#barGradient)" 
                radius={6}
                activeBar={{ fill: 'url(#barGradient)', radius: 6 }}
              >
                {displayData.map((_entry, idx) => (
                  <Cell key={`cell-bar-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent !== undefined ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
                outerRadius={120}
                innerRadius={60}
                fill="#3b82f6"
                dataKey="value"
                nameKey="label"
                paddingAngle={3}
              >
                {displayData.map((_entry, idx) => (
                  <Cell key={`cell-pie-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#1e293b', 
                  borderRadius: 12, 
                  border: '1px solid #475569', 
                  color: '#f8fafc', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  fontSize: 14,
                  fontWeight: 500
                }}
                formatter={(value) => [`${value}`, 'Value']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}
                formatter={(value) => value.length > 20 ? value.slice(0, 17) + '...' : value}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.4} />
              <XAxis 
                dataKey="label" 
                stroke="#94a3b8" 
                interval={0} 
                angle={-15} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12, fontWeight: 600, fill: '#f3f4f6' }}
                tickFormatter={(label) => label.length > 15 ? label.slice(0, 12) + '...' : label}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fontSize: 12, fontWeight: 600, fill: '#f3f4f6' }}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#1e293b', 
                  borderRadius: 12, 
                  border: '1px solid #475569', 
                  color: '#f8fafc', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  fontSize: 14,
                  fontWeight: 500
                }}
                formatter={(value, _name) => [`${value}`, 'Value']}
                labelFormatter={(label) => label.length > 20 ? label.slice(0, 17) + '...' : label}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 3 }} 
                activeDot={{ r: 8, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 3 }}
                fill="url(#lineGradient)"
              />
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // UI sections
  const renderUploadSection = () => (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-md mx-auto text-center bg-transparent">
        <FileText className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight" style={{color: '#e0e7ef'}}>Upload Your PDF</h1>
        <p className="text-base mb-6 text-gray-400">Drag and drop your PDF or click to browse. We'll analyze your document automatically.</p>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
          ${isDragActive ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950' : 'border-gray-200 bg-gray-50 hover:border-indigo-400'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mb-2 text-indigo-400" />
          <span className="text-base font-semibold mb-1 text-gray-700 dark:text-gray-200">Drop your PDF here</span>
          <span className="text-gray-400 mb-1">or click to browse your files</span>
          <div className="text-xs text-gray-400">Supports .pdf files • Max 20MB</div>
        </div>
        {uploadedFile && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-300 font-medium">
              ✓ {uploadedFile.name} uploaded successfully
            </p>
          </div>
        )}
        {isAnalyzing && (
          <div className="mt-6 flex flex-col items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-indigo-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-indigo-500 font-semibold">Analyzing your PDF…</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalysisSection = () => (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-xl shadow p-6 bg-[#181c2a]`}> 
          <h3 className="text-lg font-bold mb-3 text-indigo-500 flex items-center gap-2"><Lightbulb className="w-5 h-5" />Summary</h3>
          <div className="text-gray-400 text-sm whitespace-pre-line">{analysis?.summary || 'No summary available.'}</div>
        </div>
        <div className={`rounded-xl shadow p-6 bg-[#181c2a]`}> 
          <h3 className="text-lg font-bold mb-3 text-indigo-500 flex items-center gap-2"><BarChart3 className="w-5 h-5" />Insights</h3>
          <div className="text-gray-400 text-sm whitespace-pre-line">{analysis?.insights || 'No insights available.'}</div>
        </div>
      </div>
      <div className="w-full flex justify-center mt-8">
        <button onClick={handleVisualize} className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl transition-all duration-200 text-lg tracking-wide">Visualize</button>
      </div>
    </div>
  );

  // Visualization Section
  const renderVisualizationSection = () => (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        <div className={`rounded-3xl shadow-2xl p-8 flex flex-col gap-8 border-l-8 bg-[#181c2a]`}> 
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 tracking-tight">📊 Data Visualization</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Interactive charts and insights from your document</p>
            </div>
            {chartLoading && (
              <div className="ml-auto flex items-center gap-2 text-indigo-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-6 mb-6">
            {suggestedChart && (
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  AI Suggests: {suggestedChart.charAt(0).toUpperCase() + suggestedChart.slice(1)} Chart
                </span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-600 dark:text-gray-300 text-sm">Chart Type:</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedChartType('bar')} 
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 text-sm ${
                    selectedChartType === 'bar' 
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white scale-105 shadow-indigo-500/25' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 hover:scale-105'
                  }`}
                >
                  <BarChartIcon className="w-5 h-5" />Bar
                </button>
                <button 
                  onClick={() => setSelectedChartType('line')} 
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 text-sm ${
                    selectedChartType === 'line' 
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white scale-105 shadow-indigo-500/25' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 hover:scale-105'
                  }`}
                >
                  <LineChartIcon className="w-5 h-5" />Line
                </button>
                <button 
                  onClick={() => setSelectedChartType('pie')} 
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 text-sm ${
                    selectedChartType === 'pie' 
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white scale-105 shadow-indigo-500/25' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 hover:scale-105'
                  }`}
                >
                  <PieChart className="w-5 h-5" />Pie
                </button>
              </div>
            </div>
          </div>
          
          <div id="pdfbrain-chart-area" className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 shadow-xl p-8 border border-slate-700 min-h-[500px] flex items-center justify-center backdrop-blur-sm">
            {renderDynamicChart()}
          </div>
          
          <div className="flex flex-wrap gap-4 justify-end mt-6">
            <button 
              onClick={handleDownloadImage} 
              disabled={downloadLoading==='image'} 
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105" 
              title="Download as Image"
            >
              <Download className="w-4 h-4" />
              {downloadLoading==='image' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Image'}
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={downloadLoading==='pdf'} 
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105" 
              title="Download as PDF"
            >
              <FileText className="w-4 h-4" />
              {downloadLoading==='pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PDF'}
            </button>
            <button 
              onClick={handleDownloadPPT} 
              disabled={downloadLoading==='ppt'} 
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105" 
              title="Download as PPT"
            >
              <BarChart3 className="w-4 h-4" />
              {downloadLoading==='ppt' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PPT'}
            </button>
          </div>
        </div>
        <div className="w-full flex justify-end mt-2">
          <button 
            onClick={handleClearData} 
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 text-sm hover:scale-105"
          >
            <Trash2 className="w-4 h-4" />Clear Data
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-row px-4 w-full pt-4">
      {Snackbar}
      <div className="flex-1 flex flex-col">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-between mb-8 px-2">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && currentStep > 1 && (
                <button onClick={() => setCurrentStep(currentStep - 1)} className={`p-2 rounded-lg transition-colors duration-200 ${'hover:bg-gray-800'}`} aria-label="Go back" title="Go back">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              {onBack && currentStep === 1 && (
                <button onClick={onBack} className={`p-2 rounded-lg transition-colors duration-200 ${'hover:bg-gray-800'}`} aria-label="Go back" title="Go back">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{color: '#e0e7ef'}}>PDF Brain</h1>
                <p className="text-gray-400 text-sm">Summarize, analyze, and visualize your PDF</p>
              </div>
            </div>
            {/* Next button logic */}
            <div className="flex items-center gap-2">
              {currentStep === 1 && (
                <button
                  className={`px-6 py-2 rounded-lg font-bold shadow transition-all duration-200 text-white text-sm bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600`}
                  onClick={() => setCurrentStep(2)}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {isAnalyzing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className={`rounded-xl shadow-xl px-8 py-10 flex flex-col items-center bg-[#181c2a]`}> 
                <svg className="animate-spin h-12 w-12 text-indigo-500 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <h2 className={`text-2xl font-bold mb-2 ${'text-indigo-300'}`}>Analyzing your PDF…</h2>
                <p className="text-gray-500 text-center max-w-xs">We're extracting content and generating insights. This may take a few seconds.</p>
              </div>
            </div>
          )}
          {currentStep === 1 && renderUploadSection()}
          {currentStep === 2 && renderAnalysisSection()}
          {currentStep === 3 && renderVisualizationSection()}
        </div>
      </div>
      {/* Vertical Stepper on the right */}
      <div className="hidden md:flex flex-col items-center justify-center min-w-[120px] max-w-[160px]">
        <Stepper currentStep={currentStep} />
      </div>
    </div>
  );
};

export default PDFBrainPage; 