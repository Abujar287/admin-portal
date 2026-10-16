import { AgentUser, OrderItem } from '../types';

export const INITIAL_AGENTS: AgentUser[] = [
  { 
    user: '1', 
    pass: '1', 
    name: 'aqn01', 
    team: 'Acquisition', 
    teamLeaderId: 'MD Abujar',
    teamLeaders: ['MD Abujar'],
    contact: '01711223344',
    email: '1@portal.local',
    address: 'House 14, Road 5, Dhanmondi, Dhaka',
    bloodGroup: 'B+',
    birthday: '1996-05-14',
    status: 'active',
    failedAttempts: 0,
    role: 'Agent',
    permissions: {
      canCreate: true,
      canUpdateStatus: true,
      canChangeSchedule: true,
      canChangeValue: true,
      canAddProfit: true,
      allowedOrderStatuses: ['Pending', 'In Progress', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled', 'Returned']
    }
  },
  { 
    user: '2', 
    pass: '2', 
    name: 'Agent 2', 
    team: 'Acquisition',
    teamLeaderId: 'MD Abujar',
    teamLeaders: ['MD Abujar'],
    contact: '01722334455',
    email: '2@portal.local',
    address: 'House 8, Road 2, Mirpur 10, Dhaka',
    bloodGroup: 'O+',
    birthday: '1994-11-20',
    status: 'active',
    failedAttempts: 0,
    role: 'Agent',
    permissions: {
      canCreate: true,
      canUpdateStatus: true,
      canChangeSchedule: false,
      canChangeValue: false,
      canAddProfit: false,
      allowedOrderStatuses: ['Pending', 'In Progress', 'Confirmed', 'Follow-up']
    }
  },
  { 
    user: '3', 
    pass: '3', 
    name: 'Agent 3', 
    team: 'Retention',
    teamLeaderId: 'MD Abujar, Manager (Admin)',
    teamLeaders: ['MD Abujar', 'Manager (Admin)'],
    contact: '01733445566',
    email: '3@portal.local',
    address: 'House 22, Road 11, Banani, Dhaka',
    bloodGroup: 'A+',
    birthday: '1995-03-12',
    status: 'active',
    failedAttempts: 0,
    role: 'Agent',
    permissions: {
      canCreate: true,
      canUpdateStatus: true,
      canChangeSchedule: true,
      canChangeValue: true,
      canAddProfit: true,
      allowedOrderStatuses: ['Pending', 'In Progress', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled', 'Returned']
    }
  }
];

export const CITY_AREA_MAP: Record<string, string[]> = {
  'Dhaka': ['Azimpur', 'Badda', 'Banani', 'Bashundhara R/A', 'Dhanmondi', 'Gulshan', 'Mirpur', 'Mohakhali', 'Mohammadpur', 'Motijheel', 'Rampura', 'Uttara', 'Wari', 'Others'],
  'Chittagong': ['Agrabad', 'Bayezid', 'Halishahar', 'Khulshi', 'Nasirabad', 'Pachlaish', 'Others'],
  'Jashore': ['Chowrasta', 'Doratana', 'Jessore Sadar', 'New Market', 'Palbari', 'Others'],
  'Others': ['Barisal', 'Comilla', 'Gazipur', 'Narayanganj', 'Sylhet', 'Tongi', 'Others']
};

export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 9999;
  const cleaned = timeStr.trim().toLowerCase();
  // Match patterns like "9AM", "9:30 AM", "12PM", "1PM", "09:00"
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return 9999;
  let hour = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3] ? match[3].toLowerCase() : '';

  if (period === 'pm' && hour < 12) {
    hour += 12;
  } else if (period === 'am' && hour === 12) {
    hour = 0;
  } else if (!period && hour < 8) {
    // If no am/pm specified and hour is small (e.g. 1-7), usually PM in business day
    hour += 12;
  }
  return hour * 60 + minutes;
};

export const sortTimeSlotsAscending = (slots: string[]): string[] => {
  return [...slots].sort((a, b) => {
    const minA = parseTimeToMinutes(a);
    const minB = parseTimeToMinutes(b);
    if (minA !== minB) return minA - minB;
    return a.localeCompare(b);
  });
};

export const TIME_SLOTS = sortTimeSlotsAscending([
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
]);

export const getTimeSlots = (): string[] => {
  try {
    const stored = localStorage.getItem('agent_portal_time_slots');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortTimeSlotsAscending(parsed);
      }
    }
  } catch {
    // fallback
  }
  return sortTimeSlotsAscending(TIME_SLOTS);
};

