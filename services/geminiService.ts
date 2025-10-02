import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Material, Suggestion, Difficulty, Language, ProjectStepsResponse } from '../types';

// The API key is injected during the build process by Vite.
// See vite.config.ts for the configuration.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseJsonResponse = <T>(jsonString: string): T => {
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

export const getSuggestions = async (materials: Material[], difficulty: Difficulty, language: Language): Promise<Suggestion[]> => {
  const materialsString = materials.map(m => `${m.name}: ${m.quantity} ${m.unit}`).join(', ');
  const prompt = `You are an engineering AI for a Mars colony. Your task is to help colonists recycle available waste materials into useful items. 
Based on the following inventory from the Jezero Crater base: [${materialsString}], suggest 3 practical projects vital for survival or colony maintenance.
The colonist has requested projects with a difficulty level of "${difficulty}".
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
  
  const responseText = response.text;
  if (!responseText) {
    console.error("Model response for suggestions is empty or undefined.", response);
    throw new Error("Received an empty response from the model when fetching suggestions.");
  }

  const suggestions = parseJsonResponse<Suggestion[]>(responseText.trim());
  return suggestions;
};

export const getSteps = async (suggestion: Suggestion, language: Language): Promise<ProjectStepsResponse> => {
    const prompt = `Provide a detailed, scientific, and practical step-by-step manufacturing protocol for the project "${suggestion.title}".
The description is: "${suggestion.description}".
The user is a colonist on Mars with access to a standard fabrication workshop.
The steps must be scientifically accurate and include specific parameters (e.g., temperatures, pressures, safety precautions for the Martian environment).

Crucially, you must also provide a detailed power consumption analysis for this process.
1. Calculate the total estimated power consumption in kilowatt-hours (kWh).
2. Provide a breakdown of power usage, listing the primary power-consuming tasks (e.g., "3D Printer Heating Phase", "CNC Milling Operation", "Laser Welder") and their individual estimated kWh consumption.

The response must be in ${language === 'ar' ? 'Arabic' : 'English'}.
`;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            total_power_consumption_kwh: { 
                type: Type.NUMBER,
                description: 'The total estimated power consumption for the entire project in kWh.'
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
    
    const responseText = response.text;
    if (!responseText) {
      console.error("Model response for steps is empty or undefined.", response);
      throw new Error("Received an empty response from the model when fetching project steps.");
    }

    const projectData = parseJsonResponse<ProjectStepsResponse>(responseText.trim());
    projectData.steps.sort((a, b) => a.step - b.step);
    return projectData;
};

export const startChat = (language: Language): Chat => {
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