import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileSpreadsheet } from 'lucide-react';
import { analyzeExcelWithChat, getLatestChatByToolType, deleteChatById, getChatHistory } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserLimit } from '../../../lib/useUserLimit';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content?: string;
  metadata?: any;
  isLoading?: boolean;
}

interface AISheetSummarizerChatProps {
  onBack?: () => void;
}

// Helper to render AI summary/insights cleanly
function renderAISummary(text: string) {
  try {
    const json = JSON.parse(text);
    if (json.summary && Array.isArray(json.insights)) {
      return (
        <div>
          <h4 className="font-semibold text-white mb-2">Summary</h4>
          <p className="text-blue-200 text-sm mb-4">{json.summary}</p>
          <h4 className="font-semibold text-white mb-2">Key Insights</h4>
          <ul className="list-disc pl-5 space-y-1 text-blue-200 text-sm">
            {json.insights.map((insight: any, idx: number) => (
              <li key={idx}>{typeof insight === 'object' ? JSON.stringify(insight) : insight}</li>
            ))}
          </ul>
        </div>
      );
    }
  } catch {}
  return <div className="whitespace-pre-wrap">{text}</div>;
}

const AISheetSummarizerChat: React.FC<AISheetSummarizerChatProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();
  const { chatId: chatIdFromUrl } = useParams<{ chatId: string }>();
  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();

  useEffect(() => {
    const loadChat = async (id: number | null) => {
        setIsLoading(true);
        try {
            const { chat, messages } = id 
                ? await getChatHistory(id, 'sheet_summarizer')
                : await getLatestChatByToolType('sheet_summarizer');
            setChatId(chat.id);
            setMessages(messages.map((m: any) => ({ ...m, isLoading: false })));
            if (!id && chat.id) {
                
            }
        } catch (err: any) {
            if (err.response && err.response.status === 404) {
                // This is okay, it just means there's no chat history.
                setMessages([]);
                setChatId(null);
            } else {
                console.error("Failed to load chat", err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return;

    if (chatIdFromUrl) {
        loadChat(Number(chatIdFromUrl));
    } else {
        loadChat(null);
    }
  }, [user, chatIdFromUrl, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const confirmDeleteChat = async () => {
    if (chatId) {
        try {
            await deleteChatById(chatId);
            setChatId(null);
            setMessages([]);
            setUploadedFile(null);
            
        } catch (err) {
            console.error("Failed to delete chat", err);
        }
    }
    setShowDeleteModal(false);
  };

  const handleClearChat = () => {
    setShowDeleteModal(true);
  };

  const cancelDeleteChat = () => {
    setShowDeleteModal(false);
  };

  const handleSend = async () => {
    if (await checkLimit(messages.filter(m => m.sender === 'user').length) || limitReached) return;
    if (!input.trim() || !uploadedFile) return;

    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, sender: 'user', content: input }]);
    setInput('');
    setMessages(prev => [...prev, { id: (tempId + 1).toString(), sender: 'bot', content: '', isLoading: true }]);

    try {
      const { chat, messages: newMessages } = await analyzeExcelWithChat(chatId, uploadedFile, input);
      setChatId(chat.id);
      setMessages(newMessages.map((m: any) => ({ ...m, isLoading: false })));
      if (!chatId) {
        
      }
    } catch (err: any) {
      if (err?.response?.status === 429) handle429Error();
      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', content: 'Sorry, something went wrong.' }]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (await checkLimit(messages.filter(m => m.sender === 'user').length) || limitReached) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedFile(file);

    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, sender: 'user', content: `File: ${file.name}` }]);
    setMessages(prev => [...prev, { id: (tempId + 1).toString(), sender: 'bot', content: '', isLoading: true }]);
    
    try {
      const { chat, messages: newMessages } = await analyzeExcelWithChat(null, file, 'Summarize this file.');
      setChatId(chat.id);
      setMessages(newMessages.map((m: any) => ({ ...m, isLoading: false })));
      
    } catch (err: any) {
      if (err?.response?.status === 429) handle429Error();
      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', content: 'Failed to analyze file.' }]);
    } finally {
      setIsUploading(false);
    }
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
        <FileSpreadsheet className="w-7 h-7 text-blue-400" />
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">AI Sheet Summarizer</h2>
          <p className="text-xs text-blue-300">Intelligent Excel analysis</p>
        </div>
        <button
          onClick={handleClearChat}
          className="ml-auto p-2 rounded-lg border border-blue-900 text-blue-300 hover:text-red-500 hover:border-red-500 transition-colors"
          aria-label="Clear chat"
          title="Clear chat"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#23263a] rounded-xl shadow-xl p-8 flex flex-col items-center">
            <h2 className="text-xl font-bold text-white mb-4">Delete Chat?</h2>
            <p className="text-blue-200 mb-6">Are you sure you want to delete this chat? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={cancelDeleteChat} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white">Cancel</button>
              <button onClick={confirmDeleteChat} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#181c2a]">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
             <svg className="animate-spin h-10 w-10 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300">
            <FileSpreadsheet className="w-14 h-14 mb-2 text-blue-400" />
            <p className="text-lg">Welcome! Upload an Excel file to start chatting.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-5 py-4 rounded-2xl shadow text-base ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-[#23263a] text-blue-100 rounded-bl-md'}`}>
                    {msg.isLoading ? (
                        <div className="flex items-center justify-center w-12 h-6">
                            <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></div>
                            <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></div>
                        </div>
                    ) : msg.metadata?.fileName ? (
                         <div className="flex items-center gap-2 font-semibold">
                            <FileSpreadsheet className="w-5 h-5 text-green-400" />
                            {msg.metadata.fileName}
                         </div>
                    ) : (
                        renderAISummary(msg.content!)
                    )}
                </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="px-8 py-6 bg-[#23263a] flex items-center gap-3">
        <label htmlFor="excel-upload-input" className="sr-only">Upload Excel File</label>
        <input
          id="excel-upload-input"
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading || messages.some(m => m.isLoading)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg border border-blue-900 bg-[#181c2a] hover:bg-blue-950 transition-colors"
          title="Upload Excel File"
          disabled={isUploading || messages.some(m => m.isLoading)}
        >
          <Upload className="w-5 h-5 text-blue-400" />
        </button>
        <div className="flex-1">
            <label htmlFor="chat-input" className="sr-only">Chat input</label>
            <input
                id="chat-input"
                type="text"
                className="w-full px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={messages.length === 0 ? "Upload an Excel file to begin" : "Ask a follow-up question..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                disabled={isUploading || messages.length === 0 || messages.some(m => m.isLoading)}
            />
        </div>
        <button
          onClick={handleSend}
          className="ml-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          disabled={!input.trim() || isUploading || messages.length === 0 || messages.some(m => m.isLoading)}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AISheetSummarizerChat;