export const addTimeSlot = (slot: string): string[] => {
  const list = getTimeSlots();
  if (!list.includes(slot)) {
    list.push(slot);
    const sorted = sortTimeSlotsAscending(list);
    localStorage.setItem('agent_portal_time_slots', JSON.stringify(sorted));
    return sorted;
  }
  return list;
};

export const removeTimeSlot = (slot: string): string[] => {
  const list = getTimeSlots().filter(s => s !== slot);
  const sorted = sortTimeSlotsAscending(list);
  localStorage.setItem('agent_portal_time_slots', JSON.stringify(sorted));
  return sorted;
};

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
  channel?: string;
  teamLeader: string;
  timeSlot?: string;
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

export const DEFAULT_ALLOWED_ORDER_STATUSES = [
  'Pending',
  'In Progress',
  'Confirmed',
  'Follow-up'
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
  { id: '1', category: 'Electronics', orderStatus: 'Pending', team: 'Acquisition', channel: 'Facebook', teamLeader: 'MD Abujar', timeSlot: '10AM to 11AM' },
  { id: '2', category: 'Room Accessories', orderStatus: 'Confirmed', team: 'Retention', channel: 'Retention', teamLeader: 'Manager (Admin)', timeSlot: '11AM to 12PM' },
  { id: '3', category: 'Cloths & Apparel', orderStatus: 'Pending', team: 'Facebook', channel: 'Call-Center', teamLeader: 'MD Abujar', timeSlot: '12PM to 1PM' },
  { id: '4', category: 'Medicines & Health', orderStatus: 'In Progress', team: 'Call-Center', channel: 'Acquisition', teamLeader: 'Manager (Admin)', timeSlot: '1PM to 2PM' },
  { id: '5', category: 'Home Appliances', orderStatus: 'Delivered', team: 'KAM', channel: 'Retention', teamLeader: 'MD Abujar', timeSlot: '2PM to 3PM' },
];

