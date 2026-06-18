import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ChevronRight,
  Search,
  Clock,
  FileCheck,
  UploadCloud,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Document {
  id: number;
  fileName: string;
  status: 'READY' | 'PROCESSING' | 'FAILED' | 'pending';
  createdAt: string;
}

interface UploadingDoc {
  id: number;
  fileName: string;
  status: 'PROCESSING' | 'FAILED' | 'READY';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORKSPACE_ID = 2; // user's default workspace

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

function StatusBadge({ status }: { status: string }) {
  if (status === 'READY') {
    return (
      <span className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full text-xs font-medium border border-green-500/20">
        <FileCheck className="w-3.5 h-3.5" />
        READY
      </span>
    );
  }
  if (status === 'PROCESSING' || status === 'pending') {
    return (
      <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full text-xs font-medium border border-yellow-500/20 animate-pulse">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        PROCESSING
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full text-xs font-medium border border-red-500/20">
      <AlertTriangle className="w-3.5 h-3.5" />
      FAILED
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PDFDocumentPicker: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const navigate = useNavigate();

  // ── Fetch ready documents ────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/rag/documents/ready`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    return () => {
      // clear all poll intervals on unmount
      pollTimers.current.forEach(clearInterval);
    };
  }, [fetchDocuments]);

  // ── Polling ──────────────────────────────────────────────────────────────────
  const startPolling = useCallback(
    (docId: number, fileName: string) => {
      // avoid duplicate poll loops
      if (pollTimers.current.has(docId)) return;

      const timer = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/rag/documents/${docId}/status`, {
            headers: authHeader(),
          });
          if (!res.ok) return;
          const { status } = await res.json();

          if (status === 'READY') {
            clearInterval(timer);
            pollTimers.current.delete(docId);

            // Move from uploading → ready list
            setUploadingDocs((prev) => prev.filter((d) => d.id !== docId));
            await fetchDocuments();
          } else if (status === 'FAILED') {
            clearInterval(timer);
            pollTimers.current.delete(docId);

            setUploadingDocs((prev) =>
              prev.map((d) => (d.id === docId ? { ...d, status: 'FAILED' } : d))
            );
          } else {
            // still processing — update badge
            setUploadingDocs((prev) =>
              prev.map((d) => (d.id === docId ? { ...d, status: 'PROCESSING' } : d))
            );
          }
        } catch (err) {
          console.error(`Poll error for doc ${docId}:`, err);
        }
      }, 3000);

      pollTimers.current.set(docId, timer);
    },
    [fetchDocuments]
  );

  // ── Upload ───────────────────────────────────────────────────────────────────
  const uploadFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setUploadError('Only PDF files are accepted.');
        return;
      }

      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(
          `${API_BASE}/rag/workspaces/${WORKSPACE_ID}/documents`,
          {
            method: 'POST',
            headers: authHeader(),
            body: formData,
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed (${res.status})`);
        }

        const { documentId, status } = await res.json();

        // If already exists and is READY, just refresh list
        if (status === 'READY') {
          await fetchDocuments();
          return;
        }

