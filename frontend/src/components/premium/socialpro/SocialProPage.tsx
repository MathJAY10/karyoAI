import SocialPro from '../components/SocialPro';

interface SocialProPageProps {
  isDarkMode?: boolean;
}

function SocialProPage({ isDarkMode = true }: SocialProPageProps) {
  return (
   <div className="w-full px-4"> 

<div className="w-full max-w-full mx-auto px-4 flex-1 flex flex-col">
        <SocialPro isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

export default SocialProPage; 