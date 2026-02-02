import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Lightbulb, ArrowRight, Calculator } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { explainFormulaWithChat, getLatestChatByToolType, deleteChatById, getChatHistory } from '../../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserLimit } from '../../../lib/useUserLimit';

const suggestions = [
  { icon: <Calculator className="w-4 h-4 mr-2" />, text: 'Calculate sum with multiple conditions' },
  { icon: <ArrowRight className="w-4 h-4 mr-2" />, text: 'Create a lookup formula' },
  { icon: <BookOpen className="w-4 h-4 mr-2" />, text: 'Extract text from cells' },
  { icon: <Lightbulb className="w-4 h-4 mr-2" />, text: 'Explain this formula: =VLOOKUP(A1,B:C,2,0)' },
];

interface Message {
  id: number;
  sender: 'user' | 'bot';
  content: string;
  isLoading?: boolean;
}

interface FormulaMasterProps {}

const FormulaMaster: React.FC<FormulaMasterProps> = () => {
  const { user } = useAuth();
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { chatId: chatIdFromUrl } = useParams<{ chatId: string }>();
  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();

  useEffect(() => {
    const loadChat = async (id: number | null) => {
        setIsLoading(true);
        try {
            const { chat, messages } = id
                ? await getChatHistory(id)
                : await getLatestChatByToolType('formula_master');
            setChatId(chat.id);
            setMessages(messages.map((m: any) => ({ ...m, isLoading: false })));
            if (!id && chat.id) {
                
            }
        } catch (err: any) {
            if (err.response && err.response.status === 404) {
                // This is okay, it just means there's no chat history.
                setMessages([{ id: Date.now(), sender: 'bot', content: 'Welcome to Formula Master! How can I help you today?' }]);
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

  const handleSend = async () => {
    if (await checkLimit(messages.filter(m => m.sender === 'user').length)) return;
    if (!input.trim()) return;

    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, sender: 'user', content: input }]);
    setInput('');
    setMessages(prev => [...prev, { id: tempId + 1, sender: 'bot', content: '', isLoading: true }]);
    
    try {
      const { chat, messages: newMessages } = await explainFormulaWithChat(chatId, {
        description: !input.startsWith('=') ? input : undefined,
        formula: input.startsWith('=') ? input : undefined,
      });
      setChatId(chat.id);
      setMessages(newMessages.map((m: any) => ({ ...m, isLoading: false })));
      if (!chatId) {
        
      }
    } catch (err: any) {
      if (err?.response?.status === 429) handle429Error();
      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', content: 'Sorry, something went wrong.' }]);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const handleClearChat = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteChat = async () => {
    if (chatId) {
      try {
        await deleteChatById(chatId);
        setChatId(null);
        setMessages([]);
        
      } catch (err) {
        console.error("Failed to delete chat", err);
      }
    }
    setShowDeleteModal(false);
  };

  const cancelDeleteChat = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto min-h-[80vh] bg-[#181c2a] rounded-2xl shadow-2xl border border-blue-900 mt-8 overflow-hidden">
      {Snackbar}
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-blue-900 bg-[#23263a]">
        <button
          onClick={() => navigate('/premium/excel')}
          className="p-2 rounded-lg bg-[#181c2a] hover:bg-blue-900 border border-blue-900 mr-2"
          aria-label="Go back"
          title="Go back"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <Calculator className="w-7 h-7 text-green-400" />
        <div className="flex-1">
          <h2 className="font-bold text-2xl text-white">Formula Master</h2>
          <p className="text-xs text-blue-300">Write and explain Excel formulas with AI</p>
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
            <p className="text-blue-200 mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={cancelDeleteChat} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white">Cancel</button>
              <button onClick={confirmDeleteChat} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Chat Area */}
      <div className="flex-1 flex flex-col gap-4 px-6 py-8 bg-[#181c2a] overflow-y-auto">
        {isLoading && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
                <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
            </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-5 py-3 rounded-2xl shadow text-base ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-[#23263a] text-blue-100 rounded-bl-md'}`}>
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
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {/* Suggestions & Input */}
      <div className="w-full bg-[#181c2a] border-t border-blue-900 px-4 py-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="flex items-center px-3 py-2 rounded-lg border border-blue-900 bg-[#23263a] text-blue-100 hover:bg-blue-900 hover:text-white transition-colors text-sm"
              onClick={() => handleSuggestion(s.text)}
              type="button"
            >
              {s.icon}{s.text}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            className="flex-1 px-4 py-3 rounded-lg border border-blue-900 bg-[#23263a] text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Describe what you want to calculate or paste a formula to explain..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={limitReached || !input.trim() || messages.some(m => m.isLoading)}
          />
          <button
            onClick={handleSend}
            className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            disabled={limitReached || !input.trim() || messages.some(m => m.isLoading)}
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormulaMaster; 