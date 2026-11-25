import type { CivicCategory, IssueStatus, ProjectStatus } from '../types/civic';

export const ASSETS = {
  heroAerial: '/src/assets/images/hero_bengaluru_aerial_1795626215399.jpg',
  metroCorridor: '/src/assets/images/project_metro_corridor_1795626217209.jpg',
  lakePark: '/src/assets/images/project_lake_rejuvenation_1795626217170.jpg',
  governanceStudio: '/src/assets/images/knowledge_municipal_governance_1795626216674.jpg',
};

export interface CategoryMeta {
  name: CivicCategory;
  shortLabel: string;
  description: string;
  markerColor: string;
  iconKey:
    | 'road'
    | 'water'
    | 'drainage'
    | 'waste'
    | 'streetlight'
    | 'transit'
    | 'air'
    | 'park'
    | 'safety'
    | 'other';
}

export const CIVIC_CATEGORIES: CategoryMeta[] = [
  {
    name: 'Roads and Infrastructure',
    shortLabel: 'Roads',
    description: 'Potholes, footpath repairs, road resurfacing, utility trench cuts, and pedestrian crossings.',
    markerColor: '#F59E0B',
    iconKey: 'road',
  },
  {
    name: 'Water Supply',
    shortLabel: 'Water',
    description: 'Pipeline leaks, low pressure, irregular supply schedules, and drinking water quality.',
    markerColor: '#36C5D9',
    iconKey: 'water',
  },
  {
    name: 'Drainage and Sanitation',
    shortLabel: 'Drainage',
    description: 'Stormwater drain blockages, monsoon waterlogging, open manholes, and sewage overflows.',
    markerColor: '#38BDF8',
    iconKey: 'drainage',
  },
  {
    name: 'Waste Management',
    shortLabel: 'Waste',
    description: 'Segregated pickup delays, roadside black spots, debris dumping, and dry waste centers.',
    markerColor: '#84CC16',
    iconKey: 'waste',
  },
  {
    name: 'Streetlights',
    shortLabel: 'Streetlights',
    description: 'Unlit LED poles, flickering junction lamps, damaged cables, and dark footpaths.',
    markerColor: '#FACC15',
    iconKey: 'streetlight',
  },
  {
    name: 'Public Transportation',
    shortLabel: 'Transit',
    description: 'Bus shelters, last-mile metro feeder access, traffic signals, and commuter facilities.',
    markerColor: '#19C98A',
    iconKey: 'transit',
  },
  {
    name: 'Air and Noise Pollution',
    shortLabel: 'Pollution',
    description: 'Uncovered construction dust, open waste burning, and excessive night-time noise.',
    markerColor: '#A78BFA',
    iconKey: 'air',
  },
  {
    name: 'Public Parks',
    shortLabel: 'Parks',
    description: 'Neighborhood parks, urban lake walkways, playgrounds, and public green spaces.',
    markerColor: '#48E6B0',
    iconKey: 'park',
  },
  {
    name: 'Public Safety Infrastructure',
    shortLabel: 'Safety',
    description: 'Low-hanging electrical wires, broken guardrails, unsafe medians, and missing signage.',
    markerColor: '#FB7185',
    iconKey: 'safety',
  },
  {
    name: 'Other Civic Problems',
    shortLabel: 'Other',
    description: 'Encroachments, civic amenities, stray infrastructure hazards, and ward services.',
    markerColor: '#94A3B8',
    iconKey: 'other',
  },
];

export const CATEGORY_COLOR_MAP: Record<string, string> = Object.fromEntries(
  CIVIC_CATEGORIES.map((c) => [c.name, c.markerColor])
);

export const ISSUE_STATUSES: IssueStatus[] = [
  'Submitted',
  'Under Review',
  'Verified',
  'Forwarded to Authority',
  'In Progress',
  'Resolved',
  'Rejected',
];

export const PROJECT_STATUSES: ProjectStatus[] = ['Planned', 'Approved', 'In Progress', 'Completed', 'Delayed'];

export const REPORT_SUBCATEGORIES: { label: string; category: CivicCategory }[] = [
  { label: 'Road damage', category: 'Roads and Infrastructure' },
  { label: 'Potholes', category: 'Roads and Infrastructure' },
  { label: 'Garbage', category: 'Waste Management' },
  { label: 'Water leakage', category: 'Water Supply' },
  { label: 'Water shortage', category: 'Water Supply' },
  { label: 'Drainage blockage', category: 'Drainage and Sanitation' },
  { label: 'Streetlight problems', category: 'Streetlights' },
  { label: 'Traffic infrastructure', category: 'Public Transportation' },
  { label: 'Pollution', category: 'Air and Noise Pollution' },
  { label: 'Public infrastructure', category: 'Public Parks' },
  { label: 'Other', category: 'Other Civic Problems' },
];

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
];

export const SAMPLE_AI_QUESTIONS = [
  'Why does my locality experience waterlogging during heavy rain?',
  'Who is responsible for repairing damaged roads and potholes in Bengaluru?',
  'How can I report garbage collection problems officially?',
  'Which department manages streetlights and hanging electrical cables?',
  'What is the responsibility of a municipal corporation under the 74th Amendment?',
  'What major development projects are happening in Bengaluru right now?',
];

export function statusColorClass(status: string): string {
  switch (status) {
    case 'Resolved':
    case 'Completed':
      return 'text-[#48E6B0]';
    case 'Verified':
    case 'Approved':
      return 'text-[#19C98A]';
    case 'In Progress':
    case 'Forwarded to Authority':
      return 'text-[#36C5D9]';
    case 'Under Review':
    case 'Planned':
      return 'text-[#F59E0B]';
    case 'Delayed':
    case 'Rejected':
      return 'text-[#FB7185]';
    default:
      return 'text-[#9AABBB]';
  }
}

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
