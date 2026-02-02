import axios from 'axios';
import { useState } from 'react';
import { handleLimitExceededError } from '../../../../lib/utils';
import { API_BASE } from '@/lib/api';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface AIWorkmateChatInputProps {
  chatId: string;
  onSend: (aiMessage: any) => void;
}

export default function AIWorkmateChatInput({ chatId, onSend }: AIWorkmateChatInputProps) {
  const [input, setInput] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: { target: { files: any[]; }; }) => {
    const f = e.target.files[0];
    if (f && f.size > MAX_FILE_SIZE) {
      setError('File too large (max 20MB)');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleSend = async () => {
    if (!input.trim() && !file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('message', input);
      if (file) formData.append('file', file);
      const res = await axios.post(`${API_BASE}/aiworkmate/chat/send`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSend(res.data.aiMessage);
      setInput('');
      setFile(null);
    } catch (e: any) {
      const errorMessage = handleLimitExceededError(e);
      setError(errorMessage);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="Message AI Assistant..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <input
          type="file"
          className="hidden"
          id="aiworkmate-file-upload"
          onChange={(e) => handleFileChange(e as unknown as { target: { files: any[] } })}
          disabled={loading}
        />
        <label htmlFor="aiworkmate-file-upload" className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200">
          Attach
        </label>
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
          onClick={handleSend}
          disabled={loading || (!input.trim() && !file)}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
      {file && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <span>{file.name}</span>
          <button className="text-red-500 hover:text-red-700" onClick={() => setFile(null)}>Remove</button>
        </div>
      )}
      {error && (
        <div className={`text-sm p-3 rounded-lg ${
          error.includes('limit exceeded') || error.includes('upgrade')
            ? 'bg-yellow-100 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-500/50 dark:text-yellow-400'
            : 'bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-500/50 dark:text-red-400'
        }`}>
          {error}
          {(error.includes('limit exceeded') || error.includes('upgrade')) && (
            <div className="mt-2">
              <a 
                href="/premium" 
                className="inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Upgrade Now
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 