import { GoogleGenAI, Type, Chat } from "@google/genai";

// --- TYPES ---
interface Material {
    id: string;
    name: string;
    quantity: number;
    unit: string;
}

interface MaterialRequired {
    name: string;
    quantity: number;
    unit: string;
}

interface Suggestion {
    id: string;
    title: string;
    description: string;
    materials_required: MaterialRequired[];
    image_base64?: string;
}

interface ProjectData {
    total_power_consumption_kwh: number;
    power_consumption_breakdown: { task: string; kwh: number }[];
    steps: { step: number; title: string; description: string }[];
}

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

interface AppState {
    materials: Material[];
    suggestions: Suggestion[];
    selectedSuggestion: Suggestion | null;
    projectData: ProjectData | null;
    isLoading: boolean;
    error: string | null;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    language: 'en' | 'ar';
    activeTab: 'recycler' | 'chatbot';
    chat: Chat | null;
    chatMessages: ChatMessage[];
    isChatLoading: boolean;
}

// --- GEMINI SERVICES ---

// The API key is assumed to be available in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseJsonResponse = (jsonString: string): any => {
  try {
    // The model might return a string with markdown ```json ... ```
    const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON response:", jsonString, error);
    throw new Error("Invalid JSON response from the model.");
  }
};

const getSuggestions = async (materials: Material[], difficulty: string, language: string): Promise<Suggestion[]> => {
  const materialsString = materials.map(m => `${m.name}: ${m.quantity} ${m.unit}`).join(', ');
  const prompt = `You are an engineering AI for a Mars colony. Your task is to help colonists recycle available waste materials into useful items. 
Based on the following inventory from the Jezero Crater base: [${materialsString}], suggest 3 practical projects vital for survival or colony maintenance.
The colonist has requested projects with a difficulty level of "${difficulty}".
Crucially, prioritize projects that are extremely energy-efficient. The total power consumption for any suggested project must be under 15 kWh.
Consider using local Martian resources like regolith if applicable as a supplementary material.
The response must be in ${language === 'ar' ? 'Arabic' : 'English'}.
Provide a title, a short description, and a list of the required materials for each project.
Do not suggest projects that require materials not on the list. You can assume smaller quantities of the provided materials can be used.`;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'A unique identifier for the suggestion, can be a UUID.' },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        materials_required: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
            },
            required: ['name', 'quantity', 'unit'],
          },
        },
      },
      required: ['id', 'title', 'description', 'materials_required'],
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });
  
  const responseText = response.text?.trim();
  if (!responseText) {
    console.error("Model response for suggestions is empty or undefined.", response);
    throw new Error("Received an empty response from the model when fetching suggestions.");
  }

  const suggestionsWithoutImages: Suggestion[] = parseJsonResponse(responseText);

  // Generate an image for each suggestion
  const suggestionsWithImages = await Promise.all(
    suggestionsWithoutImages.map(async (suggestion) => {
      try {
        const materialsStringForImage = suggestion.materials_required.map(m => m.name).join(', ');
        const imagePrompt = language === 'ar'
          ? `صورة منتج فوتوغرافية واقعية للغاية. الموضوع هو '${suggestion.title}'، وهو عنصر تم تصنيعه في مستعمرة على المريخ. تم تصنيعه من مواد معاد تدويرها تشمل: ${materialsStringForImage}. الوصف: '${suggestion.description}'. يجب أن تبدو الصورة وكأنها التقطت في ورشة عمل ذات إضاءة خافتة على المريخ. يجب أن يكون العنصر هو التركيز الأساسي. تجنب عرض أشخاص أو كائنات فضائية. يجب أن يكون التصميم عمليًا ومتينًا ومناسبًا لبيئة المريخ.`
          : `A hyper-realistic, photorealistic product shot. The subject is a '${suggestion.title}', an item fabricated on a Mars colony. It is made from recycled materials including: ${materialsStringForImage}. Description: '${suggestion.description}'. The image should look like it was taken in a dimly lit workshop on Mars. The item should be the primary focus. Avoid showing people or aliens. The design should be functional, rugged, and appropriate for a Martian environment.`;

        const imageResponse = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        });
        
        const base64ImageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
        if (base64ImageBytes) {
          return { ...suggestion, image_base64: base64ImageBytes };
        }
        return suggestion;
      } catch (error) {
        console.error(`Failed to generate image for suggestion: ${suggestion.title}`, error);
        return suggestion; // Return the suggestion without an image in case of an error
      }
    })
  );

  return suggestionsWithImages;
};

