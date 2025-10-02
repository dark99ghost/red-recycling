import { Language } from '../types';

type Translations = {
  [key: string]: {
    en: string;
    ar: string;
  };
};

const translations: Translations = {
  app_title: {
    en: 'Red Recycling Assistant',
    ar: 'مساعد التدوير الأحمر',
  },
  app_subtitle: {
    en: 'Engineering solutions for the Martian frontier.',
    ar: 'حلول هندسية لحدود المريخ.',
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
    en: 'Analyzing materials... Cross-referencing colony needs...',
    ar: 'جاري تحليل المواد... ومقارنتها باحتياجات المستعمرة...',
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
};

export const t = (key: string, language: Language): string => {
  return translations[key] ? translations[key][language] : key;
};