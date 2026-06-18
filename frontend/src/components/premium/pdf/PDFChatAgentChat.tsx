import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, UserCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { useUserLimit } from '@/lib/useUserLimit';

interface ChatMessage {
  id?: string | number;
  sender: 'user' | 'bot';
  content?: string;
  isLoading?: boolean;
  created_at?: string;
}

interface PDFChatAgentChatProps {
  documentId: number;
  onBack?: () => void;
}

const PDF_CHAT_AGENT_API = `${API_BASE}/pdf/chatagent/chat`;

const PDFChatAgentChat: React.FC<PDFChatAgentChatProps> = ({ documentId, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userInitial = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.username ? user.username[0].toUpperCase() : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem(`pdfChat_sessionId_${documentId}`);
    if (storedSessionId) {
      fetch(`${PDF_CHAT_AGENT_API}/${storedSessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          // Backend might return session under different keys depending on what was implemented
          setSessionId(Number(data.sessionId || data.chat_id || data.id));
          if (data.messages) {
            setMessages(data.messages.map((m: any, idx: number) => ({
              id: m.id || idx,
              sender: m.sender,
              content: m.content,
              created_at: m.created_at
            })));
          }
        })
        .catch(() => {
          setMessages([]);
          setSessionId(null);
          localStorage.removeItem(`pdfChat_sessionId_${documentId}`);
        });
    }
  }, [documentId]);

  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();

  const handleSend = async () => {
    if (await checkLimit(messages.filter(m => m.sender === 'user').length) || limitReached) return;
    if (!input.trim()) return;

    const tempId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        sender: 'user',
        content: input,
        created_at: new Date().toISOString(),
      },
      { id: (tempId + 1).toString(), sender: 'bot', content: '', isLoading: true }
    ]);
    setInput('');

    try {
      const response = await fetch(PDF_CHAT_AGENT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          documentId,
          question: input,
          sessionId: sessionId || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to chat with PDF');
      
      const data = await response.json();
      const returnedSessionId = data.sessionId || data.chat_id;
      if (returnedSessionId) {
        setSessionId(returnedSessionId);
        localStorage.setItem(`pdfChat_sessionId_${documentId}`, returnedSessionId.toString());
      }

      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        {
          id: Date.now(),
          sender: 'bot',
          content: data.answer
        }
      ]);
    } catch (err: any) {
      if (err?.response?.status === 429) handle429Error();
      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', content: 'Sorry, something went wrong.' }]);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSessionId(null);
    setInput('');
    localStorage.removeItem(`pdfChat_sessionId_${documentId}`);
  };

  return (
    <div className="flex flex-col w-11/12 max-w-6xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[80vh]" style={{ minHeight: '80vh', height: '80vh' }}>
      {Snackbar}
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-6 border-b border-blue-900 bg-[#23263a]">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-[#181c2a] hover:bg-blue-900 border border-blue-900 mr-2 transition-colors"
          aria-label="Go back"
          title="Go back"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <FileText className="w-7 h-7 text-blue-400" />
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">PDF Chat Agent</h2>
          <p className="text-xs text-blue-300">Chatting with document #{documentId}</p>
        </div>
        <button onClick={handleClearChat} className="ml-auto p-2 rounded-lg border border-blue-900 text-blue-300 hover:text-red-500 hover:border-red-500 transition-colors" aria-label="Clear chat" title="Clear chat">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#181c2a]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300">
            <FileText className="w-14 h-14 mb-2 text-blue-400" />
            <p className="text-lg">Ask a question about this document to start chatting.</p>
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
                    <div className="whitespace-pre-wrap">{msg.content}</div>
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
        <div className="flex-1 flex items-center gap-2">
          <label htmlFor="chat-input" className="sr-only">Chat input</label>
          <input
            id="chat-input"
            type="text"
            className="w-full px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ask a question about your PDF..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            disabled={messages.some(m => m.isLoading)}
            style={{ minWidth: 0 }}
          />
        </div>
        <button
          onClick={handleSend}
          className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          disabled={!input.trim() || messages.some(m => m.isLoading)}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PDFChatAgentChat;