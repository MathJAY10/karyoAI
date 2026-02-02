import React, { useCallback, useEffect, useMemo,  useState, useRef } from "react";
import { useNavigate} from "react-router-dom";
import { Send, FileText, UserCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface MailmergeAIprops {
  chatId?: string;
}

type ChatMessage = {
  id?: number;
  sender: "user" | "bot";
  content: string;
  createdAt?: string;
  isLoading?: boolean;
};


const LOCAL_STORAGE_KEY = 'mailmergeai_chatId';

const MailMergeAI: React.FC<MailmergeAIprops> = () => {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [promptError, setPromptError] = useState<string>("");
  const chatRef = useRef<HTMLDivElement | null>(null);

 
  const headers = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      Authorization: token ? `Bearer ${token}` : "",
    } as Record<string, string>;
  }, []);

  // Load existing chat if present
  useEffect(() => {
    const storedId = localStorage.getItem(LOCAL_STORAGE_KEY);
    const base = `${API_BASE}/bulkmailer/mailmerge`;
    const url = storedId ? `${base}/chat/${storedId}` : `${base}/latest`;
    fetch(url, {
      method: 'GET',
      headers,
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (!data || !data.chat_id) return;
        setChatId(Number(data.chat_id));
        localStorage.setItem(LOCAL_STORAGE_KEY, String(data.chat_id));
        setMessages((data.messages || []).map((m: any, idx: number) => ({ id: m.id || idx, sender: m.sender, content: m.content, createdAt: m.created_at })));
      })
      .catch(() => {
        setChatId(null);
        setMessages([]);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      });
  }, [headers]);

  const handleClearHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/bulkmailer/mailmerge/chats`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to clear history");
      setMessages([]);
      setChatId(null);
      setSelectedFile(null);
      setPrompt("");
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e: any) {
      // silent fail - optional inline message could be added
    }
  }, [headers]);

  const handleSubmit = useCallback(async () => {
   
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      setPromptError("Please enter a prompt");
      return;
    }
    setPromptError("");

    setIsLoading(true);
    // Add ChatGPT-like immediate UI feedback
    const tempUserId = Date.now();
    setMessages(prev => prev.concat({ id: tempUserId, sender: 'user', content: prompt, isLoading: false }));
    setMessages(prev => prev.concat({ id: tempUserId + 1, sender: 'bot', content: '', isLoading: true }));
    try {
      const body = JSON.stringify({ prompt, chatId });
      const res = await fetch(`${API_BASE}/bulkmailer/mailmerge/merge`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
      });

      if (res.status === 429) {
        setMessages(prev => prev.filter(m => !(m as any).isLoading).concat({ sender: 'bot', content: 'Rate limit exceeded. Please try again later.' }));
        return;
      }
      if (!res.ok) {
        setMessages(prev => prev.filter(m => !(m as any).isLoading).concat({ sender: 'bot', content: 'Sorry, something went wrong.' }));
        return;
      }
      const data = await res.json();
      setChatId(data.chat_id);
      localStorage.setItem(LOCAL_STORAGE_KEY, String(data.chat_id));
      setMessages(prev => {
        const withoutLoading = prev.filter(m => !(m as any).isLoading);
        const allBotMessages = (data.messages || []).filter((m: any) => m.sender === 'bot');
        const latestBotMessage = allBotMessages[allBotMessages.length - 1];
        return [
          ...withoutLoading,
          latestBotMessage
        ];
      });
      // clear input, reset textarea height and scroll to bottom
      setPrompt('');
      const ta = document.getElementById('chat-input') as HTMLTextAreaElement | null;
      if (ta) {
        ta.style.height = '48px';
      }
      setTimeout(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 50);
    } catch (e: any) {
      setMessages(prev => prev.filter(m => !(m as any).isLoading).concat({ sender: 'bot', content: 'Sorry, something went wrong.' }));
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
    <div className="flex flex-col w-11/12 max-w-6xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[85vh]" style={{ minHeight: '85vh', height: '82vh' }}>
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
          <h2 className="font-bold text-2xl text-white">Mail Merge AI</h2>
          <p className="text-xs text-blue-300">Automate mail merge with AI</p>
        </div>
        <button onClick={handleClearHistory} className="ml-auto p-2 rounded-lg border border-blue-900 text-blue-300 hover:text-red-500 hover:border-red-500 transition-colors" aria-label="Clear chat" title="Clear chat" type="button">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
      {/* Chat History */}
  <div ref={chatRef} className="flex-1 overflow-y-auto px-8 py-4 space-y-6 bg-[#181c2a]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300">
            <FileText className="w-14 h-14 mb-2 text-blue-400" />
            <p className="text-lg">write mails to merge with AI</p>
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
  <div className="px-8 py-4 bg-[#23263a] flex items-center gap-3 relative">
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
       
        <label htmlFor="chat-input" className="sr-only">Prompt</label>
        <textarea
          id="chat-input"
          className="w-full px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value);
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={isLoading}
          style={{ minWidth: 0, minHeight: '48px', maxHeight: '200px', overflowY: 'auto' }}
          rows={1}
        />
        {promptError && (
          <span className="text-xs text-red-400 ml-2">{promptError}</span>
        )}
        <button
          onClick={handleSubmit}
          className="ml-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          disabled={isLoading || !prompt.trim()} // <-- removed !selectedFile
          title="merge email"
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

export default MailMergeAI;


