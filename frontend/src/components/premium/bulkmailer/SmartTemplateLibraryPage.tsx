"use client"

import { useEffect, useState, useRef } from 'react';
import { SmartTemplateAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Trash2 } from 'lucide-react'; // or use your preferred icon library

type Template = {
  id: number;
  title: string;
  subject?: string;
  description?: string;
  body: string;
  category?: string;
  isPublic?: boolean;
  userId?: number; // <-- add this
};

const CATEGORIES = [
  'All', 'Marketing', 'Business', 'SEO', 'Writing', 'Coding', 'Career', 'Education', 'Social Media', 'Productivity', 'Security'
];

export default function SmartTemplateLibraryPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'public' | 'my'>('public');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copyEffect, setCopyEffect] = useState(false);
  const [closeEffect, setCloseEffect] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const snackbarTimeout = useRef<NodeJS.Timeout | null>(null);
  const [userTitles, setUserTitles] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [tab]);

  useEffect(() => {
    if (tab === 'my') {
      SmartTemplateAPI.getUserTitles().then(res => {
        setUserTitles(res.titles || []);
      }).catch(() => setUserTitles([]));
    }
  }, [tab, templates]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // get public or my templates
      const res = await SmartTemplateAPI.list(tab === 'public' ? { public: true } : {});
      setTemplates(res.templates || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };


  const openModal = (t: Template) => {
    setSelected(t);
    setEditBody(t.body || '');
    setEditTitle(t.title || '');
    setEditSubject(t.subject || '');
    setEditCategory(t.category || '');
    setEditDescription(t.description || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setCloseEffect(true);
    setTimeout(() => {
      setCloseEffect(false);
      setModalOpen(false);
      setSelected(null);
      setEditBody('');
      setEditTitle('');
      setEditSubject('');
      setEditCategory('');
      setEditDescription('');
    }, 200);
  };

  const saveToMyTemplates = async () => {
    if (!editTitle || !editBody) return;
    setLoading(true);
    try {
      await SmartTemplateAPI.create({
        title: editTitle,
        subject: editSubject,
        description: editDescription,
        body: editBody,
        category: editCategory,
        isPublic: false
      });
      await loadTemplates();
      closeModal();
      setSnackbar({ open: true, message: 'Template saved successfully!' });
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setSnackbar({ open: true, message: 'A template with this title already exists. Please use a different title.' });
      } else if (e?.response?.data?.error) {
        setSnackbar({ open: true, message: e.response.data.error });
      } else {
        setSnackbar({ open: true, message: 'Failed to save template.' });
        console.error(e);
      }
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editBody);
      setCopyEffect(true);
      setTimeout(() => setCopyEffect(false), 500);
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to copy' });
    }
  };

  const askAIToEdit = async () => {
    const instruction = prompt('Enter editing instruction for AI (tone, concise, add CTA, etc)') || '';
    if (!instruction) return;
    setLoading(true);
    try {
      const res = await SmartTemplateAPI.aiEdit(selected?.id || null, instruction, {
        title: editTitle,
        subject: editSubject,
        description: editDescription,
        category: editCategory
      });
      const tpl = res.template;
      setEditBody(tpl.body || '');
      await loadTemplates();
      setSnackbar({ open: true, message: 'AI edit successful!' });
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setSnackbar({ open: true, message: 'A template with this title already exists. Please use a different title.' });
      } else if (e?.response?.data?.error) {
        setSnackbar({ open: true, message: e.response.data.error });
      } else {
        setSnackbar({ open: true, message: 'AI edit failed.' });
        console.error(e);
      }
    }
    setLoading(false);
  };

  // Create new template with AI
  const createWithAI = async () => {
    if (!aiBrief) return;
    setAiLoading(true);
    try {
      const res = await SmartTemplateAPI.aiEdit(null, aiBrief, {});
      const tpl = res.template;
      setEditTitle(tpl.title || '');
      setEditSubject(tpl.subject || '');
      setEditDescription(tpl.description || '');
      setEditCategory(tpl.category || '');
      setEditBody(tpl.body || '');
      setAiModalOpen(false);
      setModalOpen(true);
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.response?.data?.error || 'AI failed.' });
    }
    setAiLoading(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await SmartTemplateAPI.remove(id);
      setSnackbar({ open: true, message: 'Template deleted successfully.' });
      await loadTemplates();
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.response?.data?.error || 'Failed to delete template.' });
    }
    setDeletingId(null);
  };

  // Filtered templates for tab/filter/search
  const filteredTemplates = templates.filter(t => {
    if (tab === 'public' && !t.isPublic) return false;
    if (tab === 'my' && (t.isPublic || !t.id)) return false;
    if (tab === 'my' && filter !== 'All' && t.title !== filter) return false;
    if (tab === 'public' && filter !== 'All' && t.category !== filter) return false;
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase()) && !t.body?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Snackbar/Toast close handler
  const closeSnackbar = () => {
    setSnackbar({ open: false, message: '' });
    if (snackbarTimeout.current) clearTimeout(snackbarTimeout.current);
  };
  // Auto-close snackbar after 3s
  useEffect(() => {
    if (snackbar.open) {
      if (snackbarTimeout.current) clearTimeout(snackbarTimeout.current);
      snackbarTimeout.current = setTimeout(() => setSnackbar({ open: false, message: '' }), 3000);
    }
    return () => { if (snackbarTimeout.current) clearTimeout(snackbarTimeout.current); };
  }, [snackbar.open]);

  return (
    <div className="w-full p-6">
      {/* Snackbar/Toast Notification */}
      {snackbar.open && (
        <div className="fixed top-6 right-6 z-[100] bg-blue-900 text-white px-6 py-3 rounded-lg shadow-lg animate-fadein border border-blue-400 font-semibold text-base flex items-center gap-2">
          <span className="material-icons text-lg">info</span>
          {snackbar.message}
          <button className="ml-2 text-white/70 hover:text-white text-xl" onClick={closeSnackbar}>&times;</button>
        </div>
      )}
      <h1 className="text-3xl font-bold text-white mb-2">Smarts Template Library</h1>
      <p className="text-sm text-blue-300 mb-4">Browse public email templates or your saved ones. Edit them yourself or save to My Templates. Copy and reuse.</p>
      <div className="flex gap-4 mb-4 items-center">
        <button className={`px-4 py-2 rounded-lg font-semibold ${tab === 'public' ? 'bg-blue-700 text-white' : 'bg-[#181c2a] text-blue-300 border border-blue-900'}`} onClick={() => setTab('public')}>Public Templates</button>
        <button className={`px-4 py-2 rounded-lg font-semibold ${tab === 'my' ? 'bg-blue-700 text-white' : 'bg-[#181c2a] text-blue-300 border border-blue-900'}`} onClick={() => setTab('my')}>My Templates</button>
        <input className="ml-auto px-4 py-2 rounded-lg bg-[#181c2a] text-white border border-blue-900 w-64" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        {tab === 'my' && (
          <>
            <button className="ml-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-800 text-white font-semibold flex items-center gap-2 shadow-lg hover:scale-105 hover:from-green-700 hover:to-green-900 transition-all duration-150" onClick={() => { setSelected(null); setEditTitle(''); setEditSubject(''); setEditDescription(''); setEditCategory(''); setEditBody(''); setModalOpen(true); }}>
              <span className="text-xl">+</span> Add Template
            </button>
            <button className="ml-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold flex items-center gap-2 shadow-lg hover:scale-105 hover:from-purple-700 hover:to-purple-900 transition-all duration-150" onClick={() => setAiModalOpen(true)}>
              <span className="text-xl">🤖</span> Create with AI
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {tab === 'my'
          ? ([<button key="All" className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'All' ? 'bg-blue-700 text-white' : 'bg-[#181c2a] text-blue-300 border border-blue-900'}`} onClick={() => setFilter('All')}>All</button>]
            .concat(userTitles.map(title => (
              <button key={title} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === title ? 'bg-blue-700 text-white' : 'bg-[#181c2a] text-blue-300 border border-blue-900'}`} onClick={() => setFilter(title)}>{title}</button>
            ))))
          : (CATEGORIES.map(cat => (
              <button key={cat} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === cat ? 'bg-blue-700 text-white' : 'bg-[#181c2a] text-blue-300 border border-blue-900'}`} onClick={() => setFilter(cat)}>{cat}</button>
            )))}
      </div>
      <div className="grid grid-cols-4 gap-6">
        {loading ? <div className="text-blue-300">Loading...</div> : filteredTemplates.length === 0 ? <div className="text-blue-300">No templates found.</div> : filteredTemplates.map(t => {
          const canDelete = user && (user.id === t.userId || user.role === 'admin');
          return (
            <div key={t.id} className="group h-[320px] flex flex-col">
              <div className="p-5 rounded-xl bg-[#10182c] border border-blue-900 flex flex-col justify-between h-full shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => openModal(t)} tabIndex={0} role="button" aria-label={`Open template ${t.title}`}> {/* Make card fully clickable and accessible */}
                <div className="flex justify-between items-start mb-2">
                  <div className="pr-2">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition">{t.title}</h3>
                    <p className="text-xs text-blue-300 mb-2">{t.description}</p>
                  </div>
                  <div className="text-xs text-blue-200 px-2 py-1 bg-[#081026] rounded-full whitespace-nowrap">{t.category || 'General'}</div>
                </div>
                <p className="mt-2 text-blue-200 line-clamp-3 whitespace-pre-wrap flex-1">{t.body}</p>
                <div className="mt-4 flex gap-2 justify-between items-center">
                  <button className="px-3 py-1 bg-blue-600 rounded text-white font-semibold group-hover:bg-blue-700 transition" onClick={e => { e.stopPropagation(); openModal(t); }}>Use Template</button>
                  {canDelete && (
                    <button className="p-1 bg-transparent hover:bg-red-700 rounded-full transition z-20 ml-auto" onClick={e => { e.stopPropagation(); handleDelete(t.id); }} disabled={deletingId === t.id} aria-label="Delete template" title="Delete">
                      <Trash2 className={`w-5 h-5 ${deletingId === t.id ? 'text-gray-400' : 'text-red-500 hover:text-white'}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for AI template creation */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#10182c] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-purple-900 relative animate-fadein">
            <button className="absolute top-4 right-4 text-purple-300 hover:text-white text-xl" onClick={() => setAiModalOpen(false)}>&times;</button>
            <h2 className="text-2xl font-bold text-white mb-2">Create Template with AI</h2>
            <input className="w-full mb-4 p-2 rounded bg-[#181c2a] text-white border border-purple-900" placeholder="Describe your template (purpose, tone, etc)" value={aiBrief} onChange={e => setAiBrief(e.target.value)} />
            <button className="w-full px-4 py-2 bg-purple-700 rounded text-white font-semibold mt-2 hover:bg-purple-800 transition" onClick={createWithAI} disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Generate with AI'}</button>
          </div>
        </div>
      )}

      {/* Modal for editing/copying/saving template */}
      {modalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fadein`}>
          <div className={`bg-gradient-to-br from-[#10182c] to-[#181c2a] rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-blue-900 relative transition-all duration-200 ${closeEffect ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}>
            <button className={`absolute top-4 right-4 text-blue-300 hover:text-white text-xl transition-all duration-200 ${closeEffect ? 'scale-125 text-red-400' : ''}`} onClick={closeModal} aria-label="Close modal">&times;</button>
            <h2 className="text-2xl font-bold text-white mb-2">{selected ? 'Edit & Save Template' : 'Create New Template'}</h2>
            <div className="mb-3">
              <input className="w-full mb-2 p-2 rounded bg-[#181c2a] text-white border border-blue-900" placeholder="Title" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              <input className="w-full mb-2 p-2 rounded bg-[#181c2a] text-white border border-blue-900" placeholder="Subject" value={editSubject} onChange={e => setEditSubject(e.target.value)} />
              <input className="w-full mb-2 p-2 rounded bg-[#181c2a] text-white border border-blue-900" placeholder="Category" value={editCategory} onChange={e => setEditCategory(e.target.value)} />
              <input className="w-full mb-2 p-2 rounded bg-[#181c2a] text-white border border-blue-900" placeholder="Description" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
              <textarea className="w-full h-40 p-2 rounded bg-[#181c2a] text-white border border-blue-900 resize-none" placeholder="Email body..." value={editBody} onChange={e => setEditBody(e.target.value)} />
            </div>
            <div className="flex gap-3 mt-4">
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 rounded text-white font-semibold hover:from-blue-700 hover:to-blue-900 hover:scale-105 transition-all duration-150 shadow-lg" onClick={saveToMyTemplates}>{selected ? 'Save to My Templates' : 'Create & Save'}</button>
              <button className={`px-4 py-2 border border-blue-800 rounded text-blue-200 font-semibold relative overflow-hidden transition-all duration-200 ${copyEffect ? 'bg-green-600 text-white scale-105' : ''}`} onClick={copyToClipboard}>
                {copyEffect ? 'Copied!' : 'Copy'}
              </button>
              <button className="px-4 py-2 border border-blue-800 rounded text-blue-200 font-semibold hover:bg-blue-900 transition" onClick={closeModal}>Close</button>
              {selected && <button className="px-4 py-2 border border-purple-800 rounded text-purple-200 font-semibold hover:bg-purple-900 transition" onClick={askAIToEdit}>AI Edit</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
