import BulkMailer from '../components/BulkMailer';



interface BulkMailerPageProps {
  isDarkMode?: boolean;
}

function BulkMailerPage({ isDarkMode = true }: BulkMailerPageProps) {
  return (
   <div className="w-full px-4"> 

    <div className="w-full max-w-full mx-auto px-4 flex-1 flex flex-col">
        <BulkMailer isDarkMode={isDarkMode} />
        
      </div>
    </div>
  );
}

export default BulkMailerPage; 