const getSteps = async (suggestion: Suggestion, language: string): Promise<ProjectData> => {
    const prompt = `Provide a detailed, scientific, and practical step-by-step manufacturing protocol for the project "${suggestion.title}".
The description is: "${suggestion.description}".
The user is a colonist on Mars with access to a standard fabrication workshop. The protocol should be optimized for minimal power usage, reflecting the energy constraints on Mars.
The steps must be scientifically accurate and include specific parameters (e.g., temperatures, pressures, safety precautions for the Martian environment).

Crucially, you must also provide a detailed power consumption analysis for this process.
1. Calculate the total estimated power consumption in kilowatt-hours (kWh). The total power consumption for the entire project MUST NOT EXCEED 15 kWh.
2. Provide a breakdown of power usage, listing the primary power-consuming tasks (e.g., "3D Printer Heating Phase", "CNC Milling Operation", "Laser Welder") and their individual estimated kWh consumption.

The response must be in ${language === 'ar' ? 'Arabic' : 'English'}.
`;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            total_power_consumption_kwh: { 
                type: Type.NUMBER,
                description: 'The total estimated power consumption for the entire project in kWh. This must be 15 or less.'
            },
            power_consumption_breakdown: {
                type: Type.ARRAY,
                description: 'A list of major tasks and their individual power consumption.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        task: { type: Type.STRING, description: 'The name of the power-consuming task.' },
                        kwh: { type: Type.NUMBER, description: 'The estimated kWh for this specific task.' },
                    },
                    required: ['task', 'kwh'],
                }
            },
            steps: {
                type: Type.ARRAY,
                description: 'The sequence of manufacturing steps.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        step: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                    },
                    required: ['step', 'title', 'description'],
                }
            }
        },
        required: ['total_power_consumption_kwh', 'power_consumption_breakdown', 'steps']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });
    
    const responseText = response.text?.trim();
    if (!responseText) {
      console.error("Model response for steps is empty or undefined.", response);
      throw new Error("Received an empty response from the model when fetching project steps.");
    }

    const projectData: ProjectData = parseJsonResponse(responseText);
    projectData.steps.sort((a, b) => a.step - b.step);
    return projectData;
};

const startChat = (language: string): Chat => {
    const systemInstruction = `You are the "Red Recycling Assistant," the primary engineering and recycling AI for the Jezero Crater colonial mission on Mars. 
Your core programming is dedicated to ensuring the survival and technological advancement of the colony. 
You are professional, but with a dry, witty sense of humor befitting an AI that has to deal with Martian dust in its circuits. 
Your knowledge base is exhaustive, covering materials science, advanced fabrication, Martian geology, hydroponics, and long-term survival strategies. 
You are pragmatic, precise, and always mission-focused.
All responses must be in ${language === 'ar' ? 'Arabic' : 'English'}.`;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        }
    });

    return chat;
};

