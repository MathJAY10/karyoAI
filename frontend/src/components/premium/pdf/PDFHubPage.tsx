import PDFHub from '../components/PDFHub';

interface PDFHubPageProps {
  isDarkMode?: boolean;
}

function PDFHubPage({ isDarkMode = true }: PDFHubPageProps) {
  return (
<div className="w-full px-4">      <div className="w-full max-w-full mx-auto px-4 flex-1 flex flex-col">
        <PDFHub isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

export default PDFHubPage; 