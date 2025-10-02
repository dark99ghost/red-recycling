import React from 'react';
import { BotIcon, RecycleIcon } from './Icons';
import { Language } from '../types';
import { t } from '../utils/translations';

interface TabNavigatorProps {
  activeTab: 'recycler' | 'chatbot';
  setActiveTab: (tab: 'recycler' | 'chatbot') => void;
  language: Language;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({ activeTab, setActiveTab, language }) => {
  const baseClasses = "flex-1 flex items-center justify-center gap-2 py-3 px-4 font-orbitron text-sm uppercase tracking-wider transition-colors duration-300 border-b-2";
  const activeClasses = "bg-cyan-900/30 border-cyan-500 text-cyan-400";
  const inactiveClasses = "border-transparent text-gray-500 hover:bg-gray-800/50 hover:text-gray-300";

  return (
    <div className="flex border-b border-cyan-700/30 mb-8">
      <button
        onClick={() => setActiveTab('recycler')}
        className={`${baseClasses} ${activeTab === 'recycler' ? activeClasses : inactiveClasses}`}
        aria-selected={activeTab === 'recycler'}
        role="tab"
      >
        <RecycleIcon />
        {t('recycler_tab', language)}
      </button>
      <button
        onClick={() => setActiveTab('chatbot')}
        className={`${baseClasses} ${activeTab === 'chatbot' ? activeClasses : inactiveClasses}`}
        aria-selected={activeTab === 'chatbot'}
        role="tab"
      >
        <BotIcon />
        {t('chatbot_tab', language)}
      </button>
    </div>
  );
};

export default TabNavigator;