import SmartDocs from '../components/SmartDocs';
// import ToolCard from '../components/ToolCard'; // No longer needed directly here
// import { FaFileInvoiceDollar, FaRegFileAlt } from 'react-icons/fa'; // No longer needed directly here

interface SmartDocsPageProps {
  isDarkMode?: boolean;
}

function SmartDocsPage({ isDarkMode = true }: SmartDocsPageProps) {
  return (
   <div className="w-full px-4"> 
      <div className="w-full max-w-full mx-auto px-4 flex-1 flex flex-col">
        <SmartDocs isDarkMode={isDarkMode} />
        {/* The ToolCards are now rendered within the SmartDocs component itself */}
      </div>
    </div>
  );
}

export default SmartDocsPage; 