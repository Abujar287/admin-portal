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

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Room Accessories',
  'Cloths',
  'Medicines',
  'Appliance'
];

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
