import React from 'react';
import SmartDataExtractorPanel from './SmartDataExtractorPanel';
import { useNavigate } from 'react-router-dom';

const SmartDataExtractorPage: React.FC = () => {
  const navigate = useNavigate();
  return <SmartDataExtractorPanel onBack={() => navigate('/premium/pdfhub')} />;
};

export default SmartDataExtractorPage;

