import { AgentUser, OrderItem } from '../types';

export const INITIAL_AGENTS: AgentUser[] = [
  { 
    user: 'agent01', 
    pass: 'agent01', 
    name: 'Agent 01 (Tareq)', 
    team: 'Acquisition', 
    contact: '01711223344',
    email: 'tareq.agent01@portal.local',
    address: 'House 14, Road 5, Dhanmondi, Dhaka',
    bloodGroup: 'B+',
    birthday: '1996-05-14',
    status: 'active',
    failedAttempts: 0
  },
  { 
    user: 'aqn01', 
    pass: 'aqn01', 
    name: 'AQN Officer (Rahim)', 
    team: 'Acquisition',
    contact: '01822334455',
    email: 'rahim.aqn01@portal.local',
    address: 'House 8, Road 2, Mirpur 10, Dhaka',
    bloodGroup: 'O+',
    birthday: '1994-11-20',
    status: 'active',
    failedAttempts: 0
  },
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

export const INITIAL_ORDERS: OrderItem[] = [
  {
    id: '1008',
    customerName: 'Tanvir Hossain',
    customerContact: '01711223344',
    gender: 'Male',
    createDate: getRecentDateTimeStr(0, 2),
    orderChannel: 'Acquisition',
    agentId: 'agent01',
    agentName: 'Agent 01 (Tareq)',
    productCategory: 'Electronics',
    productName: 'Smart Air Humidifier V2',
    city: 'Dhaka',
    deliveryArea: 'Gulshan',
    addressDetails: 'Flat: 4B, House: 18, Road: 103, Block: D',
    scheduleDate: getRecentDateStr(0),
    scheduledTime: '11AM to 12PM',
    orderValue: 4500,
    orderStatus: 'Delivered',
    followupStatus: 'Delivered',
    profit: 900 // 20%
  },
  {
    id: '1007',
    customerName: 'Nusrat Jahan',
    customerContact: '01822334455',
    gender: 'Female',
    createDate: getRecentDateTimeStr(1, 4),
    orderChannel: 'Facebook',
    agentId: 'agent01',
    agentName: 'Agent 01 (Tareq)',
    productCategory: 'Room Accessories',
    productName: 'Aesthetic Floor Standing Lamp',
    city: 'Dhaka',
    deliveryArea: 'Dhanmondi',
    addressDetails: 'Flat: 2A, House: 32, Road: 7A, Block: B',
    scheduleDate: getRecentDateStr(1),
    scheduledTime: '3PM to 4PM',
    orderValue: 2850,
    orderStatus: 'Delivered',
    followupStatus: 'Delivered',
    profit: 570 // 20%
  },
  {
    id: '1006',
    customerName: 'Shakil Ahmed',
    customerContact: '01933445566',
    gender: 'Male',
    createDate: getRecentDateTimeStr(2, 6),
    orderChannel: 'Acquisition',
    agentId: 'agent01',
    agentName: 'Agent 01 (Tareq)',
    productCategory: 'Appliance',
    productName: 'Blender & Food Processor Combo',
    city: 'Chittagong',
    deliveryArea: 'Agrabad',
    addressDetails: 'Flat: 6C, House: 12, Road: Commercial Area, Block: A',
    scheduleDate: getRecentDateStr(2),
    scheduledTime: '12PM to 1PM',
    orderValue: 6200,
    orderStatus: 'Delivered',
    followupStatus: 'Delivered',
    profit: 1240 // 20%
  },
  {
    id: '1005',
    customerName: 'Farhana Akhter',
    customerContact: '01644556677',
    gender: 'Female',
    createDate: getRecentDateTimeStr(0, 1),
    orderChannel: 'Call-Center',
    agentId: 'agent01',
    agentName: 'Agent 01 (Tareq)',
    productCategory: 'Medicines',
    productName: 'Healthcare Pulse Oximeter & Monitor',
    city: 'Dhaka',
    deliveryArea: 'Uttara',
    addressDetails: 'Flat: 3A, House: 78, Road: Sector 11, Block: C',
    scheduleDate: getRecentDateStr(0),
    scheduledTime: '4PM to 5PM',
    orderValue: 1800,
    orderStatus: 'Pending',
    followupStatus: 'Pending',
    profit: 360 // 20%
  },
  {
    id: '1004',
    customerName: 'Mahmudur Rahman',
    customerContact: '01555667788',
    gender: 'Male',
    createDate: getRecentDateTimeStr(4, 5),
    orderChannel: 'KAM',
    agentId: 'agent01',
    agentName: 'Agent 01 (Tareq)',
    productCategory: 'Cloths',
    productName: 'Premium Cotton Executive Shirts (Pack of 3)',
    city: 'Jashore',
    deliveryArea: 'Jessore Sadar',
    addressDetails: 'Flat: 1A, House: 05, Road: Station Road, Block: 2',
    scheduleDate: getRecentDateStr(3),
    scheduledTime: '2PM to 3PM',
    orderValue: 3950,
    orderStatus: 'Pending',
    followupStatus: 'Pending',
    profit: 790 // 20%
  },
  {
    id: '1003',
    customerName: 'Samira Karim',
    customerContact: '01799887766',
    gender: 'Female',
    createDate: getRecentDateTimeStr(12, 3),
    orderChannel: 'Retention',
    agentId: 'agent01',
    agentName: 'Agent 01 (Tareq)',
    productCategory: 'Electronics',
    productName: 'Noise Cancelling Wireless Earbuds',
    city: 'Dhaka',
    deliveryArea: 'Banani',
    addressDetails: 'Flat: 5B, House: 22, Road: 11, Block: F',
    scheduleDate: getRecentDateStr(11),
    scheduledTime: '6PM to 7PM',
    orderValue: 3400,
    orderStatus: 'Delivered',
    followupStatus: 'Delivered',
    profit: 680 // 20%
  },
  {
    id: '1002',
    customerName: 'Kamal Uddin',
    customerContact: '01811223399',
    gender: 'Male',
    createDate: getRecentDateTimeStr(18, 2),
    orderChannel: 'VOC',
    agentId: 'agent01',
    agentName: 'Agent 01 (Tareq)',
    productCategory: 'Room Accessories',
    productName: 'Ergonomic Memory Foam Lumbar Support',
    city: 'Dhaka',
    deliveryArea: 'Mirpur',
    addressDetails: 'Flat: 3C, House: 14, Road: 2, Block: Section 10',
    scheduleDate: getRecentDateStr(17),
    scheduledTime: '10AM to 11AM',
    orderValue: 2200,
    orderStatus: 'Delivered',
    followupStatus: 'Delivered',
    profit: 440 // 20%
  },
  {
    id: '1001',
    customerName: 'Rashedul Islam',
    customerContact: '01922334411',
    gender: 'Male',
    createDate: getRecentDateTimeStr(0, 1),
    orderChannel: 'Acquisition',
    agentId: 'aqn01',
    agentName: 'AQN Officer (Rahim)',
    productCategory: 'Electronics',
    productName: 'Smart LED Desk Lamp with Wireless Charger',
    city: 'Dhaka',
    deliveryArea: 'Mohammadpur',
    addressDetails: 'Flat: 4C, House: 19, Road: Ring Road, Block: D',
    scheduleDate: getRecentDateStr(0),
    scheduledTime: '2PM to 3PM',
    orderValue: 2600,
    orderStatus: 'Pending',
    followupStatus: 'Pending',
    profit: 520 // 20%
  }
];
