import { PaperDimensionsInch, TestResult, PlaceholderStates } from '../types/editor.types';

// Paper sizes in inches
export const PAPER_SIZES_INCH: { [name: string]: PaperDimensionsInch } = {
  'Label_4x6': { width: 4, height: 6 },
  'Label_4x3': { width: 4, height: 3 },
  'Label_4x2': { width: 4, height: 2 },
  'Label_3x2': { width: 3, height: 2 },
  'Label_3x1': {width: 3, height: 1},
  'Label_2.25x1.25': { width: 2.25, height: 1.25 },
  'Letter': { width: 8.5, height: 11 },
  'A4': { width: 8.27, height: 11.69 },
  'Custom': { width: 4, height: 6 } // Will be updated dynamically
};

// Default values
export const DEFAULT_VALUES = {
  DPI: 96,
  PAGE_WIDTH_INCHES: 4,
  PAGE_HEIGHT_INCHES: 6,
  SELECTED_PAPER_SIZE: 'Label_4x6',
  PAPER_ORIENTATION: 'portrait' as const,
  SELECTED_COLOR: '#000000',
  DEFAULT_TEXT_PLACEHOLDER: 'Click to edit text',
  FONT_SIZE: 20,
  FONT_FAMILY: 'Calibri',
  TEXT_MIN_WIDTH: 0,
  TEXT_MIN_HEIGHT: 0,
  MM_PER_INCH: 25.4,
  LIST_SEPARATOR: 10
};

// Sample test results for placeholders
export const SAMPLE_TEST_RESULTS: TestResult[] = [
  { name: 'Battery Health', status: 'passed' },
  { name: 'Camera Function', status: 'passed' },
  { name: 'WiFi Connectivity', status: 'failed' },
  { name: 'Bluetooth', status: 'passed' },
  { name: 'Touch Response', status: 'passed' },
  { name: 'Audio Output', status: 'passed' },
  { name: 'Charging Port', status: 'failed' },
  { name: 'Face ID/Touch ID', status: 'passed' }
];

// Placeholder states
export const PLACEHOLDER_STATES: PlaceholderStates = {
  ORIGINAL: 'original',
  PREVIEW: 'preview'
};

// Sample data for placeholders
export const SAMPLE_PLACEHOLDER_DATA: { [key: string]: string } = {
  'Customer.Name': 'John Smith',
  'Device.Model': 'iPhone 13 Pro',
  'Device.SerialNumber': 'SN-2023-A45B77C',
  'Date.Current': new Date().toLocaleDateString(),
  'Test.Result': 'PASSED'
};

// Sample values for placeholders
export const PLACEHOLDER_SAMPLE_VALUES = {
  customer: {
    name: 'CircTek Industries',
    address: '123 Tech Boulevard, Amsterdam',
    email: 'info@circtek.com',
    phone: '+31 20 123 4567'
  },
  device: {
    name: 'CircTek Pro 2000',
    serial: 'CT-2023-0042-XYZ',
    model: 'Pro 2000 Series',
    status: 'Operational',
    qrcode: '[QR Code]'
  },
  service: {
    type: 'Premium Maintenance',
    date: '15 April 2025',
    technician: 'Jan Janssen'
  },
  test: {
    results: '[Test Results Table]',
    summary: 'Passed 5 tests with 1 error',
    date: '01 April 2025'
  }
};

// Text editor constants
export const TEXT_EDITOR_CONFIG = {
  FONT_SIZES: [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36],
  SAMPLE_TEXTS: [
    'This is sample content for preview.',
    'The device passed all initial diagnostics.',
    'Generated Report - Confidential',
    'Notes: Ensure all connections are secure.',
    'Final Check Performed.',
    'System Status: Operational',
    'User Signature Placeholder'
  ],
  Z_INDEX: '10000',
  // Fixed editor width to keep toolbar buttons visible
  EDITOR_WIDTH: 380,
  CONTAINER_STYLE: {
    borderRadius: '4px',
    background: 'white',
    border: '2px solid #3a86ff'
  }
};

// Shape default dimensions
export const SHAPE_DEFAULTS = {
  RECTANGLE: {
    width: 100,
    height: 80,
    strokeWidth: 2
  },
  LINE: {
    length: 100,
    strokeWidth: 2
  },
  QR_CODE: {
    size: 150
  },
  TEST_RESULTS: {
    width: 500,
    height: 250
  }
};

// Canvas state version for serialization
export const CANVAS_STATE_VERSION = '2.0';

// Konva transformer configuration
export const TRANSFORMER_CONFIG = {
  enabledAnchors: [
    'middle-left', 'middle-right',
    'top-center', 'bottom-center',
    'top-left', 'top-right',
    'bottom-left', 'bottom-right'
  ],
  anchorStroke: '#3a86ff',
  anchorFill: '#fff',
  anchorSize: 8,
  borderStroke: '#3a86ff',
  borderDash: [3, 3]
}; 