import { Outlet } from 'react-router-dom';

interface ExcelSuitePageProps {
  isDarkMode?: boolean;
}

function ExcelSuitePage({ }: ExcelSuitePageProps) {
  return (
   <div className="w-full px-4"><Outlet></Outlet></div>
  
    
  );
}

export default ExcelSuitePage; 