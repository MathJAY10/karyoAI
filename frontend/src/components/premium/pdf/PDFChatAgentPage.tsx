import React from 'react';
import PDFChatAgentChat from './PDFChatAgentChat';
import { useNavigate } from 'react-router-dom';

const PDFChatAgentPage: React.FC = () => {
  const navigate = useNavigate();
  return <PDFChatAgentChat onBack={() => navigate('/premium/pdfhub')} />;
};

export default PDFChatAgentPage; 