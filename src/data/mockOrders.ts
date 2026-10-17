import { AgentUser, OrderItem } from '../types';

export const INITIAL_AGENTS: AgentUser[] = [
  {
    user: '1',
    pass: '01410089771',
    name: 'Manager',
    role: 'Manager',
    team: 'Acquisition',
    email: 'manager@portal.local',
    status: 'active'
  },
  {
    user: 'agent1',
    pass: '123456',
    name: 'Sarah Agent',
    role: 'Agent',
    team: 'Acquisition',
    email: 'sarah@portal.local',
    status: 'active'
  },
  {
    user: 'agent2',
    pass: '123456',
    name: 'Alex Sales',
    role: 'Agent',
    team: 'Sales',
    email: 'alex@portal.local',
    status: 'active'
  }
];

export const INITIAL_ORDERS: OrderItem[] = [
  {
    order_id: '1001',
    id: '1001',
    customer_id: 'c101',
    customerId: 'c101',
    customer_mobile: '01711223344',
    customerContact: '01711223344',
    customer_name: 'Rahim Ahmed',
    customerName: 'Rahim Ahmed',
    gender: 'Male',
    create_date: '2026-10-15 10:00:00',
    createDate: '2026-10-15 10:00:00',
    order_channel: 'Acquisition',
    orderChannel: 'Acquisition',
    agent_id: 'agent1',
    agentId: 'agent1',
    agent_name: 'Sarah Agent',
    agentName: 'Sarah Agent',
    product_category: 'Electronics',
    productCategory: 'Electronics',
    product_name: 'Wireless Earbuds X1',
    productName: 'Wireless Earbuds X1',
    city: 'Dhaka',
    delivery_area: 'Gulshan',
    deliveryArea: 'Gulshan',
    address_details: 'House 12, Road 5, Block C',
    addressDetails: 'House 12, Road 5, Block C',
    schedule_date: '2026-10-18',
    scheduleDate: '2026-10-18',
    schedule_time: '11AM to 12PM',
    scheduledTime: '11AM to 12PM',
    order_value: 2500,
    orderValue: 2500,
    order_status: 'Pending',
    orderStatus: 'Pending',
    followup_status: 'Pending',
    followupStatus: 'Pending',
    profit: 500
  },
  {
    order_id: '1002',
    id: '1002',
    customer_id: 'c102',
    customerId: 'c102',
    customer_mobile: '01822334455',
    customerContact: '01822334455',
    customer_name: 'Fatema Begum',
    customerName: 'Fatema Begum',
    gender: 'Female',
    create_date: '2026-10-16 14:30:00',
    createDate: '2026-10-16 14:30:00',
    order_channel: 'Sales',
    orderChannel: 'Sales',
    agent_id: 'agent2',
    agentId: 'agent2',
    agent_name: 'Alex Sales',
    agentName: 'Alex Sales',
    product_category: 'Room Accessories',
    productCategory: 'Room Accessories',
    product_name: 'LED Desk Lamp',
    productName: 'LED Desk Lamp',
    city: 'Chittagong',
    delivery_area: 'GEC Circle',
    deliveryArea: 'GEC Circle',
    address_details: 'Apartment 4B, Tower Heights',
    addressDetails: 'Apartment 4B, Tower Heights',
    schedule_date: '2026-10-19',
    scheduleDate: '2026-10-19',
    schedule_time: '2PM to 4PM',
    scheduledTime: '2PM to 4PM',
    order_value: 1800,
    orderValue: 1800,
    order_status: 'In Progress',
    orderStatus: 'In Progress',
    followup_status: 'Follow-up',
    followupStatus: 'Follow-up',
    profit: 360
  }
];

export const ORDER_CHANNELS = ['Acquisition', 'Retention', 'KAM', 'Call-Center', 'Facebook', 'Back-Office', 'VOC'];
export const TIME_SLOTS = ['10AM to 11AM', '11AM to 12PM', '12PM to 2PM', '2PM to 4PM', '4PM to 6PM', '6PM to 8PM'];
export const PRODUCT_CATEGORIES = ['Electronics', 'Room Accessories', 'Cloths', 'Medicines', 'Appliance'];
export const ORDER_STATUS_LIST = ['Pending', 'Delivered', 'In Progress', 'Cancelled'];

