import React from 'react';
import { Language } from '../types';
import { t } from '../utils/translations';

interface HeaderProps {
    language: Language;
    onToggleLanguage: () => void;
}

const Header: React.FC<HeaderProps> = ({ language, onToggleLanguage }) => {
  return (
    <header className="relative text-center pt-8 pb-4 border-b-2 border-cyan-700/30">
      <h1 
        className="text-4xl font-bold text-cyan-400 font-orbitron tracking-widest uppercase"
        style={{ textShadow: '0 0 10px rgba(34, 211, 238, 0.6)' }}
      >
        {t('app_title', language)}
      </h1>
      <p className="text-sm text-gray-400 mt-2">{t('app_subtitle', language)}</p>
      <button 
        onClick={onToggleLanguage}
        className="absolute top-4 right-4 rtl:right-auto rtl:left-4 bg-cyan-700/50 hover:bg-cyan-600/50 text-cyan-200 font-semibold py-1 px-3 border border-cyan-600 rounded-md transition duration-200 text-sm font-orbitron"
      >
        {language === 'en' ? 'العربية' : 'English'}
      </button>
    </header>
  );
};

export default Header;