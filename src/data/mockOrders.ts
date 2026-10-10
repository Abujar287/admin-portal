import { AgentUser, OrderItem } from '../types';

export const INITIAL_AGENTS: AgentUser[] = [
  { 
    user: 'agent01', 
    pass: 'agent01', 
    name: 'Agent 01', 
    team: 'Acquisition', 
    contact: '01711223344',
    email: 'agent01@portal.local',
    address: 'House 14, Road 5, Dhanmondi, Dhaka',
    bloodGroup: 'B+',
    birthday: '1996-05-14',
    status: 'active',
    failedAttempts: 0,
    role: 'Agent',
    permissions: {
      canCreate: true,
      canUpdateStatus: true,
      canChangeValue: true,
      canAddProfit: true,
      canCancel: true
    }
  },
  { 
    user: 'agent02', 
    pass: 'agent02', 
    name: 'Agent 02', 
    team: 'Acquisition',
    contact: '01722334455',
    email: 'agent02@portal.local',
    address: 'House 8, Road 2, Mirpur 10, Dhaka',
    bloodGroup: 'O+',
    birthday: '1994-11-20',
    status: 'active',
    failedAttempts: 0,
    role: 'Agent',
    permissions: {
      canCreate: true,
      canUpdateStatus: true,
      canChangeValue: true,
      canAddProfit: true,
      canCancel: true
    }
  },
  { 
    user: 'agent03', 
    pass: 'agent03', 
    name: 'Agent 03', 
    team: 'Retention',
    contact: '01733445566',
    email: 'agent03@portal.local',
    address: 'House 22, Road 11, Banani, Dhaka',
    bloodGroup: 'A+',
    birthday: '1995-03-12',
    status: 'active',
    failedAttempts: 0,
    role: 'Agent',
    permissions: {
      canCreate: true,
      canUpdateStatus: true,
      canChangeValue: true,
      canAddProfit: true,
      canCancel: true
    }
  }
];

export const CITY_AREA_MAP: Record<string, string[]> = {
  'Dhaka': ['Azimpur', 'Badda', 'Banani', 'Bashundhara R/A', 'Dhanmondi', 'Gulshan', 'Mirpur', 'Mohakhali', 'Mohammadpur', 'Motijheel', 'Rampura', 'Uttara', 'Wari', 'Others'],
  'Chittagong': ['Agrabad', 'Bayezid', 'Halishahar', 'Khulshi', 'Nasirabad', 'Pachlaish', 'Others'],
  'Jashore': ['Chowrasta', 'Doratana', 'Jessore Sadar', 'New Market', 'Palbari', 'Others'],
  'Others': ['Barisal', 'Comilla', 'Gazipur', 'Narayanganj', 'Sylhet', 'Tongi', 'Others']
};

export const TIME_SLOTS = [
  '9AM to 10AM',
  '10AM to 11AM',
  '11AM to 12PM',
  '12PM to 1PM',
  '1PM to 2PM',
  '2PM to 3PM',
  '3PM to 4PM',
  '4PM to 5PM',
  '5PM to 6PM',
  '6PM to 7PM',
  '7PM to 8PM',
  '8PM to 9PM'
];

export const ORDER_CHANNELS = [
  'Acquisition',
  'Retention',
  'KAM',
  'Call-Center',
  'Facebook',
  'Back-Office',
  'VOC'
];

export const getOrderChannels = () => {
  const stored = localStorage.getItem('agent_portal_order_channels');
  return stored ? JSON.parse(stored) : ORDER_CHANNELS;
};

export const addOrderChannel = (channel: string) => {
  const channels = getOrderChannels();
  if (!channels.includes(channel)) {
    channels.push(channel);
    localStorage.setItem('agent_portal_order_channels', JSON.stringify(channels));
  }
};

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Room Accessories',
  'Cloths',
  'Medicines',
  'Appliance'
];

