export interface AgentUser {
  user: string;
  pass: string;
  name: string;
  team: string;
  teamLeaderId?: string;
  contact?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  status?: 'active' | 'deactivated';
  failedAttempts?: number;
  role?: string; // 'Agent' | 'Team Leader' | 'Sr Agent'
  permissions?: {
    canCreate: boolean;
    canUpdateStatus: boolean;
    canChangeValue: boolean;
    canAddProfit: boolean;
    canCancel: boolean;
  };
}

export interface ManagerUser {
  user: string;
  pass: string;
  name: string;
  role: string;
}

export interface OrderItem {
  order_id: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  gender: 'Male' | 'Female' | 'Other' | string;
  create_date: string; // YYYY-MM-DD HH:mm:ss
  order_channel: 'Acquisition' | 'Retention' | 'KAM' | 'Call-Center' | 'Facebook' | 'Back-Office' | 'VOC' | string;
  agent_id: string;
  agent_name: string;
  product_category: 'Electronics' | 'Room Accessories' | 'Cloths' | 'Medicines' | 'Appliance' | string;
  product_name: string;
  city: string;
  delivery_area: string;
  address_details: string;
  schedule_date: string; // YYYY-MM-DD
  schedule_time: string;
  order_value: number;
  order_status: 'Pending' | 'Delivered' | 'In Progress' | 'Cancelled' | string;
  followup_status: 'Pending' | 'Delivered' | 'Confirmed' | 'Follow-up' | 'Rescheduled' | string;
  profit: number;
  delivered_date?: string;
  cancelled_date?: string;
}

export type DateFilterType = '' | 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'lastYear' | 'custom';

export interface FollowupHistoryItem {
  id: string;
  followupId: string | number;
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
  action?: string;
  notes?: string;
}
