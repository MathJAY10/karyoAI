import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, FileSpreadsheet, BarChart3, PieChart, TrendingUp, Download,  SlidersHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { CSVLink } from 'react-csv';
import { useUserLimit } from '../../../lib/useUserLimit';

interface ChartBuilderProps {
  isDarkMode?: boolean;
  onBack?: () => void;
  isFullPage?: boolean;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

// Remove sampleData. We'll use parsedData from Excel.

const LOCAL_STORAGE_KEY = 'chartbuilder_excel_data';

const COLORS = ['#38bdf8', '#818cf8', '#f472b6', '#34d399', '#fbbf24'];

const ChartBuilder: React.FC<ChartBuilderProps> = ({ isDarkMode = false, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'pie' | 'line' | 'area' | 'scatter'>('bar');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');

  const { limitReached, checkLimit, Snackbar } = useUserLimit();

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const { data, file } = JSON.parse(stored);
        setParsedData(data);
        setUploadedFile(file);
        setCurrentStep(3); // Go directly to visualization if data exists
        // Set default axes
        if (data && data.length > 0) {
          const keys = Object.keys(data[0]);
          setXAxis(keys[0]);
          // Find first numeric column for yAxis
          const yKey = keys.find(k => typeof data[0][k] === 'number' || !isNaN(Number(data[0][k])));
          setYAxis(yKey || keys[1] || keys[0]);
        }
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
            // Save to localStorage
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ data: jsonData, file: {
              name: file.name,
              size: file.size,
              type: file.type
            }}));
            // Set default axes
            if (jsonData && jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null) {
              const keys = Object.keys(jsonData[0] as Record<string, any>);
              setXAxis(keys[0]);
              const yKey = keys.find(k => typeof (jsonData[0] as Record<string, any>)[k] === 'number' || !isNaN(Number((jsonData[0] as Record<string, any>)[k])));
              setYAxis(yKey || keys[1] || keys[0]);
            }
            setTimeout(() => {
              setIsAnalyzing(false);
              setCurrentStep(2);
            }, 2200);
          } catch (err) {
            setIsAnalyzing(false);
            alert('Failed to parse Excel file. Please upload a valid .xlsx or .xls file.');
          }
        };
        reader.readAsArrayBuffer(file);
      }
    })();
  }, [checkLimit, parsedData.length, limitReached]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  });

  const handleVisualize = () => setCurrentStep(3);
  // Download chart as PNG
  const handleDownload = async () => {
    const chartArea = document.getElementById('chart-area');
    if (chartArea) {
      const canvas = await html2canvas(chartArea, { backgroundColor: null });
      canvas.toBlob(blob => {
        if (blob) saveAs(blob, 'chart.png');
      });
    }
  };

  // Filtered data for chart
  const getFilteredData = () => {
    if (!parsedData || !yAxis) return [];
    // Sanitize: ensure all rows have x and y values, and y is a number
    return parsedData.filter(row => {
      if (!row || typeof row !== 'object') return false;
      const xVal = row[xAxis];
      const yVal = typeof row[yAxis] === 'number' ? row[yAxis] : Number(row[yAxis]);
      if (xVal === undefined || xVal === null || yVal === undefined || yVal === null || isNaN(yVal)) return false;
      if (minValue && yVal < Number(minValue)) return false;
      if (maxValue && yVal > Number(maxValue)) return false;
      return true;
    });
  };

  // Download filtered data as CSV (must come after getFilteredData definition)
  const csvData = getFilteredData();

  // Loading overlay
  const renderLoadingOverlay = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className={`rounded-xl shadow-xl px-8 py-10 flex flex-col items-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}> 
        <svg className="animate-spin h-12 w-12 text-blue-500 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Analyzing your data…</h2>
        <p className="text-gray-500 text-center max-w-xs">We're auto-detecting your sheet structure and preparing your dashboard. This may take a few seconds.</p>
      </div>
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-end gap-2 mb-8">
      {[1,2,3].map((step, idx) => (
        <React.Fragment key={step}>
          <button
            onClick={() => setCurrentStep(step)}
            className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm border-2 transition-all duration-200 focus:outline-none
              ${currentStep === step ? (isDarkMode ? 'bg-blue-600 text-white border-blue-400' : 'bg-blue-500 text-white border-blue-500') :
                (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200')}`}
            aria-label={`Go to step ${step}`}
          >{step}</button>
          {idx < 2 && <div className={`w-8 h-1 rounded-full ${currentStep > step ? 'bg-blue-400' : 'bg-gray-300 dark:bg-gray-700'}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );

  const renderUploadSection = () => (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-md mx-auto text-center bg-transparent">
        <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight" style={{color: isDarkMode ? '#e0e7ef' : 'white'}}>Upload Your Excel File</h1>
        <p className="text-base mb-6 text-gray-400">Drag and drop your file or click to browse. We'll analyze your data automatically.</p>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
          ${isDragActive ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : isDarkMode ? 'border-gray-700 bg-gray-800 hover:border-blue-400' : 'border-gray-200 bg-gray-50 hover:border-blue-400'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mb-2 text-blue-400" />
          <span className="text-base font-semibold mb-1 text-gray-700 dark:text-gray-200">Drop your Excel file here</span>
          <span className="text-gray-400 mb-1">or click to browse your files</span>
          <div className="text-xs text-gray-400">Supports .xlsx and .xls files &bull; Max 10MB</div>
        </div>
        {uploadedFile && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-300 font-medium">
              ✓ {uploadedFile.name} uploaded successfully
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalysisSection = () => (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-xl shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-blue'}`}> 
          <h3 className="text-lg font-bold mb-3 text-blue-500">Detected Structure</h3>
          <div className="space-y-2 text-gray-400 text-sm">
            <div className="flex justify-between"><span>Headers:</span><span className="font-semibold text-gray-200 dark:text-gray-100">5 columns detected</span></div>
            <div className="flex justify-between"><span>Data Types:</span><span className="font-semibold text-gray-200 dark:text-gray-100">Mixed (Text, Numbers, Dates)</span></div>
            <div className="flex justify-between"><span>Rows:</span><span className="font-semibold text-gray-200 dark:text-gray-100">1,247 data points</span></div>
          </div>
        </div>
        <div className={`rounded-xl shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-blue'}`}> 
          <h3 className="text-lg font-bold mb-3 text-blue-500">Recommended Charts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" /><span className="text-gray-300">Bar Chart (Sales by Category)</span></div>
            <div className="flex items-center gap-2"><PieChart className="w-5 h-5 text-pink-400" /><span className="text-gray-300">Pie Chart (Market Share)</span></div>
            <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" /><span className="text-gray-300">Line Chart (Trends over Time)</span></div>
          </div>
        </div>
        <div className="col-span-2 text-center mt-6">
          <button onClick={handleVisualize} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg transition-all duration-200">Visualize Data</button>
        </div>
      </div>
    </div>
  );

  // Custom Pie label renderer to avoid overlap
  const renderPieLabel = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, outerRadius, percent, index } = props;
    const radius = outerRadius + 20;
    const xPos = cx + radius * Math.cos(-midAngle * RADIAN);
    const yPos = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={xPos} y={yPos} fill={COLORS[index % COLORS.length]} textAnchor={xPos > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={14} fontWeight="bold">
        {`${props.payload[xAxis]} ${((percent ?? 0) * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Dynamically determine keys for chart axes (now user-selectable)
  const getAxisKeys = () => {
    return { x: xAxis, y: yAxis };
  };

  const handleClearData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setParsedData([]);
    setUploadedFile(null);
    setCurrentStep(1);
    setXAxis('');
    setYAxis('');
    setMinValue('');
    setMaxValue('');
  };

  const renderChart = () => {
    const chartData = getFilteredData();
    if (!chartData || chartData.length === 0) return <div className="text-gray-400">No data to display.</div>;
    const { x, y } = getAxisKeys();
    switch (selectedChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey={x} stroke={isDarkMode ? '#cbd5e1' : '#334155'} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke={isDarkMode ? '#cbd5e1' : '#334155'} />
              <Tooltip contentStyle={{ background: isDarkMode ? '#1e293b' : '#f1f5f9', borderRadius: 8, border: 'none', color: isDarkMode ? '#fff' : '#334155', boxShadow: 'none' }} cursor={{ fill: 'transparent' }} />
              <Legend />
              <Bar dataKey={y} fill="url(#barGradient)" radius={[8, 8, 0, 0]} activeBar={{ fill: 'url(#barGradient)' }} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderPieLabel}
                outerRadius={80}
                fill="#38bdf8"
                dataKey={y}
                nameKey={x}
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: isDarkMode ? '#1e293b' : '#fff', borderRadius: 8, border: 'none', color: isDarkMode ? '#fff' : '#334155' }} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey={x} stroke={isDarkMode ? '#cbd5e1' : '#334155'} />
              <YAxis stroke={isDarkMode ? '#cbd5e1' : '#334155'} />
              <Tooltip contentStyle={{ background: isDarkMode ? '#1e293b' : '#fff', borderRadius: 8, border: 'none', color: isDarkMode ? '#fff' : '#334155' }} />
              <Legend />
              <Line type="monotone" dataKey={y} stroke="#38bdf8" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey={x} stroke={isDarkMode ? '#cbd5e1' : '#334155'} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke={isDarkMode ? '#cbd5e1' : '#334155'} />
              <Tooltip contentStyle={{ background: isDarkMode ? '#1e293b' : '#f1f5f9', borderRadius: 8, border: 'none', color: isDarkMode ? '#fff' : '#334155', boxShadow: 'none' }} />
              <Legend />
              <Area type="monotone" dataKey={y} stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey={x} stroke={isDarkMode ? '#cbd5e1' : '#334155'} type="category" interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis dataKey={y} stroke={isDarkMode ? '#cbd5e1' : '#334155'} type="number" />
              <Tooltip contentStyle={{ background: isDarkMode ? '#1e293b' : '#f1f5f9', borderRadius: 8, border: 'none', color: isDarkMode ? '#fff' : '#334155', boxShadow: 'none' }} />
              <Legend />
              <Scatter name={y} data={chartData} fill="#38bdf8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const renderVisualizationSection = () => (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-4xl mx-auto flex justify-end mb-4">
        <button onClick={handleClearData} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition-all duration-200 text-sm">Clear Data</button>
      </div>
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Panel */}
        <div className={`rounded-xl shadow p-6 flex flex-col gap-5 border-l-4 ${isDarkMode ? 'bg-gray-900 border-blue-700' : 'bg-white   border-blue-200'}`}> 
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-base font-bold tracking-wide ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Filters</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Chart Type</label>
              <select className={`w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-400 transition ${isDarkMode ? 'bg-blue-900 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-200'}`} aria-label="Chart type selector" value={selectedChartType} onChange={e => setSelectedChartType(e.target.value as 'bar' | 'pie' | 'line' | 'area' | 'scatter')}>
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="scatter">Scatter Chart</option>
              </select>
            </div>
            {/* X Axis Selector */}
            {parsedData.length > 0 && typeof parsedData[0] === 'object' && parsedData[0] !== null && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">X Axis</label>
                <select
                  className={`w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-400 transition ${isDarkMode ? 'bg-blue-900 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-200'}`}
                  value={xAxis}
                  onChange={e => setXAxis(e.target.value)}
                  title="X Axis Selector"
                >
                  {Object.keys(parsedData[0] as Record<string, any>).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Y Axis Selector */}
            {parsedData.length > 0 && typeof parsedData[0] === 'object' && parsedData[0] !== null && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Y Axis</label>
                <select
                  className={`w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-400 transition ${isDarkMode ? 'bg-blue-900 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-200'}`}
                  value={yAxis}
                  onChange={e => setYAxis(e.target.value)}
                  title="Y Axis Selector"
                >
                  {Object.keys(parsedData[0] as Record<string, any>).filter(key => key !== xAxis).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Value Range</label>
              <div className={`flex items-center gap-2 border rounded-md overflow-visible ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`} style={{height: 'auto', padding: '0.25rem 0.5rem'}}>
                <input type="number" placeholder="Min" className={`w-24 px-2 py-2 bg-transparent text-sm focus:outline-none ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`} style={{border: 'none', boxShadow: 'none'}} value={minValue} onChange={e => setMinValue(e.target.value)} />
                <span className={`text-gray-400 text-base`}>–</span>
                <input type="number" placeholder="Max" className={`w-24 px-2 py-2 bg-transparent text-sm focus:outline-none ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`} style={{border: 'none', boxShadow: 'none'}} value={maxValue} onChange={e => setMaxValue(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        {/* Charts Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className={`rounded-xl shadow-lg p-6 flex flex-col gap-4 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-blue-950' : 'bg-gradient-to-br from-white via-blue-50 to-blue-100'} transition-all duration-300`}> 
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Data Visualization</h3>
                <p className="text-gray-400 text-sm">Explore your data with interactive charts and filters.</p>
              </div>
              <button onClick={handleDownload} className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white px-5 py-2 rounded-xl font-semibold shadow transition-all duration-200 text-sm">
                <Download className="w-5 h-5" />
                <span>Download Report</span>
              </button>
            </div>
            <div className="w-full h-64 flex items-center justify-center" id="chart-area">
              {renderChart()}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleDownload} className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white px-5 py-2 rounded-xl font-semibold shadow transition-all duration-200 text-sm">
                <Download className="w-5 h-5" />
                <span>Download Chart (PNG)</span>
              </button>
              <CSVLink data={csvData} filename="chart-data.csv" className="flex items-center gap-2 bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl font-semibold shadow transition-all duration-200 text-sm">
                <Download className="w-5 h-5" />
                <span>Download Data (CSV)</span>
              </CSVLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col px-4 w-full pt-4">
      {Snackbar}
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded-lg transition-colors duration-200 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`} aria-label="Go back" title="Go back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{color: isDarkMode ? '#e0e7ef' : 'white'}}>Chart Builder Pro</h1>
            <p className="text-gray-400 text-sm">Transform your data into insights</p>
          </div>
        </div>
        {renderStepIndicator()}
      </div>
      {/* Content */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {isAnalyzing && renderLoadingOverlay()}
        {currentStep === 1 && renderUploadSection()}
        {currentStep === 2 && renderAnalysisSection()}
        {currentStep === 3 && renderVisualizationSection()}
      </div>
    </div>
  );
};

export default ChartBuilder; 