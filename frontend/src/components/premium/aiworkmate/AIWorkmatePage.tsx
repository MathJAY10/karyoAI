import { useTheme } from '../../../hooks/useTheme';
import AIAgentPage from './AIAgentPage';

function AIWorkmatePage() {
  const { isDarkMode } = useTheme();
  return (
    <AIAgentPage isDarkMode={isDarkMode} />
  );
}

export default AIWorkmatePage; 