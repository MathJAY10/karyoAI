import MailCraft from '../components/MailCraft';

interface MailCraftPageProps {
  isDarkMode?: boolean;
}

function MailCraftPage({ isDarkMode = true }: MailCraftPageProps) {
  return (
<div className="w-full px-4"><div className="w-full max-w-full mx-auto px-4 flex-1 flex flex-col">
        <MailCraft isDarkMode={isDarkMode} />
      </div></div>      
   
  );
}

export default MailCraftPage; 