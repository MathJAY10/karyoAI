import React from 'react';
import ChartBuilder from './ChartBuilder';

const ChartBuilderPage: React.FC = () => {
  const [isDarkMode] = React.useState(true);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <ChartBuilder isDarkMode={isDarkMode} onBack={handleBack} />
  );
};

export default ChartBuilderPage; 