export const getProductCategories = (): string[] => {
  try {
    const stored = localStorage.getItem('agent_portal_product_categories');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return PRODUCT_CATEGORIES;
};

export const addProductCategory = (category: string): string[] => {
  const cats = getProductCategories();
  if (!cats.includes(category)) {
    cats.push(category);
    localStorage.setItem('agent_portal_product_categories', JSON.stringify(cats));
  }
  return cats;
};

export const removeProductCategory = (category: string): string[] => {
  const cats = getProductCategories().filter(c => c !== category);
  localStorage.setItem('agent_portal_product_categories', JSON.stringify(cats));
  return cats;
};

export const removeOrderChannel = (channel: string): string[] => {
  const channels = getOrderChannels().filter((c: string) => c !== channel);
  localStorage.setItem('agent_portal_order_channels', JSON.stringify(channels));
  return channels;
};

export interface CategoryTeamMapping {
  id: string;
  category: string;
  orderStatus: string;
  team: string;
  teamLeader: string;
}

export const ORDER_STATUS_LIST = [
  'Pending',
  'In Progress',
  'Confirmed',
  'Follow-up',
  'Delivered',
  'Cancelled',
  'Returned'
];

export const getOrderStatuses = (): string[] => {
  try {
    const stored = localStorage.getItem('agent_portal_order_statuses');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return ORDER_STATUS_LIST;
};

export const addOrderStatus = (status: string): string[] => {
  const list = getOrderStatuses();
  if (!list.includes(status)) {
    list.push(status);
    localStorage.setItem('agent_portal_order_statuses', JSON.stringify(list));
  }
  return list;
};

export const removeOrderStatus = (status: string): string[] => {
  const list = getOrderStatuses().filter(s => s !== status);
  localStorage.setItem('agent_portal_order_statuses', JSON.stringify(list));
  return list;
};

export const DEFAULT_TEAMS_LIST = [
  'Acquisition',
  'Retention',
  'KAM',
  'Call-Center',
  'Facebook',
  'Back-Office',
  'VOC'
];

export const getTeamsList = (): string[] => {
  try {
    const stored = localStorage.getItem('agent_portal_teams_list');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_TEAMS_LIST;
};

export const addTeamItem = (team: string): string[] => {
  const list = getTeamsList();
  if (!list.includes(team)) {
    list.push(team);
    localStorage.setItem('agent_portal_teams_list', JSON.stringify(list));
  }
  return list;
};

export const removeTeamItem = (team: string): string[] => {
  const list = getTeamsList().filter(t => t !== team);
  localStorage.setItem('agent_portal_teams_list', JSON.stringify(list));
  return list;
};

export const DEFAULT_TEAM_LEADERS = [
  'MD Abujar',
  'Manager (Admin)',
  'TL Rahim',
  'TL Karim'
];

export const getTeamLeadersList = (): string[] => {
  try {
    const stored = localStorage.getItem('agent_portal_team_leaders');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_TEAM_LEADERS;
};

export const addTeamLeaderItem = (leader: string): string[] => {
  const list = getTeamLeadersList();
  if (!list.includes(leader)) {
    list.push(leader);
    localStorage.setItem('agent_portal_team_leaders', JSON.stringify(list));
  }
  return list;
};

export const removeTeamLeaderItem = (leader: string): string[] => {
  const list = getTeamLeadersList().filter(l => l !== leader);
  localStorage.setItem('agent_portal_team_leaders', JSON.stringify(list));
  return list;
};

export const DEFAULT_CATEGORY_MAPPINGS: CategoryTeamMapping[] = [
  { id: '1', category: 'Electronics', orderStatus: 'Pending', team: 'Acquisition', teamLeader: 'MD Abujar' },
  { id: '2', category: 'Room Accessories', orderStatus: 'Pending', team: 'Retention', teamLeader: 'Manager (Admin)' },
  { id: '3', category: 'Cloths', orderStatus: 'Pending', team: 'Facebook', teamLeader: 'MD Abujar' },
  { id: '4', category: 'Medicines', orderStatus: 'In Progress', team: 'Call-Center', teamLeader: 'Manager (Admin)' },
  { id: '5', category: 'Appliance', orderStatus: 'Pending', team: 'KAM', teamLeader: 'MD Abujar' },
];

export const getCategoryMappings = (): CategoryTeamMapping[] => {
  try {
    const stored = localStorage.getItem('agent_portal_category_mappings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_CATEGORY_MAPPINGS;
};

export const saveCategoryMappings = (mappings: CategoryTeamMapping[]): void => {
  localStorage.setItem('agent_portal_category_mappings', JSON.stringify(mappings));
};

// Helper to format date in YYYY-MM-DD
function getRecentDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function getRecentDateTimeStr(daysAgo: number, hoursOffset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export const INITIAL_ORDERS: OrderItem[] = [];
