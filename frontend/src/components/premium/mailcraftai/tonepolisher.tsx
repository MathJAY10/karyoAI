import { useState, useEffect, useRef } from 'react';
import { Send, Mail, UserCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserLimit } from '../../../lib/useUserLimit';
import { API_BASE } from '@/lib/api';

const TONE_OPTIONS = [
  {
    title: 'Make it Formal',
    content: 'Transform this text into a formal, professional tone suitable for business communication.'
  },
  {
    title: 'Make it Professional',
    content: 'Convert this content to a polished, professional tone for corporate environments.'
  },
  {
    title: 'Make it Casual',
    content: 'Rewrite this text in a friendly, casual tone for informal communication.'
  },
  {
    title: 'Make it Persuasive',
    content: 'Transform this content into a compelling, persuasive tone to drive action.'
  },
  {
    title: 'Make it Friendly',
    content: 'Rewrite this text in a warm, approachable tone for better engagement.'
  },
  {
    title: 'Make it Concise',
    content: 'Condense this text while maintaining clarity and impact.'
  }
];

const TonePolisher = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { limitReached, Snackbar, handle429Error } = useUserLimit();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Fetch old chat on mount
    const lastChatId = localStorage.getItem('tonePolisher_chatId');
    if (lastChatId) {
      fetch(`${API_BASE}/mailcraft/tonepolisher/chat/${lastChatId}`, {
        headers: getAuthHeaders()
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch chat');
          return res.json();
        })
        .then(data => {
          setCurrentChatId(Number(data.id));
          setMessages(data.messages);
        })
        .catch(() => {
          setCurrentChatId(null);
          setMessages([]);
        });
    }
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsLoading(true);

    const userMessage = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    setMessages(prev => [...prev, { sender: 'user', content: userMessage }]);

    try {
      const response = await fetch(`${API_BASE}/mailcraft/tonepolisher/chat/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: userMessage,
          chatId: currentChatId
        })
      });

      if (response.status === 429) {
        handle429Error();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.chatId && !currentChatId) {
        setCurrentChatId(data.chatId);
        localStorage.setItem('tonePolisher_chatId', data.chatId);
      }

      setMessages(prev => [...prev, { sender: 'bot', content: data.aiMessage }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToneOptionClick = (option: typeof TONE_OPTIONS[0]) => {
    setInput(option.content);
  };

  return (
    <div className="flex flex-col w-11/12 max-w-4xl mx-auto bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 overflow-hidden min-h-[80vh] mt-8">
      {Snackbar}
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-6 border-b border-blue-900 bg-[#23263a]">
        <button
          onClick={() => navigate('/premium/mailcraft')}
          className="p-2 rounded-lg bg-[#181c2a] hover:bg-blue-900 border border-blue-900 mr-2"
          aria-label="Go back"
          title="Go back"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <Mail className="w-7 h-7 text-blue-400" />
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">Tone Polisher</h2>
          <p className="text-xs text-blue-300">Transform your text with different tones and styles</p>
        </div>
      </div>
      {/* Tone Options */}
      <div className="px-8 py-4 bg-[#23263a] border-b border-blue-900">
        <div className="mb-2 text-blue-200 font-semibold">Tone Options:</div>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((option, idx) => (
            <button
              key={idx}
              className="px-3 py-2 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 hover:bg-blue-900 hover:text-white transition-colors text-sm"
              onClick={() => handleToneOptionClick(option)}
              type="button"
            >
              {option.title}
            </button>
          ))}
        </div>
      </div>
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 bg-[#181c2a]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-300">
            <Mail className="w-14 h-14 mb-2 text-blue-400" />
            <p className="text-lg">Start by selecting a tone option or typing your text below.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end`}>
              {msg.sender === 'bot' && (
                <div className="flex-shrink-0 mr-2">
                  <Mail className="w-8 h-8 text-blue-400 bg-white rounded-full p-1 border border-blue-300" />
                </div>
              )}
              <div className={`max-w-[80%] px-5 py-4 rounded-2xl shadow text-base ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-[#23263a] text-blue-100 rounded-bl-md'}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.sender === 'user' && (
                <div className="flex-shrink-0 ml-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center border border-blue-400" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)' }}>
                    {user?.username ? (
                      <span className="text-white font-bold text-lg">{user.username[0].toUpperCase()}</span>
                    ) : (
                      <UserCircle className="w-6 h-6 text-blue-200" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {/* AI typing indicator */}
        {isLoading && (
          <div className="flex justify-start items-end">
            <div className="flex-shrink-0 mr-2">
              <Mail className="w-8 h-8 text-blue-400 bg-white rounded-full p-1 border border-blue-300" />
            </div>
            <div className="max-w-[80%] px-5 py-4 rounded-2xl shadow text-base bg-[#23263a] text-blue-100 rounded-bl-md flex items-center">
              <span>Polishing your text</span>
              <span className="ml-2 flex">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Chat Input */}
      <div className="px-8 py-6 bg-[#23263a] flex items-center gap-3">
        <textarea
          ref={textareaRef}
          className="flex-1 px-5 py-3 rounded-lg border border-blue-900 bg-[#181c2a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[44px] max-h-48"
          placeholder="Type your text here to polish its tone..."
          value={input}
          onChange={e => {
            setInput(e.target.value);
            // Auto expand textarea
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isLoading || limitReached}
          rows={1}
        />
        <button
          onClick={handleSend}
          className="ml-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          disabled={!input.trim() || isLoading || limitReached}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TonePolisher;

