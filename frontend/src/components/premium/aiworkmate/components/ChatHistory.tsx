import React from 'react';
import { X, MessageSquare, Calendar } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onLoadSession: (sessionId: string) => void;
  currentSessionId: string;
  isDarkMode: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  isOpen,
  onClose,
  sessions,
  onLoadSession,
  currentSessionId,
  isDarkMode,
}) => {
  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    sessions.forEach(session => {
      let dateObj: Date;
      if (!session.createdAt) {
        dateObj = new Date();
      } else if (typeof session.createdAt === 'string') {
        dateObj = new Date(session.createdAt);
      } else {
        dateObj = session.createdAt;
      }
      const date = dateObj.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
    });
    
    return groups;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupedSessions = groupSessionsByDate(sessions);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold flex items-center">
            <MessageSquare size={20} className="mr-2" />
            Chat History
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.keys(groupedSessions).length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={48} className={`mx-auto mb-4 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No chat history yet
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSessions)
                .sort(([a], [b]) => {
                  const dateA = a ? new Date(a) : new Date();
                  const dateB = b ? new Date(b) : new Date();
                  return dateB.getTime() - dateA.getTime();
                })
                .map(([date, sessions]) => (
                  <div key={date}>
                    <div className={`flex items-center mb-3 text-xs font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <Calendar size={14} className="mr-2" />
                      {formatDate(date)}
                    </div>
                    <div className="space-y-2">
                      {sessions
                        .sort((a, b) => {
                          let dateA: Date;
                          let dateB: Date;
                          if (!a.createdAt) dateA = new Date();
                          else if (typeof a.createdAt === 'string') dateA = new Date(a.createdAt);
                          else dateA = a.createdAt;
                          if (!b.createdAt) dateB = new Date();
                          else if (typeof b.createdAt === 'string') dateB = new Date(b.createdAt);
                          else dateB = b.createdAt;
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map(session => (
                          <button
                            key={session.id}
                            onClick={() => onLoadSession(session.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              session.id === currentSessionId
                                ? isDarkMode
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-500 text-white'
                                : isDarkMode
                                ? 'hover:bg-gray-700 text-gray-300'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <div className="font-medium text-sm mb-1 truncate">
                              {session.title}
                            </div>
                            <div className={`text-xs ${
                              session.id === currentSessionId
                                ? 'text-blue-100'
                                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {(session as any).messageCount ?? 0} messages • {(() => {
                                let dateObj: Date;
                                if (!session.createdAt) dateObj = new Date();
                                else if (typeof session.createdAt === 'string') dateObj = new Date(session.createdAt);
                                else dateObj = session.createdAt;
                                return dateObj.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              })()}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatHistory;
