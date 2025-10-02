import React, { useState } from 'react';
import { Material, Difficulty, Language } from '../types';
import { PlusIcon, TrashIcon } from './Icons';
import { t } from '../utils/translations';


interface MaterialInputManagerProps {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  onGetSuggestions: (materials: Material[]) => void;
  difficulty: Difficulty;
  setDifficulty: React.Dispatch<React.SetStateAction<Difficulty>>;
  language: Language;
}

const MaterialInputManager: React.FC<MaterialInputManagerProps> = ({ materials, setMaterials, onGetSuggestions, difficulty, setDifficulty, language }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && quantity) {
      const newMaterial: Material = {
        id: new Date().toISOString(),
        name,
        quantity: parseFloat(quantity),
        unit,
      };
      setMaterials([...materials, newMaterial]);
      setName('');
      setQuantity('');
      setUnit('kg');
    }
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  return (
    <div className="bg-black/40 p-6 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm animate-fade-in">
      <h2 className="text-2xl font-orbitron text-cyan-400 mb-4">{t('inventory_input_title', language)}</h2>
      <p className="text-gray-400 mb-6">{t('inventory_input_subtitle', language)}</p>
      
      <form onSubmit={handleAddMaterial} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
        <div className="md:col-span-2">
          <label htmlFor="material-name" className="block text-sm font-medium text-gray-300 mb-1">{t('material_name_label', language)}</label>
          <input
            id="material-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('material_name_placeholder', language)}
            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
            required
          />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-1">{t('quantity_label', language)}</label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={t('quantity_placeholder', language)}
            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition"
            required
          />
        </div>
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-300 mb-1">{t('unit_label', language)}</label>
          <select
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition h-[42px]"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="liters">liters</option>
            <option value="ml">ml</option>
            <option value="units">units</option>
            <option value="meters">meters</option>
            <option value="cm">cm</option>
          </select>
        </div>
        <div>
          <button type="submit" className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-gray-900 font-bold py-2 px-4 rounded-md transition duration-300 h-[42px]">
            <PlusIcon />
            {t('add_button', language)}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="text-lg font-orbitron text-gray-300 mb-3">{t('current_inventory_title', language)}</h3>
        {materials.length === 0 ? (
          <p className="text-gray-500 italic">{t('no_materials_text', language)}</p>
        ) : (
          <ul className="space-y-2">
            {materials.map(material => (
              <li key={material.id} className="flex justify-between items-center bg-gray-800/60 p-3 rounded-md animate-fade-in">
                <span className="text-gray-200">{material.name} - {material.quantity} {material.unit}</span>
                <button onClick={() => handleDeleteMaterial(material.id)} className="text-red-400 hover:text-red-300">
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 border-t border-cyan-500/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-lg font-orbitron text-gray-300 shrink-0">{t('difficulty_label', language)}</label>
          <div className="flex rounded-md bg-gray-900/50 p-1 border border-gray-600">
            {/* FIX: Cast Object.values(Difficulty) to Difficulty[] to ensure `level` has a specific type.
                This allows TypeScript to infer `level.toLowerCase()` as a union of specific strings ('easy'|'medium'|'hard')
                which are valid keys for the translation function `t`, resolving the type error. */}
            {(Object.values(Difficulty) as Difficulty[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-3 py-1 rounded-sm text-sm font-semibold transition-colors duration-200 ${
                  difficulty === level
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {t(level.toLowerCase() as 'easy' | 'medium' | 'hard', language)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => onGetSuggestions(materials)}
          disabled={materials.length === 0}
          className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-500 text-gray-900 font-bold py-3 px-6 rounded-md transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed font-orbitron tracking-wider"
        >
          {t('get_suggestions_button', language)}
        </button>
      </div>
    </div>
  );
};

export default MaterialInputManager;