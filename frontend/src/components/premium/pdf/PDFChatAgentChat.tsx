import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, UserCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { useUserLimit } from '@/lib/useUserLimit';

interface ChatMessage {
  
  id?: string | number;
  sender: 'user' | 'bot';
  content?: string;
  isLoading?: boolean;
  created_at?: string;
  pdfNames?: string[]; // NEW: for user messages
}

interface PDFChatAgentChatProps {
  onBack?: () => void;
}

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_CHAT_AGENT_API = `${API_BASE}/pdf/chatagent/chat`;
const PDF_CHAT_AGENT_HISTORY_API = `${API_BASE}/pdf/chatagent/chat`; // GET /chat/:chat_id

const PDFChatAgentChat: React.FC<PDFChatAgentChatProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Get user initial for avatar
  const userInitial = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.username ? user.username[0].toUpperCase() : null;
    } catch {
      return null;
    }
  })();

  // Add a local mapping of message id to pdfNames

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const storedChatId = localStorage.getItem('pdfChatAgent_chatId');
    if (storedChatId) {
      fetch(`${PDF_CHAT_AGENT_HISTORY_API}/${storedChatId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          setChatId(Number(data.chat_id));
          setMessages(data.messages.map((m: any, idx: number) => ({
            id: m.id || idx,
            sender: m.sender,
            content: m.content,
            created_at: m.created_at,
            pdfNames: m.pdfNames // If backend returns it
          })));
        })
        .catch(() => {
          setMessages([]);
          setChatId(null);
          localStorage.removeItem('pdfChatAgent_chatId');
        });
    }
  }, []);

  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();

  // When uploading a PDF, only update uploadedFiles (do NOT add a message)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (await checkLimit(messages.filter(m => m.sender === 'user').length) || limitReached) return;
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type === 'application/pdf' && f.size <= MAX_PDF_SIZE);
    if (validFiles.length !== files.length) {
      alert('Only PDF files (max 10MB each) are allowed.');
      return;
    }
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  // When sending a prompt, include the files as part of the user message, then clear uploadedFiles
  const handleSend = async () => {
    if (await checkLimit(messages.filter(m => m.sender === 'user').length) || limitReached) return;
    if (!input.trim() || uploadedFiles.length === 0) return;
    const tempId = Date.now().toString();
    const pdfNames = uploadedFiles.map(f => f.name);
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        sender: 'user',
        content: input,
        pdfNames,
        created_at: new Date().toISOString(),
      },
      { id: (tempId + 1).toString(), sender: 'bot', content: '', isLoading: true }
    ]);
    setInput('');
    try {
      const formData = new FormData();
      if (chatId) formData.append('chatId', String(chatId));
      uploadedFiles.forEach(file => formData.append('files', file));
      formData.append('question', input);
      const response = await fetch(PDF_CHAT_AGENT_API, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to chat with PDF');
      const data = await response.json();
      setChatId(data.chat_id);
      localStorage.setItem('pdfChatAgent_chatId', data.chat_id);
      // Append new messages to chat history
      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        ...data.messages
          .filter((m: any) => m.sender === 'bot')
          .map((m: any, idx: number) => ({
            id: m.id || idx,
            sender: m.sender,
            content: m.content,
            created_at: m.created_at,
            pdfNames: m.pdfNames // If backend returns it
          }))
      ]);
      setUploadedFiles([]); // Clear files after sending
    } catch (err: any) {
      if (err?.response?.status === 429) handle429Error();
      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', content: 'Sorry, something went wrong.' }]);
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const handleClearChat = () => {
    setMessages([]);
    setUploadedFiles([]);
    setChatId(null);
    setInput('');
    localStorage.removeItem('pdfChatAgent_chatId');
  };

  return (
    <div className="flex flex-col w-11/12 max-w-6xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[80vh]" style={{ minHeight: '80vh', height: '80vh' }}>
      {Snackbar}
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-6 border-b border-blue-900 bg-[#23263a]">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-[#181c2a] hover:bg-blue-900 border border-blue-900 mr-2"
          aria-label="Go back"
          title="Go back"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <FileText className="w-7 h-7 text-blue-400" />
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">PDF Chat Agent</h2>
          <p className="text-xs text-blue-300">Chat with your PDF documents</p>
        </div>
        {uploadedFiles.length > 0 && (
          <button onClick={handleClearChat} className="ml-auto p-2 rounded-lg border border-blue-900 text-blue-300 hover:text-red-500 hover:border-red-500 transition-colors" aria-label="Clear chat" title="Clear chat">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        )}
      </div>
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#181c2a]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300">
            <FileText className="w-14 h-14 mb-2 text-blue-400" />
            <p className="text-lg">Upload a PDF file to start chatting.</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end`}>
                {msg.sender === 'bot' && (
                  <div className="flex-shrink-0 mr-2">
                    <FileText className="w-8 h-8 text-blue-400 bg-white rounded-full p-1 border border-blue-300" />
                  </div>
                )}
                <div className={`max-w-[80%] px-5 py-4 rounded-2xl shadow text-base ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-[#23263a] text-blue-100 rounded-bl-md'}`}
                  style={{ position: 'relative' }}>
                  {msg.isLoading ? (
                    <div className="flex items-center justify-center w-12 h-6">
                      <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></div>
                      <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {/* Show PDF chip for user message if present */}
                      {msg.sender === 'user' && msg.pdfNames && msg.pdfNames.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.pdfNames.map((pdfName, index) => (
                            <span key={index} className="inline-flex items-center bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">
                              <FileText className="w-4 h-4 mr-1 text-blue-300" />
                              {pdfName}
                              <button
                                onClick={() => handleRemoveFile(pdfName)}
                                className="ml-1 text-blue-300 hover:text-red-400 focus:outline-none"
                                aria-label="Remove PDF"
                                title="Remove PDF"
                                type="button"
                              >
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {msg.sender === 'user' && (
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
        <div ref={chatEndRef} />
      </div>
      {/* Chat Input */}
      <div className="px-8 py-6 bg-[#23263a] flex items-center gap-3 relative">
        <label htmlFor="pdf-upload-input" className="sr-only">Upload PDF File</label>
        <input
          id="pdf-upload-input"
          type="file"
          accept="application/pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          disabled={isUploading || messages.some(m => m.isLoading)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg border border-blue-900 bg-[#181c2a] hover:bg-blue-950 transition-colors flex-shrink-0"
          title="Upload PDF File"
          disabled={isUploading || messages.some(m => m.isLoading)}
        >
          <Upload className="w-5 h-5 text-blue-400" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {uploadedFiles.map(file => (
            <span key={file.name} className="flex items-center bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-xs font-medium mr-2 max-w-[180px] truncate">
              <FileText className="w-4 h-4 mr-1 text-blue-300" />
              <span className="truncate" title={file.name}>{file.name}</span>
              <button
                onClick={() => handleRemoveFile(file.name)}
                className="ml-2 text-blue-300 hover:text-red-400 focus:outline-none"
                aria-label="Remove PDF"
                title="Remove PDF"
                type="button"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
              </button>
            </span>
          ))}
          <label htmlFor="chat-input" className="sr-only">Chat input</label>
          <input
            id="chat-input"
            type="text"
            className="w-full px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={messages.length === 0 ? "Upload a PDF file to begin" : "Ask a question about your PDF..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            disabled={isUploading || uploadedFiles.length === 0 || messages.some(m => m.isLoading)}
            style={{ minWidth: 0 }}
          />
        </div>
        <button
          onClick={handleSend}
          className="ml-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          disabled={!input.trim() || isUploading || uploadedFiles.length === 0 || messages.some(m => m.isLoading)}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
        {/* Clear chat button */}
        <button
          onClick={handleClearChat}
          className="ml-2 p-2 rounded-lg border border-blue-900 text-blue-300 hover:text-red-500 hover:border-red-500 transition-colors"
          aria-label="Clear chat"
          title="Clear chat"
          type="button"
          disabled={messages.length === 0 && uploadedFiles.length === 0}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    </div>
  );
};

export default PDFChatAgentChat; 