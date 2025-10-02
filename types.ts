export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  materials_required: {
    name: string;
    quantity: number;
    unit: string;
  }[];
}

export interface Step {
  step: number;
  title: string;
  description: string;
}

export interface PowerConsumptionDetail {
  task: string;
  kwh: number;
}

export interface ProjectStepsResponse {
  total_power_consumption_kwh: number;
  power_consumption_breakdown: PowerConsumptionDetail[];
  steps: Step[];
}

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export type Language = 'en' | 'ar';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}