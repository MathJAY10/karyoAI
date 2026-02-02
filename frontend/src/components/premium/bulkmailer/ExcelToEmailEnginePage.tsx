import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate} from "react-router-dom";
import { Upload, Send, FileText, UserCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface ExcelToEmailEnginePageProps {
  chatId?: string;
}

type ChatMessage = {
  id?: number;
  sender: "user" | "bot";
  content: string;
  createdAt?: string;
};

const ExcelToEmailEnginePage: React.FC<ExcelToEmailEnginePageProps> = () => {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [promptError, setPromptError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const allowed = [".xlsx", ".xls"]; 
    const lower = file.name.toLowerCase();
    const isAllowed = allowed.some(ext => lower.endsWith(ext));
    if (!isAllowed) {
      setFileError("Only Excel files (.xlsx, .xls) are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File too large. Max 10MB");
      e.target.value = "";
      return;
    }
    setFileError("");
    setSelectedFile(file);
  }, []);

  const headers = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      Authorization: token ? `Bearer ${token}` : "",
    } as Record<string, string>;
  }, []);

  // Load existing chat if present
  useEffect(() => {
    const storedId = localStorage.getItem('excelToEmail_chatId');
    const base = `${API_BASE}bulkmailer/excel-engine`;
    const url = storedId ? `${base}/chat/${storedId}` : `${base}/latest`;
    fetch(url, {
      method: 'GET',
      headers,
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (!data || !data.chat_id) return;
        setChatId(Number(data.chat_id));
        localStorage.setItem('excelToEmail_chatId', String(data.chat_id));
        setMessages((data.messages || []).map((m: any, idx: number) => ({ id: m.id || idx, sender: m.sender, content: m.content, createdAt: m.created_at })));
      })
      .catch(() => {
        setChatId(null);
        setMessages([]);
        localStorage.removeItem('excelToEmail_chatId');
      });
  }, [headers]);

  const handleClearHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/bulkmailer/excel-engine/chats`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to clear history");
      setMessages([]);
      setChatId(null);
      setSelectedFile(null);
      setPrompt("");
      localStorage.removeItem('excelToEmail_chatId');
    } catch (e: any) {
      // silent fail - optional inline message could be added
    }
  }, [headers]);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      setFileError("Please select an Excel file");
      return;
    }
    if (!prompt.trim()) {
      setPromptError("Please enter a prompt");
      return;
    }
    setPromptError("");

    setIsLoading(true);
    // Add ChatGPT-like immediate UI feedback
    const tempUserId = Date.now();
    const tempBotId = tempUserId + 1;
    setMessages(prev => [
      ...prev,
      { id: tempUserId, sender: 'user', content: prompt },
      { id: tempBotId, sender: 'bot', content: 'Crafting your mail...', isLoading: true }
    ]);
    // Clear controls so the input and file chip disappear during processing
    setPrompt("");
    setSelectedFile(null);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("prompt", prompt);
      if (chatId) form.append("chatId", String(chatId));

      const res = await fetch(`${API_BASE}/bulkmailer/excel-engine/upload-and-generate`, {
        method: "POST",
        headers,
        body: form as any,
      } as RequestInit);

      if (res.status === 429) {
        const data = await res.json();
        // Replace loading message with limit message
        setMessages(prev => prev.filter(m => !(m as any).isLoading).concat({ sender: 'bot', content: data?.message || 'Message limit exceeded.' } as any));
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const data = await res.json();
      setChatId(data.chat_id);
      localStorage.setItem('excelToEmail_chatId', String(data.chat_id));
                 // Replace the loading message with the real bot response
     setMessages(prev => {
       const withoutLoading = prev.filter(m => !(m as any).isLoading);
       // Only get the latest bot message (the new response)
       const allBotMessages = (data.messages || []).filter((m: any) => m.sender === 'bot');
       const latestBotMessage = allBotMessages[allBotMessages.length - 1];
       return [
         ...withoutLoading,
         latestBotMessage
       ];
     });
    } catch (e: any) {
      // Replace loading message with error
      setMessages(prev => prev.filter(m => !(m as any).isLoading).concat({ sender: 'bot', content: 'Sorry, something went wrong.' } as any));
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, prompt, chatId, headers]);

  // Build UI similar to PDF Chat Agent
  const userInitial = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.username ? user.username[0].toUpperCase() : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex flex-col w-11/12 max-w-6xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[80vh]" style={{ minHeight: '80vh', height: '80vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-6 border-b border-blue-900 bg-[#23263a]">
        <button
          onClick={() => navigate('/premium/bulkmailer')}
          className="p-2 rounded-lg bg-[#181c2a] hover:bg-blue-900 border border-blue-900 mr-2"
          aria-label="Go back"
          title="Go back"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <FileText className="w-7 h-7 text-blue-400" />
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">Excel-to-Email Engine</h2>
          <p className="text-xs text-blue-300">Generate professional emails from Excel data</p>
        </div>
        <button onClick={handleClearHistory} className="ml-auto p-2 rounded-lg border border-blue-900 text-blue-300 hover:text-red-500 hover:border-red-500 transition-colors" aria-label="Clear chat" title="Clear chat" type="button">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#181c2a]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300">
            <FileText className="w-14 h-14 mb-2 text-blue-400" />
            <p className="text-lg">Upload an Excel file and enter a prompt to begin.</p>
          </div>
        ) : (
          <>
            {messages.map((m, idx) => (
              <div key={m.id || idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} items-end`}>
                {m.sender === 'bot' && (
                  <div className="flex-shrink-0 mr-2">
                    <FileText className="w-8 h-8 text-blue-400 bg-white rounded-full p-1 border border-blue-300" />
                  </div>
                )}
                <div className={`max-w-[80%] px-5 py-4 rounded-2xl shadow text-base ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-[#23263a] text-blue-100 rounded-bl-md'}`}>
                  { (m as any).isLoading ? (
                    <div className="flex items-center gap-2">
                      <span>Crafting your mail...</span>
                      <span className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></span>
                        <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></span>
                      </span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
                {m.sender === 'user' && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center border border-blue-400" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)' }}>
                      {userInitial ? (
                        <span className="text-white font-bold text-lg">{userInitial}</span>
                      ) : (
                        <UserCircle className="w-6 h-6 text-blue-200" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
      {/* Input Area */}
      <div className="px-8 py-6 bg-[#23263a] flex items-center gap-3 relative">
        {isLoading ? (
          <div className="w-full px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              Crafting your mail...
              <span className="flex items-center ml-2">
                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></span>
                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></span>
              </span>
            </span>
          </div>
        ) : (
          <>
        <label htmlFor="excel-upload-input" className="sr-only">Upload Excel File</label>
        <input
          id="excel-upload-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
          disabled={isLoading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg border border-blue-900 bg-[#181c2a] hover:bg-blue-950 transition-colors flex-shrink-0"
          title="Upload Excel File"
          disabled={isLoading}
          type="button"
        >
          <Upload className="w-5 h-5 text-blue-400" />
        </button>
        {selectedFile && (
          <span className="flex items-center bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-xs font-medium mr-2 max-w-[240px] truncate">
            <FileText className="w-4 h-4 mr-1 text-blue-300" />
            <span className="truncate" title={selectedFile.name}>{selectedFile.name}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="ml-2 text-blue-300 hover:text-red-400 focus:outline-none"
              aria-label="Remove file"
              title="Remove file"
              type="button"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
            </button>
          </span>
        )}
        {fileError && (
          <span className="text-xs text-red-400 mr-2">{fileError}</span>
        )}
        <label htmlFor="chat-input" className="sr-only">Prompt</label>
        <input
          id="chat-input"
          type="text"
          className="w-full px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder={selectedFile ? "Describe the email you want to generate..." : "Upload an Excel file to begin"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          disabled={isLoading || !selectedFile}
          style={{ minWidth: 0 }}
        />
        {promptError && (
          <span className="text-xs text-red-400 ml-2">{promptError}</span>
        )}
        <button
          onClick={handleSubmit}
          className="ml-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          disabled={isLoading || !prompt.trim() || !selectedFile}
          title="Generate email"
          type="button"
        >
          <Send className="w-5 h-5" />
        </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExcelToEmailEnginePage;


