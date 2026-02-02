import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '@/lib/api';

const HARDCODED_PUBLIC_PROMPTS = [
  {
    id: 'public-1',
    title: 'Prompt improver',
    prompt: 'Improve your initial prompt to get better responses.',
    category: 'Productivity',
  },
  {
    id: 'public-2',
    title: 'Instagram post Generator',
    prompt: 'Write the most attractive Instagram posts for you.',
    category: 'Social Media',
  },
  {
    id: 'public-3',
    title: 'SEO Keyword Generator',
    prompt: 'Generate all the keywords you need to get the best SEO results.',
    category: 'SEO',
  },
  {
    id: 'public-4',
    title: 'Marketing strategy generator',
    prompt: 'Help you create a marketing strategy that will make it irresistible to potential customers!',
    category: 'Marketing',
  },
  {
    id: 'public-5',
    title: 'Course Generator',
    prompt: 'Generate a detailed and comprehensive outline for a course on anything you want.',
    category: 'Education',
  },
  {
    id: 'public-6',
    title: 'SEO - Services Pages - Title and Meta Descriptions',
    prompt: 'Optimize title tags and meta descriptions for better Google ranking on company service pages using SEO strategies',
    category: 'SEO',
  },
  {
    id: 'public-7',
    title: 'Startup plan',
    prompt: 'Create a perfect and actionable plan from your business idea in minutes!',
    category: 'Business',
  },
  {
    id: 'public-8',
    title: 'B2B Lead Magnet Ideas',
    prompt: 'Generate creative lead magnet ideas to attract B2B clients in your industry.',
    category: 'Business',
  },
  {
    id: 'public-9',
    title: 'LinkedIn Outreach Message',
    prompt: 'Write a professional LinkedIn outreach message to connect with potential business partners.',
    category: 'Business',
  },
  {
    id: 'public-10',
    title: 'Cold Email Generator',
    prompt: 'Generate a cold email template to reach out to new B2B prospects.',
    category: 'Marketing',
  },
  {
    id: 'public-11',
    title: 'Client Onboarding Checklist',
    prompt: 'Create a checklist for onboarding new B2B clients efficiently.',
    category: 'Business',
  },
  {
    id: 'public-12',
    title: 'Business Proposal Writer',
    prompt: 'Draft a compelling business proposal for a B2B service offering.',
    category: 'Business',
  },
  {
    id: 'public-13',
    title: 'Competitor Analysis',
    prompt: 'Analyze your competitors and summarize their strengths and weaknesses.',
    category: 'Business',
  },
  {
    id: 'public-14',
    title: 'Sales Pitch Generator',
    prompt: 'Generate a persuasive sales pitch for your B2B product or service.',
    category: 'Business',
  },
  {
    id: 'public-15',
    title: 'Meeting Agenda Creator',
    prompt: 'Create a structured agenda for your next business meeting.',
    category: 'Productivity',
  },
  // ... (add more as needed)
];