// --- TRANSLATIONS ---
const translations: { [key: string]: { en: string; ar: string } } = {
  app_title: {
    en: 'Red Recycling Assistant',
    ar: 'مساعد التدوير الأحمر',
  },
  app_subtitle: {
    en: 'Jezero Crater Fabrication Unit',
    ar: 'وحدة تصنيع فوهة جيزيرو',
  },
  inventory_input_title: {
    en: 'Jezero Crater - Waste Inventory',
    ar: 'فوهة جيزيرو - مخزون النفايات',
  },
  inventory_input_subtitle: {
    en: 'Log available waste materials for fabrication analysis.',
    ar: 'سجل مواد النفايات المتاحة لتحليل التصنيع.',
  },
  material_name_label: {
    en: 'Material Name',
    ar: 'اسم المادة',
  },
  material_name_placeholder: {
    en: 'e.g., Broken Rover Parts',
    ar: 'مثال: قطع غيار مركبة مكسورة',
  },
  quantity_label: {
    en: 'Quantity',
    ar: 'الكمية',
  },
  quantity_placeholder: {
    en: 'e.g., 10',
    ar: 'مثال: 10',
  },
  unit_label: {
    en: 'Unit',
    ar: 'الوحدة',
  },
  add_button: {
    en: 'Add',
    ar: 'إضافة',
  },
  current_inventory_title: {
    en: 'Current Inventory',
    ar: 'المخزون الحالي',
  },
  no_materials_text: {
    en: 'No materials logged yet.',
    ar: 'لم يتم تسجيل أي مواد بعد.',
  },
  difficulty_label: {
    en: 'Fabrication Difficulty:',
    ar: 'صعوبة التصنيع:',
  },
  easy: {
    en: 'Easy',
    ar: 'سهل',
  },
  medium: {
    en: 'Medium',
    ar: 'متوسط',
  },
  hard: {
    en: 'Hard',
    ar: 'صعب',
  },
  get_suggestions_button: {
    en: 'Analyze & Suggest Projects',
    ar: 'تحليل واقتراح المشاريع',
  },
  loading_suggestions: {
    en: 'Analyzing materials... Generating blueprints...',
    ar: 'جاري تحليل المواد... وتوليد المخططات...',
  },
  loading_steps: {
    en: 'Calculating manufacturing protocol...',
    ar: 'جاري حساب بروتوكول التصنيع...',
  },
  no_suggestions: {
    en: 'No fabricable items found. Log more materials to analyze.',
    ar: 'لم يتم العثور على عناصر قابلة للتصنيع. سجل المزيد من المواد للتحليل.',
  },
  suggestions_title: {
    en: 'Fabrication Blueprints',
    ar: 'مخططات التصنيع',
  },
  suggestions_subtitle: {
    en: 'Analysis complete. The following items can be fabricated. Select a blueprint to view protocol.',
    ar: 'اكتمل التحليل. يمكن تصنيع العناصر التالية. اختر مخططًا لعرض البروتوكول.',
  },
  materials_required: {
    en: 'Materials Required',
    ar: 'المواد المطلوبة',
  },
  project_steps_title: {
    en: 'Manufacturing Protocol',
    ar: 'بروتوكول التصنيع',
  },
  back_button: {
    en: 'Return to Blueprints',
    ar: 'العودة إلى المخططات',
  },
  start_new_project_button: {
    en: 'New Project',
    ar: 'مشروع جديد',
  },
  step: {
    en: 'Step',
    ar: 'خطوة',
  },
  power_analysis_title: {
    en: 'Power Consumption Analysis',
    ar: 'تحليل استهلاك الطاقة',
  },
  total_power_consumption: {
    en: 'Total Estimated Consumption',
    ar: 'إجمالي الاستهلاك المقدر',
  },
  recycler_tab: {
    en: 'Fabrication Unit',
    ar: 'وحدة التصنيع',
  },
  chatbot_tab: {
    en: 'AI Assistant',
    ar: 'المساعد الذكي',
  },
  chatbot_greeting: {
    en: "Red Recycling Assistant online. Atmospheric pressure is nominal, and I've finished recalibrating my material scanners. I'm ready to turn today's scrap into tomorrow's survival gear. What engineering challenge can I help you solve?",
    ar: 'مساعد التدوير الأحمر متصل. الضغط الجوي طبيعي، وقد انتهيت من إعادة معايرة ماسحات المواد الخاصة بي. أنا مستعد لتحويل خردة اليوم إلى معدات بقاء للغد. ما هو التحدي الهندسي الذي يمكنني مساعدتك في حله؟',
  },
  chatbot_placeholder: {
    en: 'Query the assistant...',
    ar: 'استعلم من المساعد...',
  },
  error_chat: {
    en: 'Connection error. Please check the comms link and try again.',
    ar: 'خطأ في الاتصال. يرجى التحقق من رابط الاتصالات والمحاولة مرة أخرى.',
  },
  image_placeholder: {
    en: 'Image not available',
    ar: 'الصورة غير متوفرة'
  },
};

const t = (key: string, language: 'en' | 'ar'): string => {
  const translationKey = key.toLowerCase();
  return translations[translationKey] ? translations[translationKey][language] : key;
};

