import React from 'react';
import { ProjectStepsResponse, Suggestion, Language } from '../types';
import { t } from '../utils/translations';
import LoadingSpinner from './LoadingSpinner';
import { PowerIcon } from './Icons';

interface StepsDisplayProps {
  projectData: ProjectStepsResponse | null;
  suggestion: Suggestion;
  onBack: () => void;
  language: Language;
  isLoading: boolean;
}

const StepsDisplay: React.FC<StepsDisplayProps> = ({ projectData, suggestion, onBack, language, isLoading }) => {
  
  if (isLoading && !projectData) {
    return <LoadingSpinner message={t('loading_steps', language)} />;
  }

  if (!projectData) {
    // This could be an error state, but for now we'll return null if there's no data and we're not loading.
    return null;
  }
  
  const { steps, total_power_consumption_kwh, power_consumption_breakdown } = projectData;

  return (
    <div className="bg-black/40 p-6 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-cyan-700/30">
        <div>
          <h2 className="text-2xl font-orbitron text-cyan-400">{suggestion.title}</h2>
        </div>
        <button
          onClick={onBack}
          className="bg-gray-700/50 hover:bg-gray-600/50 text-cyan-200 font-semibold py-1 px-4 border border-gray-600 rounded-md transition duration-200 text-sm font-orbitron shrink-0 ms-4"
        >
          {t('back_button', language)}
        </button>
      </div>

      {/* Power Consumption Breakdown */}
      <div className="mb-8 p-4 border border-cyan-700/30 bg-gray-900/20 rounded-lg">
        <h3 className="flex items-center text-lg font-orbitron text-cyan-400 mb-4">
            <PowerIcon className="h-5 w-5 me-2 text-cyan-400" />
            {t('power_analysis_title', language)}
        </h3>
        <div className="bg-black/20 p-3 rounded-md mb-4 flex items-center justify-between">
            <span className="font-semibold text-gray-300">{t('total_power_consumption', language)}</span>
            <span className="text-2xl font-orbitron text-cyan-300 tracking-wider">{total_power_consumption_kwh.toFixed(2)} kWh</span>
        </div>
        <div className="space-y-4">
            {power_consumption_breakdown.map((item, index) => {
                const percentage = total_power_consumption_kwh > 0 ? (item.kwh / total_power_consumption_kwh) * 100 : 0;
                return (
                    <div key={index} className="text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-300">{item.task}</span>
                            <span className="font-mono text-cyan-400 font-semibold">{item.kwh.toFixed(2)} kWh</span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-2 rounded-full"
                                style={{ width: `${percentage}%`, transition: 'width 0.5s ease-in-out' }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Manufacturing Protocol section */}
      <div>
        <h3 className="text-xl font-orbitron text-cyan-400 mb-4">{t('project_steps_title', language)}</h3>
        <div className="space-y-4">
            {steps.map((step) => (
            <div key={step.step} className="bg-gray-800/60 p-4 rounded-md">
                <h4 className="text-lg font-bold text-gray-200">
                    <span className="text-cyan-400 font-orbitron me-3">{t('step', language)} {step.step}:</span>
                    {step.title}
                </h4>
                <p className="text-gray-400 mt-2 whitespace-pre-wrap">{step.description}</p>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default StepsDisplay;