export const getCategoryMappings = (): CategoryTeamMapping[] => {
  try {
    const stored = localStorage.getItem('agent_portal_category_mappings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Deduplicate stored mappings by category to ensure pristine list
        const seen = new Set<string>();
        const deduped: CategoryTeamMapping[] = [];
        for (const m of parsed) {
          const key = (m.category || '').trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            deduped.push(m);
          }
        }
        if (deduped.length > 0) return deduped;
      }
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

export const INITIAL_ORDERS: OrderItem[] = [
  {
    order_id: '1',
    id: '1',
    customer_id: '103',
    customerId: '103',
    customer_mobile: '1339345092',
    customerContact: '1339345092',
    customer_name: 'customer103',
    customerName: 'customer103',
    gender: 'Male',
    create_date: '2026-10-07 2:03:04',
    createDate: '2026-10-07 2:03:04',
    order_channel: 'Website',
    orderChannel: 'Website',
    agent_id: '1',
    agentId: '1',
    agent_name: 'aqn01',
    agentName: 'aqn01',
    product_category: 'Home & Kitchen',
    productCategory: 'Home & Kitchen',
    product_name: 'blender',
    productName: 'blender',
    city: 'Sylhet',
    delivery_area: 'Zindabazar',
    deliveryArea: 'Zindabazar',
    address_details: 'Flat: 1, House: 152, Road: 28, Block: A',
    addressDetails: 'Flat: 1, House: 152, Road: 28, Block: A',
    schedule_date: '2026-10-08',
    scheduleDate: '2026-10-08',
    schedule_time: '8PM to 9PM',
    scheduledTime: '8PM to 9PM',
    order_value: 11237,
    orderValue: 11237,
    order_status: 'Pending',
    orderStatus: 'Pending',
    followup_status: 'In Progress',
    followupStatus: 'In Progress',
    profit: 2247
  },
  {
    order_id: '3',
    id: '3',
    customer_id: '1003',
    customerId: '1003',
    customer_mobile: '1300000411',
    customerContact: '1300000411',
    customer_name: 'customer1003',
    customerName: 'customer1003',
    gender: 'Male',
    create_date: '2026-10-09 14:42:00',
    createDate: '2026-10-09 14:42:00',
    order_channel: 'Website',
    orderChannel: 'Website',
    agent_id: '1',
    agentId: '1',
    agent_name: 'aqn01',
    agentName: 'aqn01',
    product_category: 'Electronics',
    productCategory: 'Electronics',
    product_name: 'smartphone',
    productName: 'smartphone',
    city: 'Dhaka',
    delivery_area: 'Gulshan',
    deliveryArea: 'Gulshan',
    address_details: 'House 12, Road 5, Block D',
    addressDetails: 'House 12, Road 5, Block D',
    schedule_date: '2026-10-10',
    scheduleDate: '2026-10-10',
    schedule_time: '11AM to 12PM',
    scheduledTime: '11AM to 12PM',
    order_value: 15400,
    orderValue: 15400,
    order_status: 'Confirmed',
    orderStatus: 'Confirmed',
    followup_status: 'Confirmed',
    followupStatus: 'Confirmed',
    profit: 3080
  },
  {
    order_id: '10',
    id: '10',
    customer_id: '1010',
    customerId: '1010',
    customer_mobile: '1300001370',
    customerContact: '1300001370',
    customer_name: 'customer1010',
    customerName: 'customer1010',
    gender: 'Female',
    create_date: '2026-10-02 07:42:00',
    createDate: '2026-10-02 07:42:00',
    order_channel: 'Website',
    orderChannel: 'Website',
    agent_id: '1',
    agentId: '1',
    agent_name: 'aqn01',
    agentName: 'aqn01',
    product_category: 'Health',
    productCategory: 'Health',
    product_name: 'vitamins',
    productName: 'vitamins',
    city: 'Chittagong',
    delivery_area: 'Agrabad',
    deliveryArea: 'Agrabad',
    address_details: 'Building 4, Agrabad Commercial Area',
    addressDetails: 'Building 4, Agrabad Commercial Area',
    schedule_date: '2026-10-04',
    scheduleDate: '2026-10-04',
    schedule_time: '2PM to 3PM',
    scheduledTime: '2PM to 3PM',
    order_value: 3450,
    orderValue: 3450,
    order_status: 'Delivered',
    orderStatus: 'Delivered',
    followup_status: 'Delivered',
    followupStatus: 'Delivered',
    profit: 690,
    delivered_date: '2026-10-04 15:30:00'
  },
  {
    order_id: '17',
    id: '17',
    customer_id: '1017',
    customerId: '1017',
    customer_mobile: '1300002329',
    customerContact: '1300002329',
    customer_name: 'customer1017',
    customerName: 'customer1017',
    gender: 'Other',
    create_date: '2026-09-25 00:42:00',
    createDate: '2026-09-25 00:42:00',
    order_channel: 'Website',
    orderChannel: 'Website',
    agent_id: '1',
    agentId: '1',
    agent_name: 'aqn01',
    agentName: 'aqn01',
    product_category: 'Beauty',
    productCategory: 'Beauty',
    product_name: 'perfume',
    productName: 'perfume',
    city: 'Sylhet',
    delivery_area: 'Amberkhana',
    deliveryArea: 'Amberkhana',
    address_details: 'House 8, Amberkhana Point',
    addressDetails: 'House 8, Amberkhana Point',
    schedule_date: '2026-09-27',
    scheduleDate: '2026-09-27',
    schedule_time: '4PM to 5PM',
    scheduledTime: '4PM to 5PM',
    order_value: 2900,
    orderValue: 2900,
    order_status: 'Confirmed',
    orderStatus: 'Confirmed',
    followup_status: 'Confirmed',
    followupStatus: 'Confirmed',
    profit: 580
  },
  {
    order_id: '2',
    id: '2',
    customer_id: '2933',
    customerId: '2933',
    customer_mobile: '1455176955',
    customerContact: '1455176955',
    customer_name: 'customer2933',
    customerName: 'customer2933',
    gender: 'Male',
    create_date: '2026-09-14 20:06:56',
    createDate: '2026-09-14 20:06:56',
    order_channel: 'Facebook',
    orderChannel: 'Facebook',
    agent_id: '2',
    agentId: '2',
    agent_name: 'Agent 2',
    agentName: 'Agent 2',
    product_category: 'Beauty',
    productCategory: 'Beauty',
    product_name: 'perfume',
    productName: 'perfume',
    city: 'Khulna',
    delivery_area: 'Sonadanga',
    deliveryArea: 'Sonadanga',
    address_details: 'Flat: 5, House: 109, Road: 22, Block: C',
    addressDetails: 'Flat: 5, House: 109, Road: 22, Block: C',
    schedule_date: '2026-09-21',
    scheduleDate: '2026-09-21',
    schedule_time: '10AM to 11AM',
    scheduledTime: '10AM to 11AM',
    order_value: 256,
    orderValue: 256,
    order_status: 'Pending',
    orderStatus: 'Pending',
    followup_status: 'Pending',
    followupStatus: 'Pending',
    profit: 51
  }
];