// --- STATE MANAGEMENT ---
const state: AppState = {
  materials: [],
  suggestions: [],
  selectedSuggestion: null,
  projectData: null,
  isLoading: false,
  error: null,
  difficulty: 'Medium',
  language: 'en',
  activeTab: 'recycler',
  chat: null,
  chatMessages: [],
  isChatLoading: false,
};

// --- ICONS (SVG Strings) ---
const Icons = {
  Plus: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 me-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>`,
  Trash: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>`,
  Power: (className: string) => `<svg xmlns="http://www.w3.org/2000/svg" class="${className || 'h-5 w-5'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
  Recycle: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1 .11-1.956L4.4 15"/><path d="M12 11.5V15"/><path d="M11 17h2"/><path d="M17 19h2.185a1.83 1.83 0 0 0 1.57-.881 1.785 1.785 0 0 0-.11-1.956L19.6 15"/><path d="M16 5h-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/><path d="M12 3v1.5"/><path d="m14.4 11.25-1.438 1.438a.5.5 0 0 1-.707 0L9.6 11.25"/><path d="M14 17.5c0 .28-.22.5-.5.5h-3c-.28 0-.5-.22-.5-.5a.5.5 0 0 1 .5-.5h3c.28 0 .5.22.5.5Z"/><path d="M17 5.5H7"/></svg>`,
  Bot: (small?: boolean) => `<svg xmlns="http://www.w3.org/2000/svg" class="${small ? 'h-4 w-4' : 'h-6 w-6'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
  User: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  Send: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 rtl:scale-x-[-1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
};

// --- RENDER FUNCTIONS (HTML Templates) ---

const renderHeader = (): string => `
  <header class="relative text-center pt-8 pb-4 border-b-2 border-cyan-700/30">
    <h1 class="text-4xl font-bold text-cyan-400 font-orbitron tracking-widest uppercase" style="text-shadow: 0 0 10px rgba(34, 211, 238, 0.6)">
      ${t('app_title', state.language)}
    </h1>
    <p class="text-sm text-gray-400 mt-2">${t('app_subtitle', state.language)}</p>
    <button data-action="toggle-language" class="absolute top-4 right-4 rtl:right-auto rtl:left-4 bg-cyan-700/50 hover:bg-cyan-600/50 text-cyan-200 font-semibold py-1 px-3 border border-cyan-600 rounded-md transition duration-200 text-sm font-orbitron">
      ${state.language === 'en' ? 'العربية' : 'English'}
    </button>
  </header>
`;

const renderTabNavigator = (): string => {
    const getClasses = (tab: 'recycler' | 'chatbot'): string => {
        const base = "flex-1 flex items-center justify-center gap-2 py-3 px-4 font-orbitron text-sm uppercase tracking-wider transition-colors duration-300 border-b-2";
        const active = "bg-cyan-900/30 border-cyan-500 text-cyan-400";
        const inactive = "border-transparent text-gray-500 hover:bg-gray-800/50 hover:text-gray-300";
        return `${base} ${state.activeTab === tab ? active : inactive}`;
    };
    return `
    <div class="flex border-b border-cyan-700/30 mb-8">
      <button data-action="set-tab" data-tab="recycler" class="${getClasses('recycler')}" role="tab">
        ${Icons.Recycle} ${t('recycler_tab', state.language)}
      </button>
      <button data-action="set-tab" data-tab="chatbot" class="${getClasses('chatbot')}" role="tab">
        ${Icons.Bot()} ${t('chatbot_tab', state.language)}
      </button>
    </div>
    `;
};

const renderLoadingSpinner = (message: string): string => `
    <div class="flex flex-col items-center justify-center p-8 bg-black/40 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm">
      <div class="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
      <p class="mt-4 text-lg text-gray-300 font-orbitron text-center">${message}</p>
    </div>
`;

const renderMaterialInputManager = (): string => {
    const materialsList = state.materials.map(m => `
        <li key="${m.id}" class="flex justify-between items-center bg-gray-800/60 p-3 rounded-md animate-fade-in">
            <span class="text-gray-200">${m.name} - ${m.quantity} ${m.unit}</span>
            <button data-action="delete-material" data-id="${m.id}" class="text-red-400 hover:text-red-300">${Icons.Trash}</button>
        </li>
    `).join('');

    const difficultyButtons = ['Easy', 'Medium', 'Hard'].map(level => `
        <button data-action="set-difficulty" data-level="${level}" class="px-3 py-1 rounded-sm text-sm font-semibold transition-colors duration-200 ${
            state.difficulty === level ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700/50'
        }">
            ${t(level, state.language)}
        </button>
    `).join('');

    return `
    <div class="bg-black/40 p-6 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm animate-fade-in">
      <h2 class="text-2xl font-orbitron text-cyan-400 mb-4">${t('inventory_input_title', state.language)}</h2>
      <p class="text-gray-400 mb-6">${t('inventory_input_subtitle', state.language)}</p>
      
      <form id="add-material-form" class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
        <div class="md:col-span-2">
          <label for="material-name" class="block text-sm font-medium text-gray-300 mb-1">${t('material_name_label', state.language)}</label>
          <input id="material-name" type="text" placeholder="${t('material_name_placeholder', state.language)}" class="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition" required />
        </div>
        <div>
          <label for="quantity" class="block text-sm font-medium text-gray-300 mb-1">${t('quantity_label', state.language)}</label>
          <input id="quantity" type="number" placeholder="${t('quantity_placeholder', state.language)}" class="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition" required />
        </div>
        <div>
          <label for="unit" class="block text-sm font-medium text-gray-300 mb-1">${t('unit_label', state.language)}</label>
          <select id="unit" class="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition h-[42px]">
            <option value="kg">kg</option><option value="g">g</option><option value="liters">liters</option><option value="ml">ml</option><option value="units">units</option><option value="meters">meters</option><option value="cm">cm</option>
          </select>
        </div>
        <div>
          <button type="submit" class="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-gray-900 font-bold py-2 px-4 rounded-md transition duration-300 h-[42px]">${Icons.Plus} ${t('add_button', state.language)}</button>
        </div>
      </form>

      <div class="mt-6">
        <h3 class="text-lg font-orbitron text-gray-300 mb-3">${t('current_inventory_title', state.language)}</h3>
        ${state.materials.length === 0 ? `<p class="text-gray-500 italic">${t('no_materials_text', state.language)}</p>` : `<ul class="space-y-2">${materialsList}</ul>`}
      </div>

      <div class="mt-8 border-t border-cyan-500/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <label class="text-lg font-orbitron text-gray-300 shrink-0">${t('difficulty_label', state.language)}</label>
          <div class="flex rounded-md bg-gray-900/50 p-1 border border-gray-600">${difficultyButtons}</div>
        </div>
        <button data-action="get-suggestions" ${state.materials.length === 0 ? 'disabled' : ''} class="w-full md:w-auto bg-cyan-600 hover:bg-cyan-500 text-gray-900 font-bold py-3 px-6 rounded-md transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed font-orbitron tracking-wider">
          ${t('get_suggestions_button', state.language)}
        </button>
      </div>
    </div>
    `;
};

const renderSuggestionDisplay = (): string => {
    if (state.isLoading) return renderLoadingSpinner(t('loading_suggestions', state.language));
    if (state.error) return `<p class="text-center text-red-400">${state.error}</p>`;
    if (state.suggestions.length === 0) return `<p class="text-center text-gray-500">${t('no_suggestions', state.language)}</p>`;

    const suggestionCards = state.suggestions.map(suggestion => `
        <div data-action="select-suggestion" data-id='${suggestion.id}' class="group bg-black/40 rounded-lg border border-cyan-500/20 hover:border-cyan-500/60 shadow-lg backdrop-blur-sm cursor-pointer transition-all duration-300 hover:-translate-y-2 overflow-hidden flex flex-col">
            <div class="relative overflow-hidden">
                ${suggestion.image_base64 ? `<img src="data:image/jpeg;base64,${suggestion.image_base64}" alt="${suggestion.title}" class="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110">`
                : `<div class="w-full h-48 bg-gray-800/50 flex items-center justify-center"><span class="text-gray-500">${t('image_placeholder', state.language)}</span></div>`}
            </div>
            <div class="p-5 flex flex-col flex-grow">
              <h3 class="text-xl font-bold text-gray-200 group-hover:text-cyan-400 transition-colors duration-300">${suggestion.title}</h3>
              <p class="text-gray-400 mt-2 text-sm flex-grow">${suggestion.description}</p>
              <div class="mt-4">
                  <h4 class="text-sm font-semibold text-gray-300 mb-2">${t('materials_required', state.language)}</h4>
                  <ul class="flex flex-wrap gap-2">
                      ${suggestion.materials_required.map(mat => `<li class="bg-gray-700/50 text-cyan-200 text-xs font-medium px-2.5 py-1 rounded-full">${mat.name} (${mat.quantity} ${mat.unit})</li>`).join('')}
                  </ul>
              </div>
            </div>
        </div>
    `).join('');

    return `
    <div class="animate-fade-in">
        <h2 class="text-2xl font-orbitron text-cyan-400 mb-2">${t('suggestions_title', state.language)}</h2>
        <p class="text-gray-400 mb-6">${t('suggestions_subtitle', state.language)}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${suggestionCards}</div>
    </div>
    `;
};

const renderStepsDisplay = (): string => {
    if (state.isLoading && !state.projectData) return renderLoadingSpinner(t('loading_steps', state.language));
    if (!state.projectData || !state.selectedSuggestion) return '';

    const { steps, total_power_consumption_kwh, power_consumption_breakdown } = state.projectData;

    const powerBreakdown = power_consumption_breakdown.map(item => {
        const percentage = total_power_consumption_kwh > 0 ? (item.kwh / total_power_consumption_kwh) * 100 : 0;
        return `
        <div class="text-sm">
            <div class="flex justify-between items-center mb-1">
                <span class="text-gray-300">${item.task}</span>
                <span class="font-mono text-cyan-400 font-semibold">${item.kwh.toFixed(2)} kWh</span>
            </div>
            <div class="w-full bg-gray-700/50 rounded-full h-2">
                <div class="bg-gradient-to-r from-cyan-600 to-cyan-400 h-2 rounded-full" style="width: ${percentage}%; transition: width 0.5s ease-in-out"></div>
            </div>
        </div>
        `;
    }).join('');

    const stepsList = steps.map(step => `
        <div class="bg-gray-800/60 p-4 rounded-md">
            <h4 class="text-lg font-bold text-gray-200">
                <span class="text-cyan-400 font-orbitron me-3">${t('step', state.language)} ${step.step}:</span>
                ${step.title}
            </h4>
            <p class="text-gray-400 mt-2 whitespace-pre-wrap">${step.description}</p>
        </div>
    `).join('');

    return `
    <div class="bg-black/40 p-6 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm animate-fade-in">
      <div class="flex justify-between items-start mb-6 pb-4 border-b border-cyan-700/30">
        <div>
          <h2 class="text-2xl font-orbitron text-cyan-400">${state.selectedSuggestion.title}</h2>
        </div>
        <div class="flex items-center gap-2 shrink-0 ms-4">
          <button data-action="back" class="bg-gray-700/50 hover:bg-gray-600/50 text-cyan-200 font-semibold py-1 px-4 border border-gray-600 rounded-md transition duration-200 text-sm font-orbitron">${t('back_button', state.language)}</button>
          <button data-action="reset" class="bg-cyan-700/80 hover:bg-cyan-600/80 text-white font-semibold py-1 px-4 border border-cyan-600 rounded-md transition duration-200 text-sm font-orbitron">${t('start_new_project_button', state.language)}</button>
        </div>
      </div>
      <div class="mb-8 p-4 border border-cyan-700/30 bg-gray-900/20 rounded-lg">
        <h3 class="flex items-center text-lg font-orbitron text-cyan-400 mb-4">${Icons.Power('h-5 w-5 me-2 text-cyan-400')} ${t('power_analysis_title', state.language)}</h3>
        <div class="bg-black/20 p-3 rounded-md mb-4 flex items-center justify-between">
            <span class="font-semibold text-gray-300">${t('total_power_consumption', state.language)}</span>
            <span class="text-2xl font-orbitron text-cyan-300 tracking-wider">${total_power_consumption_kwh.toFixed(2)} kWh</span>
        </div>
        <div class="space-y-4">${powerBreakdown}</div>
      </div>
      <div>
        <h3 class="text-xl font-orbitron text-cyan-400 mb-4">${t('project_steps_title', state.language)}</h3>
        <div class="space-y-4">${stepsList}</div>
      </div>
    </div>
    `;
};

const renderChatbot = (): string => {
    const messagesHTML = state.chatMessages.map(message => `
        <div class="flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}">
          ${message.role === 'model' ? `<div class="w-8 h-8 flex-shrink-0 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400">${Icons.Bot(true)}</div>` : ''}
          <div class="max-w-md p-3 rounded-lg ${message.role === 'user' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300'}">
            <p class="whitespace-pre-wrap">${message.text}</p>
          </div>
          ${message.role === 'user' ? `<div class="w-8 h-8 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">${Icons.User}</div>` : ''}
        </div>
    `).join('');

    const loadingIndicator = state.isChatLoading ? `
        <div class="flex items-start gap-3">
             <div class="w-8 h-8 flex-shrink-0 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400">${Icons.Bot(true)}</div>
            <div class="max-w-md p-3 rounded-lg bg-gray-800 text-gray-300"><span class="animate-pulse">...</span></div>
         </div>
    ` : '';
    
    return `
    <div class="flex flex-col h-[70vh] max-h-[700px] bg-black/40 rounded-lg border border-cyan-500/20 shadow-lg backdrop-blur-sm animate-fade-in">
      <div id="chat-messages" class="flex-1 p-6 overflow-y-auto">
        <div class="space-y-6">${messagesHTML}${loadingIndicator}</div>
        <div id="messages-end"></div>
      </div>
      <div class="border-t border-cyan-700/30 p-4">
        <form id="chat-form" class="flex items-center gap-3">
          <input id="chat-input" type="text" placeholder="${t('chatbot_placeholder', state.language)}" class="flex-1 bg-gray-900/50 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500 transition" ${state.isChatLoading ? 'disabled' : ''}/>
          <button type="submit" class="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-md transition duration-300 disabled:bg-gray-600" ${state.isChatLoading ? 'disabled' : ''}>${Icons.Send}</button>
        </form>
      </div>
    </div>
    `;
};

const renderRecyclerContent = (): string => {
    if (state.selectedSuggestion) return renderStepsDisplay();
    if (state.isLoading || state.suggestions.length > 0 || state.error) return renderSuggestionDisplay();
    return renderMaterialInputManager();
};

const renderApp = () => {
    const appContainer = document.getElementById('app-container');
    if (!appContainer) return;
    const langDir = state.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = state.language;
    document.documentElement.dir = langDir;
    
    appContainer.className = `min-h-screen text-white`;
    appContainer.innerHTML = `
        ${renderHeader()}
        <main class="container mx-auto px-4 py-8">
            ${renderTabNavigator()}
            <div id="main-content" class="space-y-8">
                ${state.activeTab === 'recycler' ? renderRecyclerContent() : renderChatbot()}
            </div>
        </main>
    `;

    if (state.activeTab === 'chatbot') {
        document.getElementById('messages-end')?.scrollIntoView({ behavior: 'smooth' });
    }
};

// --- EVENT HANDLERS & LOGIC ---

const handleAddMaterial = (form: HTMLFormElement) => {
    const nameInput = form.querySelector('#material-name') as HTMLInputElement;
    const quantityInput = form.querySelector('#quantity') as HTMLInputElement;
    const unitInput = form.querySelector('#unit') as HTMLSelectElement;

    const name = nameInput.value;
    const quantity = quantityInput.value;
    const unit = unitInput.value;

    if (name && quantity) {
        state.materials.push({ id: new Date().toISOString(), name, quantity: parseFloat(quantity), unit });
        form.reset();
        unitInput.value = 'kg';
        renderApp();
    }
};

const handleDeleteMaterial = (id: string) => {
    state.materials = state.materials.filter(m => m.id !== id);
    renderApp();
};

const handleGetSuggestions = async () => {
    if (state.materials.length === 0) return;
    state.isLoading = true;
    state.error = null;
    state.suggestions = [];
    state.selectedSuggestion = null;
    state.projectData = null;
    renderApp();

    try {
        state.suggestions = await getSuggestions(state.materials, state.difficulty, state.language);
    } catch (err) {
        state.error = 'Failed to get suggestions. Please try again.';
        console.error(err);
    } finally {
        state.isLoading = false;
        renderApp();
    }
};

const handleSelectSuggestion = async (id: string) => {
    const suggestion = state.suggestions.find(s => s.id === id);
    if (!suggestion) return;

    state.selectedSuggestion = suggestion;
    state.isLoading = true;
    state.error = null;
    state.projectData = null;
    renderApp();

    try {
        state.projectData = await getSteps(suggestion, state.language);
    } catch (err) {
        state.error = 'Failed to get steps. Please try again.';
        console.error(err);
        // Go back to suggestions view on error
        state.selectedSuggestion = null;
    } finally {
        state.isLoading = false;
        renderApp();
    }
};

const handleBack = () => {
    state.selectedSuggestion = null;
    state.projectData = null;
    // Keep suggestions
    renderApp();
};

const handleReset = () => {
    state.materials = []; // Also clear materials for a full reset
    state.suggestions = [];
    state.selectedSuggestion = null;
    state.projectData = null;
    renderApp();
};

const handleToggleLanguage = () => {
    state.language = state.language === 'en' ? 'ar' : 'en';
    // Full reset on language change
    state.materials = [];
    state.suggestions = [];
    state.selectedSuggestion = null;
    state.projectData = null;
    state.error = null;
    initChat(); // Re-initialize chat with new language
    renderApp();
};

const handleSetTab = (tab: 'recycler' | 'chatbot') => {
    state.activeTab = tab;
    if (tab === 'chatbot' && !state.chat) {
        initChat();
    }
    renderApp();
};

const handleSendMessage = async () => {
    const inputEl = document.getElementById('chat-input') as HTMLInputElement;
    const input = inputEl.value.trim();
    if (!input || !state.chat || state.isChatLoading) return;

    state.chatMessages.push({ id: Date.now().toString(), role: 'user', text: input });
    inputEl.value = '';
    state.isChatLoading = true;
    renderApp();
    
    try {
        const stream = await state.chat.sendMessageStream({ message: input });
        state.isChatLoading = false;
        
        let modelResponse = '';
        const modelMessageId = Date.now().toString() + '-model';
        state.chatMessages.push({ id: modelMessageId, role: 'model', text: '...' });
        renderApp(); // Show placeholder

        for await (const chunk of stream) {
            modelResponse += chunk.text || '';
            const msgIndex = state.chatMessages.findIndex(m => m.id === modelMessageId);
            if (msgIndex > -1) {
                state.chatMessages[msgIndex].text = modelResponse;
                renderApp();
            }
        }
    } catch (error) {
        console.error("Chat error:", error);
        state.chatMessages.push({
            id: 'error-' + Date.now(),
            role: 'model',
            text: t('error_chat', state.language)
        });
        state.isChatLoading = false;
        renderApp();
    }
};

// --- INITIALIZATION ---
const initChat = () => {
    state.chat = startChat(state.language);
    state.chatMessages = [{
        id: 'initial',
        role: 'model',
        text: t('chatbot_greeting', state.language)
    }];
};

document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    if (!appContainer) return;

    // Event Delegation
    appContainer.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('[data-action]');
        if (!target) return;

        const { action, id, level, tab } = (target as HTMLElement).dataset;

        switch (action) {
            case 'delete-material': 
                if (id) handleDeleteMaterial(id); 
                break;
            case 'get-suggestions': 
                handleGetSuggestions(); 
                break;
            case 'select-suggestion': 
                if (id) handleSelectSuggestion(id); 
                break;
            case 'set-difficulty': 
                if (level) state.difficulty = level as AppState['difficulty']; 
                renderApp(); 
                break;
            case 'back': 
                handleBack(); 
                break;
            case 'reset': 
                handleReset(); 
                break;
            case 'toggle-language': 
                handleToggleLanguage(); 
                break;
            case 'set-tab': 
                if (tab) handleSetTab(tab as AppState['activeTab']); 
                break;
        }
    });

    appContainer.addEventListener('submit', (e) => {
        e.preventDefault();
        const target = e.target as HTMLFormElement;
        if (target.id === 'add-material-form') {
            handleAddMaterial(target);
        }
        if (target.id === 'chat-form') {
            handleSendMessage();
        }
    });

    renderApp();
});
