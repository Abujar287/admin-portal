export interface AgentUser {
  user: string;
  pass: string;
  name: string;
  team: string;
  email?: string;
  role?: string;
}

export interface OrderItem {
  id: string; // Order Id
  customerName: string;
  customerContact: string;
  gender: 'Male' | 'Female' | 'Other' | string;
  createDate: string; // YYYY-MM-DD HH:mm:ss
  orderChannel: 'Acquisition' | 'Retention' | 'KAM' | 'Call-Center' | 'Facebook' | 'Back-Office' | 'VOC' | string;
  agentId: string;
  agentName: string;
  productCategory: 'Electronics' | 'Room Accessories' | 'Cloths' | 'Medicines' | 'Appliance' | string;
  productName: string;
  city: string;
  deliveryArea: string;
  addressDetails: string; // "Flat: 102, House: 45, Road: 15A, Block: F"
  scheduleDate: string; // YYYY-MM-DD
  scheduledTime: string; // e.g. "10AM to 11AM"
  orderValue: number;
  orderStatus: 'Pending' | 'Delivered' | 'In Progress' | 'Cancelled' | string;
  followupStatus: 'Pending' | 'Delivered' | 'Confirmed' | 'Follow-up' | 'Rescheduled' | string;
  profit: number;
}

export type DateFilterType = '' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth';
