import React from 'react';
import PDFBrainPage from './PDFBrainPage';
import { useNavigate } from 'react-router-dom';

const PDFBrainPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <PDFBrainPage onBack={() => navigate('/premium/pdfhub')} />;
};

export default PDFBrainPageWrapper; 