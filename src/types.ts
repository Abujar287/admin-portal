export interface AgentUser {
  user: string;
  pass: string;
  name: string;
  team: string;
  contact?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  status?: 'active' | 'deactivated';
  failedAttempts?: number;
  role?: string;
}

export interface ManagerUser {
  user: string;
  pass: string;
  name: string;
  role: string;
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
  addressDetails: string;
  scheduleDate: string; // YYYY-MM-DD
  scheduledTime: string;
  orderValue: number;
  orderStatus: 'Pending' | 'Delivered' | 'In Progress' | 'Cancelled' | string;
  followupStatus: 'Pending' | 'Delivered' | 'Confirmed' | 'Follow-up' | 'Rescheduled' | string;
  profit: number;
  deliveredDate?: string;
  cancelledDate?: string;
}

export type DateFilterType = '' | 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'lastYear' | 'custom';

export interface FollowupHistoryItem {
  id: string;
  orderId: string;
  customerName?: string;
  customerContact?: string;
  previousStatus: string;
  newStatus: string;
  orderStatus: string;
  orderValue?: number;
  scheduleDate?: string;
  scheduledTime?: string;
  updatedBy: string;
  timestamp: string;
  notes?: string;
}
