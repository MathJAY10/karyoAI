import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowRight, Paperclip, BookOpen } from 'lucide-react';
import ChatHistory from './components/ChatHistory';
import PromptLibrary from './components/PromptLibrary';
import { useTheme } from '../../../hooks/useTheme';
import axios from 'axios'; // Added axios import
import { API_BASE } from '@/lib/api';
import { useUserLimit } from '@/lib/useUserLimit';
import { useNavigate, useParams } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isTyping?: boolean;
  model?: string; // Add model field
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface AIAgentPageProps {
  isDarkMode?: boolean;
}

const AIAgentPage: React.FC<AIAgentPageProps> = ({ isDarkMode: initialTheme = true }) => {
  const { isDarkMode } = useTheme(initialTheme);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Add username fetch for user avatar
  const [username, setUsername] = useState<string>('User');
  useEffect(() => {
    const stored = localStorage.getItem('username');
    if (stored && typeof stored === 'string') setUsername(stored);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatHistory = async (sessionId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE}/aiworkmate/chat/history/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Convert backend timestamps to Date objects and add model fallback
    const loadedMessages = response.data.map((msg: any) => ({
      id: String(msg.id),
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
      model: msg.model // If backend ever adds it, otherwise undefined
    }));
    setMessages(loadedMessages);
  };

  const fetchSessions = async () => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE}/aiworkmate/chat/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Filter to only ai_workmate toolType, in case backend returns extra
    const filtered = response.data.filter((chat: any) => chat.toolType === 'ai_workmate');
    setChatSessions(filtered);
    // Optionally auto-select the first session
    if (filtered.length > 0) {
      setCurrentSessionId(String(filtered[0].id));
      fetchChatHistory(String(filtered[0].id)); // Fetch messages for first session
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const createNewChatSession = async () => {
    const token = localStorage.getItem('accessToken');
    await axios.post(`${API_BASE}/aiworkmate/chat/create`, 
      { title: 'New Chat' }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchSessions(); // refresh the chat list from backend
  };

  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => 
        prev.map(session => 
          session.id === currentSessionId 
            ? { ...session, messages, title: messages[0]?.content.slice(0, 30) + '...' || 'New Chat' }
            : session
        )
      );
    }
  }, [messages, currentSessionId]);

  const { limitReached, checkLimit, Snackbar, handle429Error } = useUserLimit();
  const navigate = useNavigate();
  const { sessionId: sessionIdFromUrl } = useParams<{ sessionId: string }>();

  // On session change, store currentSessionId in localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('aiworkmate_currentSessionId', currentSessionId);
    }
  }, [currentSessionId]);

  // On mount, fetch sessions, then fetch chat history for sessionId in URL or latest session
  useEffect(() => {
    async function init() {
      await fetchSessions();
      let sessionId = sessionIdFromUrl;
      if (!sessionId && chatSessions.length > 0) {
        sessionId = chatSessions[0].id;
        navigate(`/premium/aiworkmate/${sessionId}`, { replace: true });
      }
      if (sessionId) {
        setCurrentSessionId(sessionId);
        fetchChatHistory(sessionId);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdFromUrl]);

  const handleSendMessage = async () => {
    const userMessageCount = messages.filter(m => m.sender === 'user').length;
    if (await checkLimit(userMessageCount) || limitReached) return;
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Reset textarea height after sending
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Fetch AI response from backend (OpenAI)
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('chatId', currentSessionId);
      formData.append('message', userMessage.content);
      // If you want to support file upload, also append: formData.append('file', fileObject);

      const res = await fetch(`${API_BASE}/aiworkmate/chat/send`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
          // Do NOT set 'Content-Type' header; browser will set it automatically for FormData
        },
        body: formData,
      });
      const data = await res.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.aiMessage,
        sender: 'ai',
        timestamp: new Date(),
        model: selectedModel // Store the model used for this AI message
      };
      setMessages(prev => [...prev, aiMessage]);
      // After sending, re-fetch the limit
      await checkLimit(userMessageCount + 1);
    } catch (err: any) {
      if (err?.response?.status === 429) handle429Error();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error getting a response from the AI.',
        sender: 'ai',
        timestamp: new Date(),
        model: selectedModel
      }]);
    }
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadChatSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    fetchChatHistory(sessionId); // Always fetch from backend
    setShowChatHistory(false);
  };

  const usePrompt = (prompt: string) => {
    setInputValue(prompt);
    setShowPromptLibrary(false);
    inputRef.current?.focus();
  };



  // Suggested prompts for the welcome screen
  const suggestedPrompts = [
    {
      title: "Grammar corrector",
      description: "Fix grammar and improve writing quality"
    },
    {
      title: "Learn Code FAST!",
      description: "Get coding tutorials and explanations"
    },
    {
      title: "Story generator",
      description: "Create engaging stories and narratives"
    },
    {
      title: "Excel Data Analysis",
      description: "Analyze and visualize your spreadsheet data"
    }
  ];

  const useSuggestedPrompt = (title: string) => {
    const promptMap: { [key: string]: string } = {
      "Grammar corrector": "Please correct the grammar and improve the writing quality of the following text:",
      "Learn Code FAST!": "Explain this programming concept in simple terms with examples:",
      "Story generator": "Create an engaging story about:",
      "Excel Data Analysis": "Analyze this Excel data and provide insights on trends, patterns, and recommendations:"
    };
    
    const prompt = promptMap[title] || title;
    setInputValue(prompt + " ");
    inputRef.current?.focus();
  };

  // LLM Model List (from image)
  const LLM_MODELS = [
    'GPT-4o mini',
    'GPT-4o',
    'Gemini 1.5 Flash',
    'Gemini 1.5 Pro',
    'Claude 3 Haiku',
    'Claude 3.5 Sonnet',
    'Deepseek Chat',
    'DeepSeek-R1-Distill-Qwen-32B',
    'Perplexity Sonar',
    'Perplexity Sonar Pro',
    'Perplexity Sonar Reasoning',
    'Perplexity Sonar Reasoning Pro',
    'Grok 3 Beta',
    'Grok 3 Mini Beta',
    'Llama 3.1 70B',
    'Llama 3.1 405B',
    'Llama-3.3-70B-Instruct',
    'QwQ-32B',
    'Qwen2.5-Coder-32B-Instruct',
    'Qwen3-32B',
    'SaoLa3.1-medium',
    'SaoLa-Llama3.1-planner',
  ];

  const [selectedModel, setSelectedModel] = useState<string>(LLM_MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Helper to get model logo path
  const getModelLogo = (model: string) => {
    const lower = model.toLowerCase();
    if (lower.includes('gpt')) return '/chatgptlogo.png';
    if (lower.includes('gemini')) return '/gemini.png';
    if (lower.includes('claude')) return '/claude.png';
    if (lower.includes('grok')) return '/grok.png';
    if (lower.includes('amazon')) return '/amazonnova.png';
    if (lower.includes('deepseek')) return '/deepseek.png';
    if (lower.includes('llama')) return '/llamaindex.png';
    if (lower.includes('qwen') || lower.includes('qwq')) return '/qwen.png';
    if (lower.includes('perplexity')) return '/perplexity.png';
    if (lower.includes('saola')) return '/karyo-logo.png'; // Placeholder, update if you have a saola icon
    return '/karyo-logo.png';
  };

  return (
      <div className={`flex w-full ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}> 
      {Snackbar}
      {/* Chat History Sidebar */}
      <ChatHistory
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        sessions={chatSessions}
        onLoadSession={loadChatSession}
        currentSessionId={currentSessionId}
        isDarkMode={isDarkMode}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto border-x border-gray-800/20 dark:border-gray-700/60 bg-transparent shadow-none min-h-[calc(100vh-120px)] h-full">
        {/* Welcome Section - Only show when no messages */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center px-2 sm:px-4 py-4 sm:py-6"> {/* Removed justify-center, set py-6 for moderate padding */}
            <div className="text-center max-w-2xl mt-2 w-full">
              <h1
                className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-snug ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                style={{ marginTop: '0px', marginBottom: '6px' }}
              >
                Hi, good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}!
              </h1>
              <p
                className={`text-base sm:text-lg mb-4 sm:mb-6 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                I'm karyo, your personal AI assistant
              </p>
              {/* Suggested Prompts */}
              <div className="mb-6 sm:mb-8">
                <div className={`flex items-center justify-between mb-3 sm:mb-4`}>
                  <h3 className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Don't know what to say? Use a prompt!
                  </h3>
                  <button 
                    onClick={() => setShowPromptLibrary(true)}
                    className={`text-xs sm:text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} flex items-center`}
                  >
                    View all <ArrowRight size={14} className="ml-1 sm:w-4 sm:h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => useSuggestedPrompt(prompt.title)}
                      className={`p-3 sm:p-4 rounded-xl border text-left transition-all hover:scale-105 shadow-none ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-white' 
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{prompt.title}</h4>
                        <ArrowRight size={14} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} sm:w-4 sm:h-4`} />
                      </div>
                      <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{prompt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
)}
  
        {/* Messages Area - Only show when there are messages */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6">
            <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} items-end`}
                >
                  {/* Avatar */}
                  {message.sender === 'ai' && (
                    <div className="flex-shrink-0 mr-2 sm:mr-3">
                      <img src={getModelLogo(message.model || selectedModel)} alt="model logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain bg-white border border-blue-400 shadow" />
                    </div>
                  )}
                  <div
                    className={`w-full max-w-3xl px-4 sm:px-7 py-3 sm:py-5 rounded-3xl shadow-lg transition-all duration-200 ${
                      message.sender === 'user'
                        ? isDarkMode
                          ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white rounded-br-2xl rounded-tl-2xl rounded-bl-2xl'
                          : 'bg-blue-500 text-white rounded-br-2xl rounded-tl-2xl rounded-bl-2xl'
                        : isDarkMode
                        ? 'bg-gray-800/90 text-blue-100 rounded-bl-2xl rounded-tr-2xl rounded-br-2xl border border-blue-900/30'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-2xl rounded-tr-2xl rounded-br-2xl'
                    }`}
                    style={{ borderTopLeftRadius: message.sender === 'user' ? '1.5rem' : '1rem', borderTopRightRadius: message.sender === 'user' ? '1rem' : '1.5rem', boxShadow: isDarkMode ? '0 4px 32px #0006' : '0 4px 24px #2563eb22' }}
                  >
                    <div className="whitespace-pre-wrap text-sm sm:text-base font-normal leading-relaxed">{message.content}</div>
                    <div className={`text-xs mt-2 ${
                      message.sender === 'user'
                        ? 'text-blue-200 text-right'
                        : isDarkMode ? 'text-gray-400 text-left' : 'text-gray-500 text-left'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  {/* User Avatar */}
                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 ml-2 sm:ml-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-900 flex items-center justify-center text-blue-200 font-bold text-base sm:text-lg shadow border border-blue-400">
                        {username && username.length > 0 ? username[0].toUpperCase() : 'U'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start items-end">
                  <div className="flex-shrink-0 mr-2 sm:mr-3">
                    <img src={getModelLogo(selectedModel)} alt="model logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain bg-white border border-blue-400 shadow" />
                  </div>
                  <div className={`w-full max-w-3xl px-4 sm:px-7 py-3 sm:py-5 rounded-3xl shadow-lg ${
                    isDarkMode
                      ? 'bg-gray-800/90 text-blue-100 rounded-bl-2xl rounded-tr-2xl rounded-br-2xl border border-blue-900/30'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-2xl rounded-tr-2xl rounded-br-2xl'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
                        }`}></div>
                        <div className={`w-2 h-2 rounded-full animate-pulse delay-75 ${
                          isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
                        }`}></div>
                        <div className={`w-2 h-2 rounded-full animate-pulse delay-150 ${
                          isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
                        }`}></div>
                      </div>
                      <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        AI is typing...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>
        )}
        {/* Icons above message input, right aligned */}
        <div className="flex justify-end items-center w-full px-2 sm:px-4 pt-2 pb-0 gap-1 sm:gap-2">
          <button
            onClick={() => setShowChatHistory(!showChatHistory)}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-gray-800 focus:outline-none"
            title="History"
            style={{ background: isDarkMode ? 'transparent' : 'transparent' }}
          >
            <svg width="20" height="20" className="sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke={isDarkMode ? '#A3A3A3' : '#2563eb'} strokeWidth="2" />
              <path d="M12 7V12L15 15" stroke={isDarkMode ? '#A3A3A3' : '#2563eb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => {
              createNewChatSession();
              setMessages([]);
            }}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 hover:bg-blue-600 focus:outline-none"
            title="New Chat"
          >
            <svg width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#3B82F6" />
              <path d="M10 6V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M6 10H14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {/* Input Area */}
        <div className={`p-2 sm:p-4 border-t ${
            isDarkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-gray-50/95 border-gray-200'
          }`}> 
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-end space-y-2 sm:space-y-0 sm:space-x-2">
              {/* End Model Selector */}
              <div className="flex-1 relative w-full">
                <div className={`flex items-center rounded-xl border transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 focus-within:border-blue-500'
                    : 'bg-white border-gray-200 focus-within:border-blue-500'
                }`}>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (inputRef.current) {
                        inputRef.current.style.height = 'auto';
                        inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Message AI Assistant..."
                    className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-transparent border-none outline-none resize-none text-sm sm:text-base ${
                      isDarkMode
                        ? 'text-white placeholder-gray-400'
                        : 'text-gray-900 placeholder-gray-500'
                    }`}
                    style={{ minHeight: '36px', maxHeight: '150px', overflowY: 'auto' }}
                    rows={1} // Add rows=1 to start with a single line
                  />
                  <div className="flex items-center space-x-1 pr-2">
                    <button
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-400' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button
                      onClick={() => setShowPromptLibrary(!showPromptLibrary)}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-400' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <BookOpen size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={limitReached || !inputValue.trim() || isTyping}
                className={`p-2.5 sm:p-3 rounded-xl font-medium transition-all flex-shrink-0 ${
                  limitReached || !inputValue.trim() || isTyping
                    ? isDarkMode
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                    : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
                }`}
              >
                <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Prompt Library Modal */}
      <PromptLibrary
        isOpen={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        onUsePrompt={usePrompt}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default AIAgentPage;