// Extend Prompt interface to include category
interface Prompt {
  id: string | number;
  title: string;
  prompt: string;
  category?: string;
}

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onUsePrompt: (prompt: string) => void;
  isDarkMode: boolean;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({ isOpen, onClose, onUsePrompt, isDarkMode }) => {
  const [tab, setTab] = useState<'public' | 'my'>('public');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPrompts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      if (tab === 'my') {
        const res = await axios.get(`${API_BASE}/aiworkmate/prompt/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPrompts(res.data);
      } else {
        // For public, you may want to fetch from /public, but here we keep hardcoded
        setPrompts([]);
      }
    } catch (e) {
      setError('Failed to fetch prompts');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrompts();
    // eslint-disable-next-line
  }, [tab]);

  const handleAddPrompt = async () => {
    if (!newPromptTitle.trim() || !newPromptText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`${API_BASE}/aiworkmate/prompt/`, { title: newPromptTitle, prompt: newPromptText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddModal(false);
      setNewPromptTitle('');
      setNewPromptText('');
      fetchPrompts();
    } catch (e) {
      setError('Failed to add prompt');
    }
    setLoading(false);
  };

  const handleDeletePrompt = async (id: string | number) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${API_BASE}/aiworkmate/prompt/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPrompts();
    } catch (e) {
      setError('Failed to delete prompt');
    }
    setLoading(false);
  };

  const CATEGORIES = [
    'All',
    'Marketing',
    'Business',
    'SEO',
    'Writing',
    'Coding',
    'Career',
    'Chatbot',
    'Education',
    'Social Media',
    'Productivity',
  ];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  let filteredPrompts = prompts.filter(p =>
    (selectedCategory === 'All' || (p.category && p.category === selectedCategory)) &&
    (p.title.toLowerCase().includes(search.toLowerCase()) ||
     p.prompt.toLowerCase().includes(search.toLowerCase()))
  );
  if (tab === 'public') {
    filteredPrompts = [
      ...HARDCODED_PUBLIC_PROMPTS.filter(p =>
        (selectedCategory === 'All' || (p.category && p.category === selectedCategory)) &&
        (p.title.toLowerCase().includes(search.toLowerCase()) ||
         p.prompt.toLowerCase().includes(search.toLowerCase()))
      ),
      ...filteredPrompts
    ];
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
        style={{ boxShadow: isDarkMode ? '0 4px 32px #0008' : '0 4px 32px #0002' }}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="font-bold text-xl">Prompt Library</div>
          <button onClick={onClose} className={`text-2xl rounded-full px-2 py-1 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>×</button>
        </div>
        {/* Tabs */}
        <div className="flex items-center px-6 pt-6 gap-2">
          <button
            className={`px-5 py-2 rounded-full font-semibold text-base shadow transition-all duration-200 border-2 ${tab === 'public' ? 'bg-blue-800 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
            onClick={() => setTab('public')}
            style={{ minWidth: 140 }}
          >
            Public Prompts
          </button>
          <button
            className={`px-5 py-2 rounded-full font-semibold text-base shadow transition-all duration-200 border-2 ${tab === 'my' ? 'bg-blue-800 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
            onClick={() => setTab('my')}
            style={{ minWidth: 140 }}
          >
            My Prompts
          </button>
          <div className="flex-1" />
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg hover:scale-105 transition-transform text-white text-2xl"
            onClick={() => setShowAddModal(true)}
            title="Add Prompt"
            style={{ boxShadow: '0 4px 16px #2563eb44' }}
          >
            +
          </button>
        </div>
        {/* Search */}
        <div className="px-6 pt-6 pb-2">
          <div className="relative">
            <input
              className={`w-full px-5 py-3 rounded-xl border-2 shadow focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-base font-medium ${isDarkMode ? 'border-gray-800 bg-gray-900 text-white placeholder-gray-500' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'}`}
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 44 }}
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </div>
        </div>
        {/* Category Filter (conditional) */}
        {tab === 'public' && (
          <div className="flex flex-wrap gap-2 px-6 pt-2 pb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-150 border-2 ${selectedCategory === cat ? 'bg-blue-700 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        {/* Prompt List or Empty State */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-lg font-semibold">Loading...</div>
          ) : filteredPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="font-bold text-2xl mb-3 text-blue-200">No prompts found</div>
              <div className="text-gray-400 text-base">Find more prompts in <button className="text-blue-400 underline" onClick={() => setTab('public')}>Public Prompts</button> or <button className="text-blue-400 underline" onClick={() => setShowAddModal(true)}>Create your own prompt</button></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredPrompts.map((prompt, idx) => (
                <div key={prompt.id} className={`p-6 rounded-2xl border-2 ${isDarkMode ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'} flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200 relative group`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-lg tracking-tight text-blue-300">{prompt.title}</div>
                    {tab === 'my' && (
                      <button className="text-red-400 hover:text-red-600 text-base font-semibold ml-2" onClick={() => handleDeletePrompt(prompt.id)} title="Delete">🗑️</button>
                    )}
                  </div>
                  <div className="text-gray-300 text-base mb-2 leading-relaxed">{prompt.prompt}</div>
                  <button className="text-blue-400 hover:underline text-sm self-end font-semibold" onClick={() => onUsePrompt(prompt.prompt)}>Use Prompt →</button>
                  {idx !== filteredPrompts.length - 1 && <div className="absolute left-6 right-6 bottom-0 h-px bg-gradient-to-r from-blue-900/0 via-blue-700/40 to-blue-900/0" />}
                </div>
              ))}
            </div>
          )}
          {error && <div className="text-red-500 text-center mt-4 text-base font-semibold">{error}</div>}
        </div>
        {/* Add Prompt Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className={`rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
              style={{ boxShadow: isDarkMode ? '0 8px 40px #000a' : '0 8px 40px #0002' }}>
              <div className="font-bold text-2xl mb-6 text-blue-200">Add Custom Prompt</div>
              <input
                className={`mb-4 px-5 py-3 rounded-xl border-2 text-base font-semibold ${isDarkMode ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
                placeholder="Prompt Title"
                value={newPromptTitle}
                onChange={e => setNewPromptTitle(e.target.value)}
              />
              <textarea
                className={`mb-4 px-5 py-3 rounded-xl border-2 text-base font-medium ${isDarkMode ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
                placeholder="Prompt Text"
                value={newPromptText}
                onChange={e => setNewPromptText(e.target.value)}
              />
              <button
                className={`w-full px-5 py-3 rounded-xl font-semibold text-base shadow transition-all duration-200 border-2 ${isDarkMode ? 'bg-blue-800 border-blue-500 text-white hover:bg-blue-900' : 'bg-blue-500 border-blue-400 text-white hover:bg-blue-600'}`}
                onClick={handleAddPrompt}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Prompt'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptLibrary;