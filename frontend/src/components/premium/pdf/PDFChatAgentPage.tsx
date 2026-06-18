import React from 'react';
import PDFChatAgentChat from './PDFChatAgentChat';
import { useNavigate, useParams } from 'react-router-dom';

const PDFChatAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const { documentId } = useParams();
  
  // If no documentId is found, navigate back to the hub.
  if (!documentId) {
    navigate('/premium/pdfhub/chatagent');
    return null;
  }

  return (
    <PDFChatAgentChat 
      documentId={Number(documentId)} 
      onBack={() => navigate('/premium/pdfhub/chatagent')} 
    />
  );
};

export default PDFChatAgentPage; 