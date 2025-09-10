export enum QuestionInputType {
  SINGLE_SELECT_RADIO = "SINGLE_SELECT_RADIO",
  SINGLE_SELECT_DROPDOWN = "SINGLE_SELECT_DROPDOWN",
  MULTI_SELECT_CHECKBOX = "MULTI_SELECT_CHECKBOX",
  TEXT_INPUT = "TEXT_INPUT",
  NUMBER_INPUT = "NUMBER_INPUT",
}

// Corresponds to the language object nested in translations
export interface Language {
  id: number;
  code: string;
  name: string;
  is_default?: number | boolean; // API doc shows 0 or 1, frontend might use boolean
  is_active?: number | boolean;  // API doc shows 0 or 1, frontend might use boolean
}

// Translation for QuestionOption
export interface OptionTranslation {
  id: number;
  optionId: number;
  languageId: number;
  title: string;
  language?: Language; // Included if API provides it
}

export interface QuestionOption {
  id: number; // Changed to number
  questionId?: number; // Present in API response
  key?: string;
  title: string;
  priceModifier?: number; // Optional in API response
  icon?: string | null;
  isDefault?: boolean;
  orderNo?: number; // API uses orderNo
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  translations?: OptionTranslation[];
}

// Translation for IndividualQuestion
export interface QuestionTranslation {
  id: number;
  questionId: number;
  languageId: number;
  title: string;
  tooltip?: string | null;
  category?: string | null; // Category can also be translated
  language?: Language; // Included if API provides it
}

export interface IndividualQuestion {
  id: number; // Changed to number
  questionSetId?: number; // Present in API response
  key?: string;
  title: string;
  inputType: QuestionInputType;
  tooltip?: string | null;
  category?: string | null;
  isRequired: boolean;
  orderNo?: number; // API uses orderNo
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  options: QuestionOption[];
  translations?: QuestionTranslation[];
}

// Translation for QuestionSet
export interface QuestionSetTranslation {
  id: number;
  questionSetId: number;
  languageId: number;
  displayName: string;
  description?: string | null;
  language?: Language; // Included if API provides it
}

export interface QuestionSet {
  id: number; // Changed to number
  internalName: string;
  displayName: string;
  description?: string | null;
  client_id: number; // Added from API doc
  createdAt?: string;
  updatedAt?: string;
  questions: IndividualQuestion[];
  translations?: QuestionSetTranslation[];
}

export interface DeviceModelQuestionSetAssignment {
  id?: number; // Assignment ID from API response
  deviceId: number; // Changed to number, assuming modelId is numeric
  questionSetId: number; // Changed to number
  assignmentOrder?: number;
  // API response includes nested model and questionSet objects, omitted for brevity here
  // but can be added if needed for frontend state.
  // model?: Partial<DeviceModel>; // Assuming DeviceModel type exists
  // questionSet?: Partial<QuestionSet>; 
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionSetRow {
  id: number; // Changed to number
  internalName: string;
  displayName: string;
  description?: string | null;
  client_id: number; // Added
  questionCount: number;
  createdAt?: string;
  updatedAt?: string;
} 