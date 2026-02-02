import DataFill from '../components/DataFill';

interface DataFillPageProps {
  isDarkMode?: boolean;
}

function DataFillPage({ isDarkMode = true }: DataFillPageProps) {
  return (
       <div className="w-full px-4"> 

      <div className="w-full max-w-full mx-auto px-4 flex-1 flex flex-col">
        <DataFill isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

export default DataFillPage; 