        // Otherwise show it as PROCESSING and start polling
        const newDoc: UploadingDoc = {
          id: documentId,
          fileName: file.name,
          status: 'PROCESSING',
        };
        setUploadingDocs((prev) => [newDoc, ...prev]);
        startPolling(documentId, file.name);
      } catch (err: any) {
        setUploadError(err.message || 'Upload failed. Please try again.');
      }
    },
    [fetchDocuments, startPolling]
  );

  // ── Drag & drop handlers ─────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await uploadFile(file);
  };
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  // ── Derived state ─────────────────────────────────────────────────────────────
  const filteredDocs = documents.filter((doc) =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-11/12 max-w-6xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-6 border-b border-blue-900 bg-[#23263a]">
        <button
          onClick={() => navigate('/premium/pdfhub')}
          className="p-2 rounded-lg bg-[#181c2a] hover:bg-blue-900 border border-blue-900 mr-2 transition-colors"
          aria-label="Go back"
        >
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-400"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <FileText className="w-7 h-7 text-blue-400" />
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">PDF Chat Agent</h2>
          <p className="text-sm text-blue-300">
            Upload a PDF or select a processed document to start chatting.
          </p>
        </div>
      </div>

      <div className="p-8 flex flex-col gap-8 overflow-y-auto">
        {/* ── Upload Zone ─────────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
            Upload New PDF
          </h3>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-8 py-10 cursor-pointer transition-all select-none
              ${isDragging
                ? 'border-blue-400 bg-blue-900/20 scale-[1.01]'
                : 'border-blue-800 hover:border-blue-500 bg-[#23263a] hover:bg-[#1e2235]'
              }`}
          >
            <UploadCloud
              className={`w-10 h-10 transition-colors ${isDragging ? 'text-blue-300' : 'text-blue-600'}`}
            />
            <p className="text-blue-200 font-medium">
              Drag &amp; drop a PDF here, or{' '}
              <span className="text-blue-400 underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-blue-500">PDF files only · max 50 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
          {uploadError && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {uploadError}
            </p>
          )}
        </div>

        {/* ── Processing Cards ─────────────────────────────────────────────────── */}
        {uploadingDocs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
              Processing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`bg-[#23263a] border rounded-xl p-5 flex flex-col gap-3 transition-all
                    ${doc.status === 'FAILED' ? 'border-red-700/50' : 'border-yellow-700/30'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                  <h3
                    className="font-semibold text-blue-100 text-base line-clamp-2"
                    title={doc.fileName}
                  >
                    {doc.fileName}
                  </h3>
                  {doc.status === 'PROCESSING' && (
                    <p className="text-xs text-yellow-400">
                      Extracting &amp; embedding document…
                    </p>
                  )}
                  {doc.status === 'FAILED' && (
                    <p className="text-xs text-red-400">
                      Ingestion failed. Please try uploading again.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────────────────────── */}
        <div className="border-t border-blue-900/50" />

        {/* ── Ready Documents ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-widest">
              Ready Documents
            </h3>
          </div>

          {/* Search */}
          <div className="mb-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-blue-900 rounded-xl leading-5 bg-[#23263a] text-blue-100 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="Search documents by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-blue-300">Loading your documents…</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-[#23263a] rounded-xl border border-blue-900/50">
              <FileText className="w-16 h-16 text-blue-800 mb-4" />
              <h3 className="text-xl font-medium text-blue-200 mb-2">
                No documents found
              </h3>
              <p className="text-blue-400 text-center max-w-md">
                {searchQuery
                  ? 'No documents match your search query.'
                  : 'Upload a PDF above to get started. It will appear here once processed.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc) => {
                const isReady = doc.status === 'READY';
                return (
                  <div
                    key={doc.id}
                    onClick={() =>
                      isReady && navigate(`/premium/pdfhub/chatagent/${doc.id}`)
                    }
                    title={isReady ? undefined : 'Document is not yet ready'}
                    className={`bg-[#23263a] border border-blue-900/50 rounded-xl p-5 flex flex-col transition-all group
                      ${isReady
                        ? 'hover:border-blue-500 cursor-pointer hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:-translate-y-1'
                        : 'opacity-60 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400 group-hover:text-blue-300 group-hover:bg-blue-800/40 transition-colors">
                        <FileText className="w-8 h-8" />
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    <h3
                      className="font-semibold text-blue-100 text-lg mb-2 line-clamp-2"
                      title={doc.fileName}
                    >
                      {doc.fileName}
                    </h3>

                    <div className="mt-auto pt-4 flex items-center justify-between text-sm text-blue-400 border-t border-blue-900/30">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      {isReady && (
                        <ChevronRight className="w-5 h-5 text-blue-600 group-hover:text-blue-400 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFDocumentPicker;
