import { AgentUser, OrderItem } from '../types';

export const INITIAL_AGENTS: AgentUser[] = [
  { 
    user: '1', 
    pass: '1', 
    name: 'Agent 1', 
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

export const INITIAL_ORDERS: OrderItem[] = (() => {
  const generatedOrders: OrderItem[] = [];
  const channels = ['Website', 'Facebook', 'WhatsApp', 'Instagram', 'Phone'];
  const agentPairs = [
    { agent_id: '6', agent_name: 'rtn01' },
    { agent_id: '22', agent_name: 'fb02' },
    { agent_id: '1', agent_name: 'Agent 1' },
    { agent_id: '2', agent_name: 'Agent 2' },
    { agent_id: '3', agent_name: 'Agent 3' },
    { agent_id: 'agent01', agent_name: 'agent01' },
    { agent_id: 'agent02', agent_name: 'agent02' }
  ];
  const categories = ['Home & Kitchen', 'Beauty', 'Electronics', 'Fashion', 'Health'];
  const products: Record<string, string[]> = {
    'Home & Kitchen': ['blender', 'cooker', 'knife set', 'air fryer', 'water filter'],
    'Beauty': ['perfume', 'lipstick', 'face serum', 'moisturizer', 'sunscreen'],
    'Electronics': ['smartphone', 'bluetooth speaker', 'smartwatch', 'power bank', 'earbuds'],
    'Fashion': ['t-shirt', 'jeans', 'sneakers', 'jacket', 'sunglasses'],
    'Health': ['vitamins', 'protein powder', 'bp monitor', 'glucometer', 'multivitamin']
  };
  const cities = ['Dhaka', 'Chittagong', 'Sylhet', 'Khulna', 'Jashore'];
  const areas: Record<string, string[]> = {
    'Dhaka': ['Gulshan', 'Banani', 'Dhanmondi', 'Mirpur', 'Uttara', 'Badda'],
    'Chittagong': ['Agrabad', 'Khulshi', 'Nasirabad', 'Halishahar'],
    'Sylhet': ['Zindabazar', 'Amberkhana', 'Upashahar'],
    'Khulna': ['Sonadanga', 'Khalishpur', 'Boyra'],
    'Jashore': ['Chowrasta', 'Palbari', 'New Market']
  };
  const statuses = ['Pending', 'In Progress', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled', 'Returned'];
  const followups = ['Pending', 'In Progress', 'Completed', 'Follow-up'];
  const genders = ['Male', 'Female', 'Other'];

  // Include the two specific requested sample orders as #1 and #2
  generatedOrders.push({
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
    agent_id: '6',
    agentId: '6',
    agent_name: 'rtn01',
    agentName: 'rtn01',
    product_category: 'Home & Kitchen',
    productCategory: 'Home & Kitchen',
    product_name: 'blender',
    productName: 'blender',
    city: 'Sylhet',
    delivery_area: 'Zindabazar',
    deliveryArea: 'Zindabazar',
    address_details: 'Flat: 1, House: 152, Road: 28, Block: A',
    addressDetails: 'Flat: 1, House: 152, Road: 28, Block: A',
    schedule_date: '08-Oct-26',
    scheduleDate: '08-Oct-26',
    schedule_time: '8PM to 9PM',
    scheduledTime: '8PM to 9PM',
    order_value: 11237,
    orderValue: 11237,
    order_status: 'Pending',
    orderStatus: 'Pending',
    followup_status: 'In Progress',
    followupStatus: 'In Progress',
    profit: 2247
  });

  generatedOrders.push({
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
    agent_id: '22',
    agentId: '22',
    agent_name: 'fb02',
    agentName: 'fb02',
    product_category: 'Beauty',
    productCategory: 'Beauty',
    product_name: 'perfume',
    productName: 'perfume',
    city: 'Khulna',
    delivery_area: 'Sonadanga',
    deliveryArea: 'Sonadanga',
    address_details: 'Flat: 5, House: 109, Road: 22, Block: C',
    addressDetails: 'Flat: 5, House: 109, Road: 22, Block: C',
    schedule_date: '21-Sep-26',
    scheduleDate: '21-Sep-26',
    schedule_time: '10AM to 11AM',
    scheduledTime: '10AM to 11AM',
    order_value: 256,
    orderValue: 256,
    order_status: 'Pending',
    orderStatus: 'Pending',
    followup_status: 'Pending',
    followupStatus: 'Pending',
    profit: 51
  });

  for (let i = 3; i <= 5000; i++) {
    const agentPair = agentPairs[(i - 1) % agentPairs.length];
    const cat = categories[(i - 1) % categories.length];
    const prodList = products[cat];
    const prod = prodList[(i - 1) % prodList.length];
    const city = cities[(i - 1) % cities.length];
    const areaList = areas[city];
    const area = areaList[(i - 1) % areaList.length];
    const status = statuses[(i * 3) % statuses.length];
    const followup = followups[(i * 7) % followups.length];
    const gender = genders[i % genders.length];
    const channel = channels[(i * 5) % channels.length];

    const custId = String(1000 + i);
    const mobile = String(1300000000 + (i * 137) % 899999999);
    const custName = `customer${1000 + i}`;
    const orderValue = 200 + (i * 43) % 15000;
    const profit = Math.round(orderValue * 0.2);

    generatedOrders.push({
      order_id: String(i),
      id: String(i),
      customer_id: custId,
      customerId: custId,
      customer_mobile: mobile,
      customerContact: mobile,
      customer_name: custName,
      customerName: custName,
      gender,
      create_date: getRecentDateTimeStr(i % 30, i % 24),
      createDate: getRecentDateTimeStr(i % 30, i % 24),
      order_channel: channel,
      orderChannel: channel,
      agent_id: agentPair.agent_id,
      agentId: agentPair.agent_id,
      agent_name: agentPair.agent_name,
      agentName: agentPair.agent_name,
      product_category: cat,
      productCategory: cat,
      product_name: prod,
      productName: prod,
      city,
      delivery_area: area,
      deliveryArea: area,
      address_details: `Flat: ${i % 5 + 1}, House: ${i % 200 + 1}, Road: ${i % 50 + 1}, Block: ${String.fromCharCode(65 + (i % 4))}`,
      addressDetails: `Flat: ${i % 5 + 1}, House: ${i % 200 + 1}, Road: ${i % 50 + 1}, Block: ${String.fromCharCode(65 + (i % 4))}`,
      schedule_date: getRecentDateStr((i % 15) - 5),
      scheduleDate: getRecentDateStr((i % 15) - 5),
      schedule_time: '11AM to 12PM',
      scheduledTime: '11AM to 12PM',
      order_value: orderValue,
      orderValue: orderValue,
      order_status: status,
      orderStatus: status,
      followup_status: followup,
      followupStatus: followup,
      profit
    });
  }

  return generatedOrders;
})();

