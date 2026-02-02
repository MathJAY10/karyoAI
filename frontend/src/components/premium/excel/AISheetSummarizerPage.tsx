import React from 'react';
import AISheetSummarizerChat from './AISheetSummarizerChat';
import { useNavigate } from 'react-router-dom';

const AISheetSummarizerPage: React.FC = () => {
  const navigate = useNavigate();
  return <AISheetSummarizerChat onBack={() => navigate('/premium/excel')} />;
};

export default AISheetSummarizerPage; 