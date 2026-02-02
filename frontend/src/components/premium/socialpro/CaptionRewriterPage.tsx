import { useState, useEffect, useRef } from 'react';
import { Send, UserCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserLimit } from '../../../lib/useUserLimit';
import { API_BASE } from '@/lib/api';

const CaptionRewriterPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { limitReached, Snackbar, handle429Error } = useUserLimit();
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const loadLatestChatFromServer = async () => {
    try {
      const res = await fetch(`${API_BASE}/socialpro/captionrewriter/chats`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const latest = data?.chats?.[0];
      if (latest) {
        setChatId(latest.id);
        setMessages(latest.messages || []);
        localStorage.setItem('captionRewriter_chatId', String(latest.id));
      }
    } catch (e) {
      console.error('Failed to load latest caption rewriter chat:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      const lastChatId = localStorage.getItem('captionRewriter_chatId');
      if (lastChatId) {
        try {
          const res = await fetch(`${API_BASE}/socialpro/captionrewriter/chat/${lastChatId}`, { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('Failed to fetch chat');
          const data = await res.json();
          setChatId(Number(data.chat_id));
          setMessages(data.messages);
        } catch (error) {
          console.error('Failed to load chat from stored id, falling back:', error);
          setChatId(null);
          setMessages([]);
          await loadLatestChatFromServer();
        }
      } else {
        await loadLatestChatFromServer();
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: input,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/socialpro/captionrewriter/chat/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          message: currentInput, 
          chatId
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert('Please log in again');
          navigate('/login');
          return;
        }
        if (res.status === 404) {
          alert('Service not available. Please try again later.');
          return;
        }
      }

      const data = await res.json();

      if (res.ok) {
        setChatId(data.chat_id);
        localStorage.setItem('captionRewriter_chatId', data.chat_id);
        setMessages(data.messages);
      } else {
        if (data.error && data.error.toLowerCase().includes('limit')) {
          handle429Error();
        } else {
          alert(data.error || 'Failed to send message');
        }
        setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please check your connection.');
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-11/12 max-w-5xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[85vh] mt-6">
      {Snackbar}
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-6 border-b border-blue-900 bg-gradient-to-r from-[#23263a] to-[#1e2235]">
        <button
          onClick={() => navigate('/premium/socialpro')}
          className="p-2 rounded-lg bg-[#181c2a] hover:bg-blue-900 border border-blue-900 mr-2 transition-all duration-200 hover:scale-105"
          aria-label="Go back"
          title="Go back"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">Caption Rewriter AI</h2>
          <p className="text-sm text-blue-300">Rewrite and improve your existing captions with AI</p>
        </div>
      </div>
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#181c2a]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300">
            <p className="text-lg font-medium">Paste your caption below to rewrite and improve it.</p>
            <p className="text-sm text-blue-400 mt-2">AI will return a better version instantly!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end`}>
              <div className={`max-w-[80%] px-5 py-4 rounded-2xl shadow-lg text-base ${msg.sender === 'user' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md' : 'bg-[#23263a] text-blue-100 rounded-bl-md border border-blue-800'}`}>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
              {msg.sender === 'user' && (
                <div className="flex-shrink-0 ml-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-blue-400 bg-gradient-to-r from-indigo-500 to-purple-600">
                    {user?.username ? (
                      <span className="text-white font-bold text-sm">{user.username[0].toUpperCase()}</span>
                    ) : (
                      <UserCircle className="w-6 h-6 text-blue-200" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start items-end">
            <div className="max-w-[80%] px-5 py-4 rounded-2xl shadow-lg text-base bg-[#23263a] text-blue-100 rounded-bl-md border border-blue-800 flex items-center">
              <span className="mr-2">Rewriting your caption</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {/* Chat Input */}
      <div className="px-8 py-6 bg-[#23263a] flex items-center gap-3">
        <textarea
          ref={textareaRef}
          className="flex-1 px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none min-h-[48px] max-h-48 transition-all duration-200"
          placeholder="Paste your caption here to rewrite..."
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px';
          }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={isLoading || limitReached}
          rows={1}
        />
        <button
          onClick={handleSend}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-105 transform"
          disabled={!input.trim() || isLoading || limitReached}
          title="Send message"
        >
          <Send className="w-5 h-5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

export default CaptionRewriterPage;
