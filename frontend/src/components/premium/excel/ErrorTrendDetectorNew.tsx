import React, { useState, useEffect } from 'react';
import { Upload, Brain, ArrowLeft, FileText, AlertCircle, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { useUserLimit } from '../../../lib/useUserLimit';

interface AnalysisResult {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  insight: string;
  errors: string[];
  trends: string[];
  createdAt: string;
}

const ErrorTrendDetectorNew: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId: string }>();
  const { isAuthenticated, loading } = useAuth();
  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();

  // API functions
  const analyzeFile = async (file: File): Promise<AnalysisResult> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/error-trend/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return response.data;
  };

  const getAnalysisById = async (id: string): Promise<AnalysisResult> => {
    const response = await api.get(`/error-trend/analysis/${id}`);
    return response.data;
  };

  const getLatestAnalysis = async (): Promise<AnalysisResult> => {
    const response = await api.get('/error-trend/latest');
    return response.data;
  };

  const deleteAnalysis = async (id: number): Promise<void> => {
    await api.delete(`/error-trend/analysis/${id}`);
  };

  // Load analysis on component mount
  useEffect(() => {
    if (loading || !isAuthenticated) return;

    const loadAnalysis = async () => {
      try {
        setIsAnalyzing(true);
        setError(null);

        if (analysisId) {
          // Load specific analysis
          const data = await getAnalysisById(analysisId);
          setResult(data);
        } else {
          // Try to load latest analysis
          try {
  const data = await getLatestAnalysis();
  setResult(data);
  navigate(`/premium/excel/detect/${data.id}`, { replace: true });
} catch (err: any) {
  if (err.response?.status === 404) {
    // No previous analysis found, do not set error, just show upload UI
    setResult(null);
  } else {
    setError(err.response?.data?.error || 'Failed to load latest analysis');
  }
}
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('Please log in to view analysis');
          navigate('/login');
          return;
        }
        setError(err.response?.data?.error || 'Failed to load analysis');
      } finally {
        setIsAnalyzing(false);
      }
    };

    loadAnalysis();
  }, [analysisId, isAuthenticated, loading, navigate]);

  // Handle file upload and analysis
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (await checkLimit(result ? 1 : 0) || limitReached) return;
    if (!isAuthenticated) {
      setError('Please log in to analyze files');
      navigate('/login');
      return;
    }

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      setError('Only Excel files (.xlsx, .xls) are allowed');
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    try {
      const analysisResult = await analyzeFile(selectedFile);
      setResult(analysisResult);
      navigate(`/premium/excel/detect/${analysisResult.id}`, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 429) handle429Error();
      if (err.response?.status === 401) {
        setError('Please log in to analyze files');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to analyze file');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle reset/analyze another file
  const handleAnalyzeAnother = async () => {
    if (!isAuthenticated) {
      setError('Please log in to analyze files');
      navigate('/login');
      return;
    }

    setIsResetting(true);
    
    try {
      if (result?.id) {
        await deleteAnalysis(result.id);
      }
    } catch (err: any) {
      console.error('Failed to delete previous analysis:', err);
    }

    setTimeout(() => {
      setResult(null);
      setFile(null);
      setError(null);
      navigate('/premium/excel/detect', { replace: true });
      setIsResetting(false);
    }, 500);
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-8">
        <div className="flex flex-col items-center justify-center">
          <svg className="animate-spin h-12 w-12 text-blue-400 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <h2 className="text-2xl font-bold mb-2 text-blue-300">Loading...</h2>
        </div>
      </div>
    );
  }

  // Authentication required
  if (!isAuthenticated) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-8">
        <div className="w-full max-w-xl mx-auto text-center">
          <Card className="bg-[#23263a] border-blue-900 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Authentication Required</CardTitle>
              <CardDescription className="text-blue-200">
                Please log in to access the Error & Trend Detector.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Go to Login
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start py-8">
      {Snackbar}
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center gap-4 mb-8 px-4">
        <button
          onClick={() => navigate('/premium/excel')}
          className="p-2 rounded-lg bg-[#23263a] hover:bg-blue-900 transition-colors duration-200 border border-blue-900"
          aria-label="Go back"
          title="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-blue-400" />
        </button>
        <div className="bg-orange-500 rounded-xl p-2 flex items-center justify-center">
          <Brain className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Error & Trend Detector
          </h1>
          <p className="text-blue-300 text-sm md:text-base">
            Identify data issues and discover patterns
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full flex flex-col items-center justify-center">
        <Card className="w-full max-w-xl mx-auto bg-[#23263a] border-blue-900 shadow-xl">
          <CardHeader className="flex flex-col items-center">
            <div className="bg-orange-500 rounded-xl p-3 mb-4 flex items-center justify-center">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-white text-center">
              Upload Excel File for Analysis
            </CardTitle>
            <CardDescription className="text-blue-200 text-center mt-2">
              Our AI will scan your data for errors, inconsistencies, and trends
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Show current analysis info */}
            {result && !isAnalyzing && (
              <div className="mb-4 p-3 bg-blue-950 border border-blue-800 rounded-lg w-full text-center">
                <p className="text-blue-200 font-medium flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Showing results for: <strong>{result.fileName}</strong>
                </p>
              </div>
            )}

            {/* File Upload Area */}
            {!result && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center">
                <label 
                  htmlFor="excel-upload" 
                  className="w-full flex flex-col items-center justify-center border-2 border-dashed border-blue-900 rounded-xl p-8 cursor-pointer hover:border-blue-400 transition-all duration-200 bg-[#181c2a]"
                >
                  <Upload className="w-10 h-10 mb-2 text-blue-400" />
                  <span className="text-base font-semibold mb-1 text-blue-100">
                    Drop your Excel file here
                  </span>
                  <span className="text-blue-300 mb-1">or click to browse your files</span>
                  <div className="text-xs text-blue-300">
                    Supports .xlsx and .xls files • Max 10MB
                  </div>
                  <input 
                    id="excel-upload" 
                    type="file" 
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    disabled={limitReached || isAnalyzing}
                  />
                </label>
                
                {file && (
                  <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg w-full text-center">
                    <p className="text-blue-200 font-medium">✓ {file.name} selected</p>
                  </div>
                )}
                
                {error && (
                  <div className="mt-2 p-3 bg-red-950 border border-red-800 rounded-lg w-full text-center">
                    <p className="text-red-200 text-sm flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-8">
                <svg className="animate-spin h-12 w-12 text-blue-400 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <h2 className="text-2xl font-bold mb-2 text-blue-300">Analyzing your data…</h2>
                <p className="text-blue-200 text-center max-w-xs">
                  Our AI is processing your spreadsheet and generating intelligent insights.
                </p>
              </div>
            )}

            {/* Results Display */}
            {result && !isAnalyzing && (
              <div className="flex flex-col gap-6">
                {/* AI Insight */}
                <div className="rounded-xl shadow p-6 bg-[#181c2a] border-l-4 border-blue-700">
                  <h3 className="text-lg font-bold text-blue-300 mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    AI Insight
                  </h3>
                  <p className="text-blue-200 text-sm whitespace-pre-line">
                    {result.insight}
                  </p>
                </div>

                {/* Errors */}
                <div className="rounded-xl shadow p-6 bg-[#181c2a] border-l-4 border-red-700">
                  <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    Detected Errors
                  </h3>
                  {result.errors.length > 0 ? (
                    <ul className="list-disc pl-6 space-y-1">
                      {result.errors.map((err, idx) => (
                        <li key={idx} className="text-red-200 text-sm">
                          {err}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-200 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      No major errors detected.
                    </p>
                  )}
                </div>

                {/* Trends */}
                <div className="rounded-xl shadow p-6 bg-[#181c2a] border-l-4 border-green-700">
                  <h3 className="text-lg font-bold text-green-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Trends
                  </h3>
                  {result.trends.length > 0 ? (
                    <ul className="list-disc pl-6 space-y-1">
                      {result.trends.map((trend, idx) => (
                        <li key={idx} className="text-green-200 text-sm">
                          {trend}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-green-200 text-sm">
                      No significant trends found.
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <button 
                  className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center w-full" 
                  onClick={handleAnalyzeAnother}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V8z"></path>
                    </svg>
                  ) : (
                    'Analyze Another File'
                  )}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorTrendDetectorNew; 