export const CITY_AREA_MAP: Record<string, string[]> = {
  'Dhaka': ['Gulshan', 'Banani', 'Dhanmondi', 'Uttara', 'Mirpur', 'Mohakhali', 'Tejgaon', 'Motijheel'],
  'Chittagong': ['GEC Circle', 'Nasirabad', 'Agrabad', 'Chawkbazar', 'Khulshi', 'Panchlaish'],
  'Sylhet': ['Zindabazar', 'Amberkhana', 'Upashahar', 'Subhanighat'],
  'Rajshahi': ['Laxmipur', 'Shaheb Bazar', 'Talaimari', 'Padma Residential'],
  'Khulna': ['Sonadanga', 'Khalishpur', 'Boyra', 'Daulatpur']
};

let customOrderChannels = [...ORDER_CHANNELS];
let customTimeSlots = [...TIME_SLOTS];
let customProductCategories = [...PRODUCT_CATEGORIES];
let customOrderStatuses = [...ORDER_STATUS_LIST];
let customTeams = [
  { name: 'Acquisition', teamLeaderName: 'Manager', teamLeaderId: '1' },
  { name: 'Sales', teamLeaderName: 'Manager', teamLeaderId: '1' },
  { name: 'Support', teamLeaderName: 'Manager', teamLeaderId: '1' }
];

export const DEFAULT_TEAM_LEADERS = ['Manager', 'Sarah Agent'];
let customTeamLeaders = [...DEFAULT_TEAM_LEADERS];

export const getTimeSlots = () => customTimeSlots;
export const addTimeSlot = (slot: string) => { if (!customTimeSlots.includes(slot)) customTimeSlots.push(slot); };
export const removeTimeSlot = (slot: string) => { customTimeSlots = customTimeSlots.filter(s => s !== slot); };

export const getOrderChannels = () => customOrderChannels;
export const addOrderChannel = (ch: string) => { if (!customOrderChannels.includes(ch)) customOrderChannels.push(ch); };
export const removeOrderChannel = (ch: string) => { customOrderChannels = customOrderChannels.filter(c => c !== ch); };

export const getProductCategories = () => customProductCategories;
export const addProductCategory = (cat: string) => { if (!customProductCategories.includes(cat)) customProductCategories.push(cat); };
export const removeProductCategory = (cat: string) => { customProductCategories = customProductCategories.filter(c => c !== cat); };

export const getOrderStatuses = () => customOrderStatuses;
export const addOrderStatus = (st: string) => { if (!customOrderStatuses.includes(st)) customOrderStatuses.push(st); };
export const removeOrderStatus = (st: string) => { customOrderStatuses = customOrderStatuses.filter(s => s !== st); };

export const getTeamsList = () => customTeams;
export const addTeamItem = (t: { name: string; teamLeaderName?: string; teamLeaderId?: string }) => {
  if (!customTeams.some(x => x.name.toLowerCase() === t.name.toLowerCase())) {
    customTeams.push(t);
  }
};
export const removeTeamItem = (name: string) => {
  customTeams = customTeams.filter(t => t.name.toLowerCase() !== name.toLowerCase());
};

export const getTeamLeadersList = () => customTeamLeaders;
export const addTeamLeaderItem = (tl: string) => { if (!customTeamLeaders.includes(tl)) customTeamLeaders.push(tl); };
export const removeTeamLeaderItem = (tl: string) => { customTeamLeaders = customTeamLeaders.filter(t => t !== tl); };

export interface CategoryTeamMapping {
  category: string;
  team: string;
  defaultStatus?: string;
}

export const getCategoryMappings = (): CategoryTeamMapping[] => {
  try {
    const saved = localStorage.getItem('agent_portal_category_mappings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [
    { category: 'Electronics', team: 'Acquisition' },
    { category: 'Room Accessories', team: 'Sales' },
    { category: 'Cloths', team: 'Acquisition' },
    { category: 'Medicines', team: 'Support' },
    { category: 'Appliance', team: 'Sales' }
  ];
};

export const saveCategoryMappings = (mappings: CategoryTeamMapping[]) => {
  try {
    localStorage.setItem('agent_portal_category_mappings', JSON.stringify(mappings));
  } catch {}
};
