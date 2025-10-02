
import React from 'react';
import { Suggestion, Language } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { ArrowRightIcon } from './Icons';
import { t } from '../utils/translations';

interface SuggestionDisplayProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSelectSuggestion: (suggestion: Suggestion) => void;
  language: Language;
  error: string | null;
}

const SuggestionDisplay: React.FC<SuggestionDisplayProps> = ({ suggestions, isLoading, onSelectSuggestion, language, error }) => {
  if (isLoading) {
    return <LoadingSpinner message={t('loading_suggestions', language)} />;
  }
  
  if (error) {
    return <p className="text-center text-red-400">{error}</p>
  }

  if (suggestions.length === 0) {
    return <p className="text-center text-gray-500">{t('no_suggestions', language)}</p>;
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-orbitron text-cyan-400 mb-2">{t('suggestions_title', language)}</h2>
      <p className="text-gray-400 mb-6">{t('suggestions_subtitle', language)}</p>
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            onClick={() => onSelectSuggestion(suggestion)}
            className="group bg-black/40 p-5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/60 shadow-lg backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-105"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-200 group-hover:text-cyan-400 transition-colors duration-300">{suggestion.title}</h3>
                <p className="text-gray-400 mt-2 text-sm">{suggestion.description}</p>
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">{t('materials_required', language)}</h4>
                    <ul className="flex flex-wrap gap-2">
                        {suggestion.materials_required.map((mat, index) => (
                            <li key={index} className="bg-gray-700/50 text-cyan-200 text-xs font-medium px-2.5 py-1 rounded-full">
                                {mat.name} ({mat.quantity} {mat.unit})
                            </li>
                        ))}
                    </ul>
                </div>
              </div>
              <div className="self-center ml-4 shrink-0">
                <ArrowRightIcon />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestionDisplay;
