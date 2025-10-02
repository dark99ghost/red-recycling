import React, { useState, useCallback } from 'react';
import { Material, Suggestion, Difficulty, Language, ProjectStepsResponse } from './types';
import { getSuggestions, getSteps } from './services/geminiService';
import Header from './components/Header';
import MaterialInputManager from './components/MaterialInputManager';
import SuggestionDisplay from './components/SuggestionDisplay';
import StepsDisplay from './components/StepsDisplay';
import TabNavigator from './components/TabNavigator';
import Chatbot from './components/Chatbot';

const App: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [projectData, setProjectData] = useState<ProjectStepsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'recycler' | 'chatbot'>('recycler');

  const handleGetSuggestions = useCallback(async (currentMaterials: Material[]) => {
    if (currentMaterials.length === 0) return;
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setProjectData(null);

    try {
      const result = await getSuggestions(currentMaterials, difficulty, language);
      setSuggestions(result);
    } catch (err) {
      setError('Failed to get suggestions. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [difficulty, language]);

  const handleSelectSuggestion = useCallback(async (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setIsLoading(true);
    setError(null);
    setProjectData(null);

    try {
      const result = await getSteps(suggestion, language);
      setProjectData(result);
    } catch (err) {
      setError('Failed to get steps. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [language]);
  
  const handleBack = () => {
    setSelectedSuggestion(null);
    setProjectData(null);
  };

  const handleToggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'ar' : 'en'));
    // Reset state when language changes to avoid confusion
    setMaterials([]);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setProjectData(null);
    setError(null);
  };

  const renderRecyclerContent = () => {
    if (selectedSuggestion) {
      return <StepsDisplay projectData={projectData} onBack={handleBack} language={language} suggestion={selectedSuggestion} isLoading={isLoading} />;
    }
    if (isLoading) {
       return <SuggestionDisplay suggestions={[]} isLoading={true} onSelectSuggestion={() => {}} language={language} error={null} />;
    }
    if (suggestions.length > 0 || error) {
      return <SuggestionDisplay suggestions={suggestions} isLoading={isLoading} onSelectSuggestion={handleSelectSuggestion} language={language} error={error} />;
    }
    return (
      <MaterialInputManager 
        materials={materials} 
        setMaterials={setMaterials}
        onGetSuggestions={handleGetSuggestions}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        language={language}
      />
    );
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white font-sans ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Header language={language} onToggleLanguage={handleToggleLanguage} />
      <main className="container mx-auto px-4 py-8">
        <TabNavigator activeTab={activeTab} setActiveTab={setActiveTab} language={language} />

        {activeTab === 'recycler' ? (
          <div className="space-y-8">
            {renderRecyclerContent()}
          </div>
        ) : (
          <Chatbot language={language} />
        )}
      </main>
    </div>
  );
};

export default App;