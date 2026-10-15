import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { AgentUser, ManagerUser, OrderItem, DateFilterType, FollowupHistoryItem, AgentPermissions, AgentNavTab } from '../types';
import { OrderService } from '../services/orderService';
import { 
  User, 
  Users, 
  FileText, 
  BarChart2, 
  LogOut, 
  RotateCw, 
  RotateCcw,
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Layers, 
  MapPin,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  UserPlus,
  Shield,
  X,
  Phone,
  Mail,
  Heart,
  Calendar,
  History,
  CheckSquare,
  AlertTriangle,
  Code,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Target,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
  Tag,
  Sliders,
  FolderTree,
  FileSpreadsheet,
  CheckCircle
} from 'lucide-react';
import { 
  ORDER_CHANNELS, 
  TIME_SLOTS, 
  getOrderChannels, 
  addOrderChannel,
  removeOrderChannel,
  getProductCategories,
  addProductCategory,
  removeProductCategory,
  getOrderStatuses,
  addOrderStatus,
  removeOrderStatus,
  getTeamsList,
  addTeamItem,
  removeTeamItem,
  getTeamLeadersList,
  DEFAULT_TEAM_LEADERS,
  addTeamLeaderItem,
  removeTeamLeaderItem,
  getCategoryMappings,
  saveCategoryMappings,
  CategoryTeamMapping,
  ORDER_STATUS_LIST,
} from '../data/mockOrders';
import { AgentProfileView } from './AgentProfileView';
// ... (imports)
import { auth } from '../firebase';
// ...
export const ManagerPortal: React.FC<ManagerPortalProps> = ({
  currentManager,
  agents,
  onUpdateAgents,
  // ...
  onLogout,
  onUpdateOrderStatus
}) => {
  // ... (existing state)
  const [managerProfile, setManagerProfile] = useState<ManagerUser>(currentManager);
  // ...
  const handleUpdateManagerProfile = (updatedProfile: ManagerUser) => {
    setManagerProfile(updatedProfile);
    // You might need to add a prop to update the manager in App.tsx if needed
  };

// ... inside rendering logic for 'profiles' tab:
              {activeTab === 'profiles' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <h2 className="text-lg font-bold mb-4">Manager Profile</h2>
                  <AgentProfileView
                    currentAgent={{
                      user: managerProfile.user,
                      pass: managerProfile.pass,
                      name: managerProfile.name,
                      team: 'Manager',
                      contact: managerProfile.contact,
                      email: managerProfile.email,
                      address: managerProfile.address,
                      bloodGroup: managerProfile.bloodGroup,
                      gender: managerProfile.gender,
                      birthday: managerProfile.birthday
                    }}
                    onUpdateAgentProfile={(updated) => {
                        handleUpdateManagerProfile({
                            user: updated.user,
                            pass: updated.pass,
                            name: updated.name,
                            role: 'Manager',
                            contact: updated.contact,
                            email: updated.email,
                            address: updated.address,
                            bloodGroup: updated.bloodGroup,
                            gender: updated.gender,
                            birthday: updated.birthday
                        });
                    }}
                  />
                </div>
              )}

export const AGENT_MANAGEABLE_TABS: { id: AgentNavTab; label: string; description: string }[] = [
  { id: 'summary', label: 'Summary', description: 'Analytics, KPI metrics & sales summary' },
  { id: 'orders', label: 'Orders', description: 'Orders database, search, and order items' },
  { id: 'agent-performance', label: 'Agent Performance', description: 'Performance analytics & individual rankings' },
  { id: 'profiles', label: 'Profiles', description: 'Agent profile & personal settings' }
];

interface ManagerPortalProps {
  currentManager: ManagerUser;
  agents: AgentUser[];
  onUpdateAgents: (agents: AgentUser[], notify?: boolean) => void;
  orders: OrderItem[];
  onUpdateOrders?: (orders: OrderItem[]) => void;
  followupHistory?: FollowupHistoryItem[];
  onUpdateFollowupHistory?: (history: FollowupHistoryItem[]) => void;
  onRevertFollowup?: (historyId: string, orderId: string, previousStatus: string, undoneBy?: string) => Promise<void>;
  onRefreshOrders: () => Promise<void>;
  isRefreshing: boolean;
  onLogout: () => void;
  onUpdateOrderStatus?: (orderId: string, updates: Partial<OrderItem>, updatedBy?: string, notes?: string) => Promise<void>;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({
  currentManager,
  agents,
  onUpdateAgents,
  orders,
  onUpdateOrders,
  followupHistory = [],
  onUpdateFollowupHistory,
  onRevertFollowup,
  onRefreshOrders,
  isRefreshing,
  onLogout,
  onUpdateOrderStatus
}) => {
  const isManager = currentManager.role === 'Manager';
  const isTeamLeader = !isManager;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTabState] = useState<
    'profiles' | 'users' | 'orders' | 'summary' | 'agent-performance' | 'settings' | 'category-mapping' | 'city-area-mapping' | 'sheet-connection'
  >(() => {
    const saved = sessionStorage.getItem('manager_active_tab') as any;
    if (!isManager && (saved === 'sheet-connection' || saved === 'users' || saved === 'category-mapping' || saved === 'profiles' || saved === 'settings')) {
      return 'summary';
    }
    if (saved && saved !== 'followup') return saved;
    return isManager ? 'users' : 'summary';
  });

  const setActiveTab = (tab: 'profiles' | 'users' | 'orders' | 'summary' | 'agent-performance' | 'settings' | 'category-mapping' | 'city-area-mapping' | 'sheet-connection') => {
    if (!isManager && (tab === 'sheet-connection' || tab === 'users' || tab === 'category-mapping' || tab === 'profiles' || tab === 'settings')) {
      return;
    }
    sessionStorage.setItem('manager_active_tab', tab);
    setActiveTabState(tab);
  };
  const [managerToast, setManagerToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setManagerToast(msg);
    setTimeout(() => setManagerToast(null), 3000);
  };

  // Status & Details Modal State
  const [statusModalOrder, setStatusModalOrder] = useState<OrderItem | null>(null);
  const [modalFollowupStatus, setModalFollowupStatus] = useState<string>('Delivered');
  const [modalOrderValue, setModalOrderValue] = useState<string>('');
  const [modalProfit, setModalProfit] = useState<string>('');
  const [modalProfitPercent, setModalProfitPercent] = useState<string>('');
  const [modalScheduleDate, setModalScheduleDate] = useState<string>('');
  const [modalScheduledTime, setModalScheduledTime] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [editingAgent, setEditingAgent] = useState<AgentUser | null>(null);
  const [editingField, setEditingField] = useState<'role' | 'team' | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [isManagerCreateOrderOpen, setIsManagerCreateOrderOpen] = useState(false);

  // User Edit Modal Popup State
  const [editingAgentModal, setEditingAgentModal] = useState<AgentUser | null>(null);
  const [editModalIndex, setEditModalIndex] = useState<number | null>(null);
  const [editUser, setEditUser] = useState('');
  const [editPass, setEditPass] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('Agent');
  const [editTeam, setEditTeam] = useState('Acquisition');
  const [editContact, setEditContact] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editTeamLeaders, setEditTeamLeaders] = useState<string[]>([]);
  const [editCustomTLInput, setEditCustomTLInput] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'deactivated'>('active');
  const [editCanCreate, setEditCanCreate] = useState(true);
  const [editCanUpdateStatus, setEditCanUpdateStatus] = useState(true);
  const [editCanChangeSchedule, setEditCanChangeSchedule] = useState(true);
  const [editCanChangeValue, setEditCanChangeValue] = useState(true);
  const [editCanAddProfit, setEditCanAddProfit] = useState(true);
  const [editAllowedOrderStatuses, setEditAllowedOrderStatuses] = useState<string[]>(['Pending', 'In Progress', 'Confirmed', 'Follow-up']);
  const [editAllowedTabs, setEditAllowedTabs] = useState<AgentNavTab[]>(['summary', 'orders', 'followup', 'agent-performance', 'profiles']);

  // Agent Performance Tab Filters & Search
  const [agentPerformanceSearch, setAgentPerformanceSearch] = useState('');
  const [agentPerformanceTeamFilter, setAgentPerformanceTeamFilter] = useState('all');

  // Followup Tab State
  const [quickUpdateOrderId, setQuickUpdateOrderId] = useState<string>('');
  const [quickUpdateStatus, setQuickUpdateStatus] = useState<string>('Delivered');
  const [quickUpdateOrderValue, setQuickUpdateOrderValue] = useState<string>('');
  const [quickUpdateProfit, setQuickUpdateProfit] = useState<string>('');
  const [quickUpdateScheduleDate, setQuickUpdateScheduleDate] = useState<string>('');
  const [quickUpdateScheduledTime, setQuickUpdateScheduledTime] = useState<string>('');
  const [quickUpdateNotes, setQuickUpdateNotes] = useState<string>('');
  const [followupSearch, setFollowupSearch] = useState<string>('');
  const [viewJourneyOrder, setViewJourneyOrder] = useState<OrderItem | null>(null);

  const handleOpenOrderModal = (ord: OrderItem) => {
    setViewJourneyOrder(ord);
    setStatusModalOrder(ord);
    setModalFollowupStatus(ord.followup_status || ord.followupStatus || 'Pending');
    const oVal = String(ord.order_value ?? ord.orderValue ?? '');
    setModalOrderValue(oVal);
    const prVal = String(ord.profit ?? '');
    setModalProfit(prVal);
    const numVal = parseFloat(oVal) || 0;
    const numPr = parseFloat(prVal) || 0;
    if (numVal > 0 && numPr > 0) {
      setModalProfitPercent(((numPr / numVal) * 100).toFixed(1).replace(/\.0$/, ''));
    } else {
      setModalProfitPercent('');
    }
    setModalScheduleDate(ord.schedule_date || ord.scheduleDate || '');
    setModalScheduledTime(ord.schedule_time || ord.scheduledTime || '');
    setModalNotes('');
  };

  const handleModalProfitChange = (valStr: string) => {
    setModalProfit(valStr);
    const pr = parseFloat(valStr);
    const val = modalOrderValue !== '' ? parseFloat(modalOrderValue) : Number(statusModalOrder?.order_value ?? statusModalOrder?.orderValue ?? 0);
    if (val > 0 && !isNaN(pr)) {
      setModalProfitPercent(((pr / val) * 100).toFixed(1).replace(/\.0$/, ''));
    } else {
      setModalProfitPercent('');
    }
  };

  const handleModalProfitPercentChange = (pctStr: string) => {
    setModalProfitPercent(pctStr);
    const pct = parseFloat(pctStr);
    const val = modalOrderValue !== '' ? parseFloat(modalOrderValue) : Number(statusModalOrder?.order_value ?? statusModalOrder?.orderValue ?? 0);
    if (val > 0 && !isNaN(pct)) {
      setModalProfit(String(Math.round((val * pct) / 100)));
    } else {
      setModalProfit('');
    }
  };

  const handleApplyModalProfitPreset = (pct: number) => {
    setModalProfitPercent(String(pct));
    const val = modalOrderValue !== '' ? parseFloat(modalOrderValue) : Number(statusModalOrder?.order_value ?? statusModalOrder?.orderValue ?? 0);
    if (val > 0) {
      setModalProfit(String(Math.round((val * pct) / 100)));
    }
  };

  const handleModalOrderValueChange = (newValStr: string) => {
    setModalOrderValue(newValStr);
    const val = parseFloat(newValStr);
    const pct = parseFloat(modalProfitPercent);
    if (val > 0 && !isNaN(pct)) {
      setModalProfit(String(Math.round((val * pct) / 100)));
    }
  };

  // Google Sheet Connection & Dynamic Tabs State
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => OrderService.getScriptUrl());
  const [isConnectingSheet, setIsConnectingSheet] = useState<boolean>(false);
  const [connectedSheetTabs, setConnectedSheetTabs] = useState<string[]>(['Orders', 'Followup', 'Summary', 'Agent Performance', 'Profiles', 'History']);
  const [connectedSheetStatus, setConnectedSheetStatus] = useState<'idle' | 'connected' | 'error'>('connected');
  const [connectedSheetError, setConnectedSheetError] = useState<string | null>(null);

  const handleConnectSheet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = sheetUrlInput.trim();
    if (!url) {
      showToast('Please enter a valid Google Sheet or Apps Script URL.');
      return;
    }
    setIsConnectingSheet(true);
    setConnectedSheetError(null);
    try {
      OrderService.setScriptUrl(url);
      const res = await OrderService.fetchSheetTabsAndOrders(url);
      if (res.tabs && res.tabs.length > 0) {
        setConnectedSheetTabs(res.tabs);
      }
      if (res.orders && res.orders.length > 0 && onUpdateOrders) {
        onUpdateOrders(res.orders);
      }
      setConnectedSheetStatus('connected');
      showToast(`Successfully connected to Google Sheet! Found ${res.tabs?.length || 3} tabs & ${res.orders.length} orders synced.`);
      await onRefreshOrders();
    } catch (err: any) {
      setConnectedSheetStatus('error');
      setConnectedSheetError(err.message || 'Connection failed');
      showToast('Connection failed: Check sheet permissions or URL.');
    } finally {
      setIsConnectingSheet(false);
    }
  };

  // Auto-discover tabs on mount if default sheet is connected
  useEffect(() => {
    OrderService.fetchSheetTabsAndOrders().then(res => {
      if (res.tabs && res.tabs.length > 0) {
        setConnectedSheetTabs(res.tabs);
      }
      if (res.orders && res.orders.length > 0 && orders.length <= 10 && onUpdateOrders) {
        onUpdateOrders(res.orders);
      }
    }).catch(() => {});
  }, []);

  // Agent Management Form State (with no demo names)
  const [newAgentUser, setNewAgentUser] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPass, setNewAgentPass] = useState('');
  const [newAgentTeam, setNewAgentTeam] = useState('Acquisition');
  const [newTeamName, setNewTeamName] = useState('');
  const [newAgentTeamLeaders, setNewAgentTeamLeaders] = useState<string[]>([]);
  const [newCustomTLInput, setNewCustomTLInput] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Agent');
  const [newCanCreate, setNewCanCreate] = useState(true);
  const [newCanUpdateStatus, setNewCanUpdateStatus] = useState(true);
  const [newCanChangeSchedule, setNewCanChangeSchedule] = useState(true);
  const [newCanChangeValue, setNewCanChangeValue] = useState(true);
  const [newCanAddProfit, setNewCanAddProfit] = useState(true);
  const [newAllowedOrderStatuses, setNewAllowedOrderStatuses] = useState<string[]>(['Pending', 'In Progress', 'Confirmed', 'Follow-up']);
  const [newAllowedTabs, setNewAllowedTabs] = useState<AgentNavTab[]>(['summary', 'orders', 'followup', 'agent-performance', 'profiles']);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['Agent', 'Sr Agent', 'Team Leader']);
  const [newCustomRoleInput, setNewCustomRoleInput] = useState('');
  const [openAddAgentPopup, setOpenAddAgentPopup] = useState<'role' | 'team' | 'teamLeader' | 'accessControl' | null>(null);
  const [showTablePasswords, setShowTablePasswords] = useState<Record<string, boolean>>({});
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<AgentUser | null>(null);

  // Orders Tab Filters
  const [orderCreateFilter, setOrderCreateFilter] = useState<DateFilterType>('all');
  const [filterFollowupStatus, setFilterFollowupStatus] = useState<string>('all');
  const [orderCreateStart, setOrderCreateStart] = useState('');
  const [orderCreateEnd, setOrderCreateEnd] = useState('');

  const [orderScheduleFilter, setOrderScheduleFilter] = useState<DateFilterType>('all');
  const [orderScheduleStart, setOrderScheduleStart] = useState('');
  const [orderScheduleEnd, setOrderScheduleEnd] = useState('');

  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [searchType, setSearchType] = useState<string>('order_id');
  const [searchValue, setSearchValue] = useState('');
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number | 'all'>(50);

  // Single Summary Date Filter State
  const [summaryDateFilter, setSummaryDateFilter] = useState<DateFilterType>('all');
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');
  const [summaryBreakdownTab, setSummaryBreakdownTab] = useState<'all' | 'channel' | 'category' | 'city'>('all');

  // Sorting states for tables
  const [channelSortKey, setChannelSortKey] = useState<string>('createOrders');
  const [channelSortDirection, setChannelSortDirection] = useState<'asc' | 'desc'>('desc');

  const [categorySortKey, setCategorySortKey] = useState<string>('createOrders');
  const [categorySortDirection, setCategorySortDirection] = useState<'asc' | 'desc'>('desc');

  const [citySortKey, setCitySortKey] = useState<string>('createOrders');
  const [citySortDirection, setCitySortDirection] = useState<'asc' | 'desc'>('desc');

  const [agentSortKey, setAgentSortKey] = useState<string>('createOrders');
  const [agentSortDirection, setAgentSortDirection] = useState<'asc' | 'desc'>('desc');

  // Script URL state in Profiles
  const [profileScriptUrl, setProfileScriptUrl] = useState<string>(() => OrderService.getScriptUrl());
  const [scriptUrlSaved, setScriptUrlSaved] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<string[]>(getOrderChannels());
  const [teams, setTeams] = useState(() => OrderService.getTeams());
  const [newTeamInputName, setNewTeamInputName] = useState('');
  const [newTeamLeaderInputName, setNewTeamLeaderInputName] = useState('');
  const [csvPreviewModal, setCsvPreviewModal] = useState<{ title: string; data: any[]; filename: string } | null>(null);

  const handleAddNewTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamInputName.trim()) return;
    const teamName = newTeamInputName.trim();
    const tlName = newTeamLeaderInputName.trim() || 'Unassigned TL';
    const existing = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
    let updatedTeams;
    if (existing) {
      updatedTeams = teams.map(t => t.name.toLowerCase() === teamName.toLowerCase() ? { ...t, teamLeaderName: tlName } : t);
    } else {
      updatedTeams = [...teams, { name: teamName, teamLeaderName: tlName }];
    }
    setTeams(updatedTeams);
    OrderService.saveTeams(updatedTeams);
    addOrderChannel(teamName);
    setAvailableChannels(getOrderChannels());
    setNewTeamInputName('');
    setNewTeamLeaderInputName('');
    if (tlName && tlName !== 'Unassigned TL') {
      const tlUsername = teamName.toLowerCase() + '_tl';
      const existingAgent = agents.find(a => a.user.toLowerCase() === tlUsername.toLowerCase());
      if (!existingAgent) {
        const newAgent: AgentUser = {
          user: tlUsername,
          pass: '123456',
          name: tlName,
          role: 'Team Leader',
          team: teamName,
          email: `${tlUsername}@portal.local`,
          status: 'active',
          failedAttempts: 0
        };
        onUpdateAgents([...agents, newAgent], false);
      }
    }
  };

  const handleDeleteTeam = (teamName: string) => {
    const updated = teams.filter(t => t.name !== teamName);
    setTeams(updated);
    OrderService.saveTeams(updated);
    const updatedChannels = removeOrderChannel(teamName);
    setAvailableChannels([...updatedChannels]);
    showToast(`Team "${teamName}" removed successfully!`);
  };

  // 5-Column Category Mapping Master States & Handlers
  // 1. Category (Product Categories)
  const [categories, setCategories] = useState<string[]>(() => getProductCategories());
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // 2. Order Status
  const [orderStatuses, setOrderStatuses] = useState<string[]>(() => getOrderStatuses());
  const [newOrderStatusInput, setNewOrderStatusInput] = useState('');

  // 3. Team
  const [teamsList, setTeamsList] = useState<string[]>(() => getTeamsList());
  const [newTeamInput, setNewTeamInput] = useState('');

  // 4. Channel (Order Channels)
  const [channelsList, setChannelsList] = useState<string[]>(() => getOrderChannels());
  const [newChannelInput, setNewChannelInput] = useState('');

  // 5. Team Leader
  const [teamLeadersList, setTeamLeadersList] = useState<string[]>(() => getTeamLeadersList());
  const [newTeamLeaderInput, setNewTeamLeaderInput] = useState('');

  // Comprehensive deduplicated list of available Team Leaders for multi-select dropdowns
  const availableTeamLeaders = useMemo(() => {
    const set = new Set<string>();
    (teamLeadersList || []).forEach((tl) => {
      if (tl && tl.trim()) set.add(tl.trim());
    });
    agents.forEach((a) => {
      if (a.role === 'Team Leader') {
        if (a.name) set.add(a.name);
        if (a.user) set.add(a.user);
      }
    });
    if (set.size === 0) {
      DEFAULT_TEAM_LEADERS.forEach((tl) => set.add(tl));
    }
    return Array.from(set);
  }, [teamLeadersList, agents]);

  // Matrix mappings
  const [categoryMappings, setCategoryMappings] = useState<CategoryTeamMapping[]>(() => getCategoryMappings());

  // Mapping Form State
  const [newMappingCategory, setNewMappingCategory] = useState('');
  const [newMappingTeam, setNewMappingTeam] = useState('Acquisition');
  const [newMappingStatus, setNewMappingStatus] = useState('Pending');
  const [newMappingTeamLeader, setNewMappingTeamLeader] = useState('MD Abujar');

  // 1. Category Handlers
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const c = newCategoryInput.trim();
    if (!c) return;
    if (categories.some(cat => cat.toLowerCase() === c.toLowerCase())) {
      showToast(`Category "${c}" already exists!`);
      return;
    }
    const updated = addProductCategory(c);
    setCategories([...updated]);
    setNewCategoryInput('');
    showToast(`Category "${c}" added successfully!`);
  };

  const handleDeleteCategory = (catName: string) => {
    const updated = removeProductCategory(catName);
    setCategories([...updated]);
    const updatedMappings = categoryMappings.filter(m => m.category !== catName);
    setCategoryMappings(updatedMappings);
    saveCategoryMappings(updatedMappings);
    showToast(`Category "${catName}" removed.`);
  };

  // 2. Order Status Handlers
  const handleAddNewOrderStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const s = newOrderStatusInput.trim();
    if (!s) return;
    if (orderStatuses.some(st => st.toLowerCase() === s.toLowerCase())) {
      showToast(`Order status "${s}" already exists!`);
      return;
    }
    const updated = addOrderStatus(s);
    setOrderStatuses([...updated]);
    setNewOrderStatusInput('');
    showToast(`Order status "${s}" added!`);
  };

  const handleDeleteOrderStatus = (statusName: string) => {
    const updated = removeOrderStatus(statusName);
    setOrderStatuses([...updated]);
    showToast(`Order status "${statusName}" removed.`);
  };

  // 3. Team Handlers
  const handleAddNewTeamItem = (e: React.FormEvent) => {
    e.preventDefault();
    const t = newTeamInput.trim();
    if (!t) return;
    if (teamsList.some(item => item.toLowerCase() === t.toLowerCase())) {
      showToast(`Team "${t}" already exists!`);
      return;
    }
    const updated = addTeamItem(t);
    setTeamsList([...updated]);
    // Also add to teams state
    if (!teams.some(tm => tm.name.toLowerCase() === t.toLowerCase())) {
      const newTeamObj = { name: t, leader: newTeamLeaderInput.trim() || 'Unassigned', memberCount: 0 };
      const updatedTeams = [...teams, newTeamObj];
      setTeams(updatedTeams);
      OrderService.saveTeams(updatedTeams);
    }
    setNewTeamInput('');
    showToast(`Team "${t}" added!`);
  };

  const handleDeleteTeamItem = (teamName: string) => {
    const updated = removeTeamItem(teamName);
    setTeamsList([...updated]);
    const updatedTeams = teams.filter(t => t.name !== teamName);
    setTeams(updatedTeams);
    OrderService.saveTeams(updatedTeams);
    showToast(`Team "${teamName}" removed.`);
  };

  // 4. Channel Handlers
  const handleAddNewChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const ch = newChannelInput.trim();
    if (!ch) return;
    if (channelsList.some(item => item.toLowerCase() === ch.toLowerCase())) {
      showToast(`Channel "${ch}" already exists!`);
      return;
    }
    addOrderChannel(ch);
    const updated = getOrderChannels();
    setChannelsList([...updated]);
    setAvailableChannels([...updated]);
    setNewChannelInput('');
    showToast(`Channel "${ch}" added!`);
  };

  const handleDeleteChannel = (channelName: string) => {
    const updated = removeOrderChannel(channelName);
    setChannelsList([...updated]);
    setAvailableChannels([...updated]);
    showToast(`Channel "${channelName}" removed.`);
  };

  // 5. Team Leader Handlers
  const handleAddNewTeamLeader = (e: React.FormEvent) => {
    e.preventDefault();
    const tl = newTeamLeaderInput.trim();
    if (!tl) return;
    if (teamLeadersList.some(item => item.toLowerCase() === tl.toLowerCase())) {
      showToast(`Team Leader "${tl}" already exists!`);
      return;
    }
    const updated = addTeamLeaderItem(tl);
    setTeamLeadersList([...updated]);
    setNewTeamLeaderInput('');
    showToast(`Team Leader "${tl}" added!`);
  };

  const handleDeleteTeamLeader = (tlName: string) => {
    const updated = removeTeamLeaderItem(tlName);
    setTeamLeadersList([...updated]);
    showToast(`Team Leader "${tlName}" removed.`);
  };

  // Category Matrix Handlers
  const handleAddNewMapping = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newMappingCategory.trim();
    if (!cat) {
      showToast('Please enter or select a category to map.');
      return;
    }
    if (!categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
      const updatedCats = addProductCategory(cat);
      setCategories([...updatedCats]);
    }
    const existingIdx = categoryMappings.findIndex(m => m.category.toLowerCase() === cat.toLowerCase());
    let updated: CategoryTeamMapping[];
    if (existingIdx !== -1) {
      updated = categoryMappings.map((m, idx) => 
        idx === existingIdx ? { ...m, team: newMappingTeam, orderStatus: newMappingStatus, teamLeader: newMappingTeamLeader || 'Unassigned' } : m
      );
    } else {
      updated = [
        ...categoryMappings,
        {
          id: String(Date.now()),
          category: cat,
          orderStatus: newMappingStatus,
          team: newMappingTeam,
          teamLeader: newMappingTeamLeader || 'Unassigned'
        }
      ];
    }
    setCategoryMappings(updated);
    saveCategoryMappings(updated);
    setNewMappingCategory('');
    setNewMappingTeamLeader('');
    showToast(`Category mapping row for "${cat}" saved!`);
  };

  const handleUpdateMappingField = (id: string, field: 'category' | 'team' | 'orderStatus' | 'teamLeader', value: string) => {
    const updated = categoryMappings.map(m => m.id === id ? { ...m, [field]: value } : m);
    setCategoryMappings(updated);
    saveCategoryMappings(updated);
    showToast('Mapping rule updated!');
  };

  const handleDeleteMapping = (id: string) => {
    const updated = categoryMappings.filter(m => m.id !== id);
    setCategoryMappings(updated);
    saveCategoryMappings(updated);
    showToast('Mapping row removed.');
  };

  const handleUndoFollowup = async (historyId: string) => {
    const item = followupHistory.find(h => String(h.id) === String(historyId));
    if (!item) return;
    const isAuth = !isTeamLeader || 
                   item.updatedBy === currentManager.user ||
                   agents.some(a => a.user === item.updatedBy && (
                     a.teamLeaderId === currentManager.user ||
                     a.teamLeaderId?.includes(currentManager.user) ||
                     a.teamLeaderId?.includes(currentManager.name) ||
                     (Array.isArray(a.teamLeaders) && (
                       a.teamLeaders.includes(currentManager.user) ||
                       a.teamLeaders.includes(currentManager.name)
                     ))
                   ));
    if (!isAuth) {
      showToast('Not authorized to remove this follow-up record.');
      return;
    }

    const prevStatus = item.previousStatus || 'Pending';
    const undoneBy = currentManager.name || currentManager.user || 'Manager';
    if (onRevertFollowup) {
      await onRevertFollowup(historyId, item.orderId, prevStatus, undoneBy);
    } else {
      const res = await OrderService.revertFollowup(historyId, item.orderId, prevStatus, undoneBy);
      if (onUpdateOrders) {
        onUpdateOrders(res.updatedOrders);
      }
      if (onUpdateFollowupHistory) {
        onUpdateFollowupHistory(res.updatedHistory);
      }
    }
    showToast(`Undo successful: Order #${item.orderId} reverted from "${item.newStatus}" to "${prevStatus}", logged in history!`);
  };

  const handlePreviewCsv = (data: any[], title: string, filename: string) => {
    setCsvPreviewModal({ title, data, filename });
  };

  const formatForExport = (data: any[]) => {
    if (data.length === 0) return data;
    return data.map(item => ({
      order_id: item.order_id || item.id || '',
      customer_id: item.customer_id || item.customerId || '',
      customer_mobile: item.customer_mobile || item.customerContact || '',
      customer_name: item.customer_name || item.customerName || '',
      gender: item.gender || '',
      create_date: item.create_date || item.createDate || item.createdAt || '',
      order_channel: item.order_channel || item.orderChannel || '',
      agent_id: item.agent_id || item.agentId || '',
      agent_name: item.agent_name || item.agentName || '',
      product_category: item.product_category || item.productCategory || '',
      product_name: item.product_name || item.productName || '',
      city: item.city || '',
      delivery_area: item.delivery_area || item.deliveryArea || '',
      address_details: item.address_details || item.addressDetails || '',
      schedule_date: item.schedule_date || item.scheduleDate || '',
      schedule_time: item.schedule_time || item.scheduledTime || '',
      order_value: item.order_value || item.orderValue || 0,
      order_status: item.order_status || item.orderStatus || '',
      followup_status: item.followup_status || item.followupStatus || '',
      profit: item.profit || 0,
      delivered_date: item.delivered_date || item.deliveredDate || '',
      cancelled_date: item.cancelled_date || item.cancelledDate || '',
      followup_date: item.followup_date || item.followupDate || ''
    }));
  };

  const handleExportCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const formatted = formatForExport(data);
    const headers = Object.keys(formatted[0]).join(",");
    const rows = formatted.map(row => 
      Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXlsx = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const exportData = formatForExport(data);

    const ws = XLSX.utils.json_to_sheet(exportData, { header: Object.keys(exportData[0]) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename.replace('.csv', '.xlsx'));
  };

  const [openExportMenuId, setOpenExportMenuId] = useState<string | null>(null);

  const handleAddChannel = (channel: string) => {
    addOrderChannel(channel);
    setAvailableChannels(getOrderChannels());
    setNewAgentTeam(channel);
    setNewTeamName('');
  };

  const handleSortToggle = (
    currentKey: string,
    currentDir: 'asc' | 'desc',
    newKey: string,
    setKey: (k: string) => void,
    setDir: (d: 'asc' | 'desc') => void
  ) => {
    if (currentKey === newKey) {
      setDir(currentDir === 'asc' ? 'desc' : 'asc');
    } else {
      setKey(newKey);
      setDir('desc');
    }
  };

  const sortItems = <T extends Record<string, any>>(
    items: T[],
    sortKey: string,
    sortDirection: 'asc' | 'desc'
  ): T[] => {
    return [...items].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  // Helper date matcher
  const matchDate = (
    dateVal: string,
    filterType: DateFilterType,
    startDateVal: string,
    endDateVal: string
  ): boolean => {
    if (!dateVal || filterType === 'all' || !filterType) return true;
    const targetDate = new Date(dateVal.split(' ')[0]);
    if (isNaN(targetDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetTime = targetDate.setHours(0, 0, 0, 0);

    if (filterType === 'today') return targetTime === today.getTime();
    if (filterType === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      return targetTime === yest.getTime();
    }
    if (filterType === 'last7') {
      const limit = new Date(today);
      limit.setDate(today.getDate() - 6);
      return targetTime >= limit.getTime() && targetTime <= today.getTime();
    }
    if (filterType === 'last30') {
      const limit = new Date(today);
      limit.setDate(today.getDate() - 29);
      return targetTime >= limit.getTime() && targetTime <= today.getTime();
    }
    if (filterType === 'thisMonth') {
      return (
        targetDate.getMonth() === today.getMonth() &&
        targetDate.getFullYear() === today.getFullYear()
      );
    }
    if (filterType === 'lastMonth') {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return (
        targetDate.getMonth() === lm.getMonth() &&
        targetDate.getFullYear() === lm.getFullYear()
      );
    }
    if (filterType === 'lastYear') {
      return targetDate.getFullYear() === today.getFullYear() - 1;
    }
    if (filterType === 'custom') {
      if (!startDateVal || !endDateVal) return true;
      const s = new Date(startDateVal).getTime();
      const e = new Date(endDateVal).getTime();
      return targetTime >= s && targetTime <= e;
    }
    return true;
  };

  // Add or update agent
  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = newAgentUser.trim();
    const p = newAgentPass.trim();
    const email = newAgentEmail.trim();
    if (!u || !p || !email) return;

    if (p.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }

// Firebase auth creation removed to allow manager-side local credential management


    const permissions: AgentPermissions = {
      canCreate: newCanCreate,
      canUpdateStatus: newCanUpdateStatus,
      canChangeSchedule: newCanChangeSchedule,
      canChangeValue: newCanChangeValue,
      canAddProfit: newCanAddProfit,
      allowedOrderStatuses: newCanUpdateStatus ? newAllowedOrderStatuses : [],
      allowedTabs: newAllowedTabs
    };

    const assignedTLs = newAgentTeamLeaders;
    const primaryTL = assignedTLs.length > 0 ? assignedTLs.join(', ') : '';

    let updated: AgentUser[];
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < agents.length) {
      updated = agents.map((agent, idx) =>
        idx === editingIndex
          ? {
              ...agent,
              user: u,
              pass: p,
              team: newAgentTeam,
              teamLeaderId: primaryTL,
              teamLeaders: assignedTLs,
              name: newAgentName.trim() || agent.name || `Agent ${u}`,
              role: newAgentRole,
              email: email,
              permissions: permissions
            }
          : agent
      );
      setEditingIndex(null);
    } else {
      const existingIdx = agents.findIndex((a) => a.user.toLowerCase() === u.toLowerCase());
      if (existingIdx >= 0) {
        updated = agents.map((agent, idx) =>
          idx === existingIdx
            ? { 
                ...agent, 
                user: u, 
                pass: p, 
                team: newAgentTeam, 
                teamLeaderId: primaryTL,
                teamLeaders: assignedTLs,
                name: newAgentName.trim() || agent.name,
                role: newAgentRole,
                email: email,
                permissions: permissions
              }
            : agent
        );
      } else {
        updated = [
          ...agents,
          {
            user: u,
            pass: p,
            team: newAgentTeam,
            teamLeaderId: primaryTL,
            teamLeaders: assignedTLs,
            name: newAgentName.trim() || `Agent ${u}`,
            email: email,
            status: 'active',
            failedAttempts: 0,
            role: newAgentRole,
            permissions: permissions
          }
        ];
      }
    }

    onUpdateAgents(updated, true);
    setOpenAddAgentPopup(null);
    setNewAgentUser('');
    setNewAgentEmail('');
    setNewAgentPass('');
    setNewAgentName('');
    setNewAgentTeam('Acquisition');
    setNewAgentRole('Agent');
    setNewAgentTeamLeaders([]);
    setNewCustomTLInput('');
    setNewCanCreate(true);
    setNewCanUpdateStatus(true);
    setNewCanChangeSchedule(true);
    setNewCanChangeValue(true);
    setNewCanAddProfit(true);
    setNewAllowedOrderStatuses(['Pending', 'In Progress', 'Confirmed', 'Follow-up']);
    setNewAllowedTabs(['summary', 'orders', 'agent-performance', 'profiles']);
    showToast('Agent created/updated successfully!');
  };

  const handleEditAgent = (agentOrIndex: AgentUser | number) => {
    setOpenAddAgentPopup(null);
    const ag = typeof agentOrIndex === 'number' ? agents[agentOrIndex] : agentOrIndex;
    if (!ag) return;
    const realIdx = typeof agentOrIndex === 'number' ? agentOrIndex : agents.findIndex(a => a.user === ag.user);
    setEditModalIndex(realIdx >= 0 ? realIdx : 0);
    setEditingAgentModal(ag);
    setEditUser(ag.user);
    setEditPass(ag.pass);
    setEditName(ag.name || '');
    setEditRole(ag.role || 'Agent');
    setEditTeam(ag.team || 'Acquisition');
    setEditContact(ag.contact || '');
    setEditEmail(ag.email || '');
    setEditBloodGroup(ag.bloodGroup || '');
    setEditStatus(ag.status || 'active');
    const agTLs = Array.isArray(ag.teamLeaders) && ag.teamLeaders.length > 0
      ? ag.teamLeaders
      : (ag.teamLeaderId ? ag.teamLeaderId.split(',').map(s => s.trim()).filter(Boolean) : []);
    setEditTeamLeaders(agTLs);
    setEditCanCreate(ag.permissions?.canCreate ?? true);
    setEditCanUpdateStatus(ag.permissions?.canUpdateStatus ?? true);
    setEditCanChangeSchedule(ag.permissions?.canChangeSchedule ?? true);
    setEditCanChangeValue(ag.permissions?.canChangeValue ?? true);
    setEditCanAddProfit(ag.permissions?.canAddProfit ?? true);
    setEditAllowedOrderStatuses(
      ag.permissions?.allowedOrderStatuses && Array.isArray(ag.permissions.allowedOrderStatuses)
        ? ag.permissions.allowedOrderStatuses
        : (ag.permissions?.canUpdateStatus !== false ? ['Pending', 'In Progress', 'Confirmed', 'Follow-up'] : [])
    );
    setEditAllowedTabs(
      ag.permissions?.allowedTabs || ['summary', 'orders', 'followup', 'agent-performance', 'profiles']
    );
  };

  const handleSaveEditedAgentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editModalIndex === null || !editingAgentModal) return;

    const u = editUser.trim();
    const p = editPass.trim();
    if (!u || !p) return;

    const permissions: AgentPermissions = {
      canCreate: editCanCreate,
      canUpdateStatus: editCanUpdateStatus,
      canChangeSchedule: editCanChangeSchedule,
      canChangeValue: editCanChangeValue,
      canAddProfit: editCanAddProfit,
      allowedOrderStatuses: editCanUpdateStatus ? editAllowedOrderStatuses : [],
      allowedTabs: editAllowedTabs
    };

    const assignedTLs = editTeamLeaders;
    const primaryTL = assignedTLs.length > 0 ? assignedTLs.join(', ') : '';
    const targetUserId = editingAgentModal.user;

    const updated = agents.map((agent, idx) =>
      (agent.user === targetUserId || idx === editModalIndex)
        ? {
            ...agent,
            user: u,
            pass: p,
            name: editName.trim() || agent.name || `Agent ${u}`,
            role: editRole,
            team: editTeam,
            teamLeaderId: primaryTL,
            teamLeaders: assignedTLs,
            contact: editContact.trim(),
            email: editEmail.trim(),
            bloodGroup: editBloodGroup.trim(),
            status: editStatus,
            failedAttempts: editStatus === 'active' ? 0 : (agent.failedAttempts || 3),
            permissions: permissions
          }
        : agent
    );

    onUpdateAgents(updated, true);
    setEditingAgentModal(null);
    setEditModalIndex(null);
    setEditTeamLeaders([]);
    setEditCustomTLInput('');
    setEditAllowedOrderStatuses(['Pending', 'In Progress', 'Confirmed', 'Follow-up']);
  };

  const handleDeleteAgent = (index: number) => {
    if (agents.length <= 1) return;
    const updated = agents.filter((_, idx) => idx !== index);
    onUpdateAgents(updated, true);
  };

  // Reactivate / Deactivate Agent
  const handleToggleAgentStatus = (index: number) => {
    const agent = agents[index];
    const isCurrentlyDeactive = agent.status === 'deactivated';
    const newStatus = isCurrentlyDeactive ? 'active' : 'deactivated';

    const updated = agents.map((a, idx) =>
      idx === index
        ? {
            ...a,
            status: newStatus as 'active' | 'deactivated',
            failedAttempts: newStatus === 'active' ? 0 : a.failedAttempts || 3
          }
        : a
    );
    onUpdateAgents(updated, true);
  };

  // Filtered Orders for Orders Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((r) => {
      // DEBUG: console.log('Checking order:', r.id, 'CustID:', r.customerId, 'Search:', searchValue);
      if (!matchDate(r.create_date, orderCreateFilter, orderCreateStart, orderCreateEnd)) {
        return false;
      }
      if (!matchDate(r.schedule_date, orderScheduleFilter, orderScheduleStart, orderScheduleEnd)) {
        return false;
      }
      if (searchValue.trim()) {
        const val = searchValue.trim().toLowerCase();
        if (searchType === 'order_id') {
          const idStr = String(r.order_id || r.id || '').toLowerCase();
          if (idStr !== val) return false;
        } else if (searchType === 'customer_id') {
          const cIdStr = String(r.customer_id || r.customerId || '').trim().toLowerCase();
          if (cIdStr !== val) return false;
        } else if (searchType === 'customer_mobile') {
          const cStr = String(r.customer_mobile || r.customerContact || '').toLowerCase();
          if (cStr !== val) return false;
        } else if (searchType === 'customer_name') {
          const nStr = String(r.customer_name || r.customerName || '').toLowerCase();
          if (!nStr.includes(val)) return false;
        } else if (searchType === 'gender') {
          const gStr = String(r.gender || '').toLowerCase();
          if (gStr !== val) return false;
        } else if (searchType === 'create_date') {
          const crStr = String(r.create_date || r.createDate || '').toLowerCase();
          if (crStr !== val) return false;
        } else if (searchType === 'agent_id') {
          const aIdStr = String(r.agent_id || r.agentId || '').toLowerCase();
          if (aIdStr !== val) return false;
        } else if (searchType === 'agent_name') {
          const aNmStr = String(r.agent_name || r.agentName || '').toLowerCase();
          if (aNmStr !== val) return false;
        } else if (searchType === 'product_category') {
          const catStr = String(r.product_category || r.productCategory || '').toLowerCase();
          if (catStr !== val) return false;
        } else if (searchType === 'product_name') {
          const prodStr = String(r.product_name || r.productName || '').toLowerCase();
          if (prodStr !== val) return false;
        } else if (searchType === 'city') {
          const cityStr = String(r.city || '').toLowerCase();
          if (cityStr !== val) return false;
        } else if (searchType === 'delivery_area') {
          const areaStr = String(r.delivery_area || r.deliveryArea || '').toLowerCase();
          if (areaStr !== val) return false;
        } else if (searchType === 'address_details') {
          const addrStr = String(r.address_details || r.addressDetails || '').toLowerCase();
          if (addrStr !== val) return false;
        } else if (searchType === 'schedule_date') {
          const scDtStr = String(r.schedule_date || r.scheduleDate || '').toLowerCase();
          if (scDtStr !== val) return false;
        } else if (searchType === 'schedule_time') {
          const scTmStr = String(r.schedule_time || r.scheduledTime || '').toLowerCase();
          if (!scTmStr.includes(val)) return false;
        } else if (searchType === 'order_value') {
          const ovStr = String(r.order_value ?? r.orderValue ?? '').toLowerCase();
          if (!ovStr.includes(val)) return false;
        } else if (searchType === 'order_channel') {
          const chanStr = String(r.order_channel || r.orderChannel || '').toLowerCase();
          if (!chanStr.includes(val)) return false;
        } else if (searchType === 'order_status') {
          const ostStr = String(r.order_status || r.orderStatus || '').toLowerCase();
          if (!ostStr.includes(val)) return false;
        } else if (searchType === 'followup_status') {
          const fstStr = String(r.followup_status || r.followupStatus || '').toLowerCase();
          if (!fstStr.includes(val)) return false;
        } else if (searchType === 'profit') {
          const prStr = String(r.profit ?? '').toLowerCase();
          if (!prStr.includes(val)) return false;
        } else if (searchType === 'delivered_date') {
          const delStr = String(r.delivered_date || r.deliveredDate || '').toLowerCase();
          if (!delStr.includes(val)) return false;
        } else if (searchType === 'cancelled_date') {
          const canStr = String(r.cancelled_date || r.cancelledDate || '').toLowerCase();
          if (!canStr.includes(val)) return false;
        }
      }
      if (filterFollowupStatus !== 'all' && (r.followup_status || 'Pending') !== filterFollowupStatus) return false;
      return true;
    });
  }, [
    orders,
    orderCreateFilter,
    orderCreateStart,
    orderCreateEnd,
    orderScheduleFilter,
    orderScheduleStart,
    orderScheduleEnd,
    searchType,
    searchValue,
    filterFollowupStatus
  ]);

  // Reset page when filters change
  useEffect(() => {
    setOrderPage(1);
  }, [
    orderCreateFilter,
    orderCreateStart,
    orderCreateEnd,
    orderScheduleFilter,
    orderScheduleStart,
    orderScheduleEnd,
    searchType,
    searchValue,
    filterFollowupStatus
  ]);

  const totalOrderPages = useMemo(() => {
    if (orderPageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredOrders.length / (orderPageSize as number)));
  }, [filteredOrders.length, orderPageSize]);

  const paginatedOrders = useMemo(() => {
    if (orderPageSize === 'all') return filteredOrders;
    const size = orderPageSize as number;
    const start = (orderPage - 1) * size;
    return filteredOrders.slice(start, start + size);
  }, [filteredOrders, orderPage, orderPageSize]);

  // Summary Metrics & Aggregations with single date filter
  const orderDeliveredDateMap = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      if (o.delivered_date) map.set(String(o.order_id), o.delivered_date);
    });
    followupHistory.forEach(h => {
      if (!h.isUndone && h.newStatus?.toLowerCase() === 'delivered' && h.timestamp) {
        map.set(String(h.orderId), h.timestamp);
      }
    });
    return map;
  }, [orders, followupHistory]);

  const orderCancelledDateMap = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      if (o.cancelled_date) map.set(String(o.order_id), o.cancelled_date);
    });
    followupHistory.forEach(h => {
      if (!h.isUndone && h.newStatus?.toLowerCase() === 'cancelled' && h.timestamp) {
        map.set(String(h.orderId), h.timestamp);
      }
    });
    return map;
  }, [orders, followupHistory]);

  const summaryStats = useMemo(() => {
    let createOrdersCount = 0;
    let deliveredOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let openOrdersCount = 0; // Always Lifetime
    let openOrdersValue = 0; // Always Lifetime
    let totalOrderValue = 0;
    let deliveredOrderValue = 0;
    let totalProfit = 0;

    const buildGroupMap = () => ({
      createOrders: 0,
      servedOrders: 0,
      cancelledOrders: 0,
      orderValue: 0,
      deliveredOrderValue: 0,
      profit: 0
    });

    const chMap: Record<string, ReturnType<typeof buildGroupMap>> = {};
    const catMap: Record<string, ReturnType<typeof buildGroupMap>> = {};
    const cityMap: Record<string, ReturnType<typeof buildGroupMap>> = {};

    const buildAgentMapItem = (id: string, name: string, team: string, role: string, status: string, teamLeaderId?: string, teamLeaders?: string[]) => ({
      id,
      name,
      team,
      role,
      status,
      teamLeaderId,
      teamLeaders,
      createOrders: 0,
      servedOrders: 0,
      cancelledOrders: 0,
      pendingOrders: 0,
      orderValue: 0,
      deliveredOrderValue: 0,
      profit: 0,
      followupCount: 0
    });

    const agentMap: Record<string, ReturnType<typeof buildAgentMapItem>> = {};
    agents.forEach((a) => {
      const key = a.user.trim();
      agentMap[key] = buildAgentMapItem(
        a.user,
        a.name || `Agent ${a.user}`,
        a.team || 'Acquisition',
        a.role || 'Agent',
        a.status || 'active',
        a.teamLeaderId,
        a.teamLeaders
      );
    });

    const getOrInitAgent = (agentId: string, agentName?: string) => {
      const cleanId = (agentId || 'Unknown').trim();
      if (!agentMap[cleanId]) {
        agentMap[cleanId] = buildAgentMapItem(
          cleanId,
          agentName || cleanId,
          'Unassigned',
          'Agent',
          'active'
        );
      }
      return agentMap[cleanId];
    };

    const getOrInit = (map: Record<string, ReturnType<typeof buildGroupMap>>, key: string) => {
      const cleanKey = key || 'Unknown';
      if (!map[cleanKey]) {
        map[cleanKey] = buildGroupMap();
      }
      return map[cleanKey];
    };

    orders.forEach((r) => {
      const val = Number(r.order_value) || 0;
      const profit = Number(r.profit) || 0;
      const fStatus = (r.followup_status || '').trim().toLowerCase();
      const delivDt = orderDeliveredDateMap.get(String(r.order_id)) || r.delivered_date || '';
      const cancDt = orderCancelledDateMap.get(String(r.order_id)) || r.cancelled_date || '';

      const chItem = getOrInit(chMap, r.order_channel);
      const catItem = getOrInit(catMap, r.product_category);
      const cityItem = getOrInit(cityMap, r.city);
      const agItem = getOrInitAgent(r.agent_id, r.agent_name);

      // 1. Create Orders (Create Date)
      if (matchDate(r.create_date, summaryDateFilter, summaryStartDate, summaryEndDate)) {
        createOrdersCount++;
        totalOrderValue += val;

        chItem.createOrders += 1;
        chItem.orderValue += val;

        catItem.createOrders += 1;
        catItem.orderValue += val;

        cityItem.createOrders += 1;
        cityItem.orderValue += val;

        agItem.createOrders += 1;
        agItem.orderValue += val;
      }

      // 2. Delivered Orders (Followup status = Delivered & Delivered date exists)
      if (fStatus === 'delivered' && Boolean(delivDt)) {
        if (matchDate(delivDt, summaryDateFilter, summaryStartDate, summaryEndDate)) {
          deliveredOrdersCount++;
          deliveredOrderValue += val;
          totalProfit += profit;

          chItem.servedOrders += 1;
          chItem.deliveredOrderValue += val;
          chItem.profit += profit;

          catItem.servedOrders += 1;
          catItem.deliveredOrderValue += val;
          catItem.profit += profit;

          cityItem.servedOrders += 1;
          cityItem.deliveredOrderValue += val;
          cityItem.profit += profit;

          agItem.servedOrders += 1;
          agItem.deliveredOrderValue += val;
          agItem.profit += profit;
        }
      }

      // 3. Cancelled Orders (Followup status = Cancelled & Cancelled date exists)
      if (fStatus === 'cancelled' && Boolean(cancDt)) {
        if (matchDate(cancDt, summaryDateFilter, summaryStartDate, summaryEndDate)) {
          cancelledOrdersCount++;

          chItem.cancelledOrders += 1;
          catItem.cancelledOrders += 1;
          cityItem.cancelledOrders += 1;
          agItem.cancelledOrders += 1;
        }
      }

      // 4. Open Orders (Always Lifetime: Followup Status not in Delivered, Cancelled)
      if (fStatus !== 'delivered' && fStatus !== 'cancelled') {
        openOrdersCount++;
        openOrdersValue += val;
        agItem.pendingOrders += 1;
      }
    });

    // Also count follow-ups logged by agents
    followupHistory.forEach((h) => {
      if (!h.isUndo && h.updatedBy && matchDate(h.timestamp, summaryDateFilter, summaryStartDate, summaryEndDate)) {
        const ag = getOrInitAgent(h.updatedBy);
        ag.followupCount += 1;
      }
    });

    const totalDelivAndCanc = deliveredOrdersCount + cancelledOrdersCount;
    const deliveredRatio = totalDelivAndCanc > 0 ? Math.round((deliveredOrdersCount / totalDelivAndCanc) * 100) : 0;
    const cancelledRatio = totalDelivAndCanc > 0 ? Math.round((cancelledOrdersCount / totalDelivAndCanc) * 100) : 0;
    const bucketSize = deliveredOrdersCount > 0 ? Math.round(deliveredOrderValue / deliveredOrdersCount) : 0;
    const nrRatio = deliveredOrderValue > 0 ? Number(((totalProfit / deliveredOrderValue) * 100).toFixed(1)) : 0;

    const finalizeGroups = (map: Record<string, ReturnType<typeof buildGroupMap>>) => {
      return Object.entries(map).map(([name, item]) => {
        const totalDelivCanc = item.servedOrders + item.cancelledOrders;
        const delivRatio = totalDelivCanc > 0 ? Math.round((item.servedOrders / totalDelivCanc) * 100) : 0;
        const cancRatio = totalDelivCanc > 0 ? Math.round((item.cancelledOrders / totalDelivCanc) * 100) : 0;
        const bSize = item.servedOrders > 0 ? Math.round(item.deliveredOrderValue / item.servedOrders) : 0;
        const netRevRatio = item.deliveredOrderValue > 0 ? Number(((item.profit / item.deliveredOrderValue) * 100).toFixed(1)) : 0;

        return {
          name,
          createOrders: item.createOrders,
          servedOrders: item.servedOrders,
          cancelledOrders: item.cancelledOrders,
          orderValue: item.orderValue,
          deliveredOrderValue: item.deliveredOrderValue,
          profit: item.profit,
          bucketSize: bSize,
          deliveredRatio: delivRatio,
          cancelledRatio: cancRatio,
          nrRatio: netRevRatio
        };
      });
    };

    const channelSummary = finalizeGroups(chMap);
    const categorySummary = finalizeGroups(catMap);
    const citySummary = finalizeGroups(cityMap);

    // Filter out agents who have no data
    const agentSummary = Object.values(agentMap)
      .filter((item) => (item.createOrders + item.servedOrders + item.cancelledOrders + item.pendingOrders + item.followupCount) > 0)
      .map((item) => {
        const totalDelivCanc = item.servedOrders + item.cancelledOrders;
        const delivRatio = totalDelivCanc > 0 ? Math.round((item.servedOrders / totalDelivCanc) * 100) : 0;
        const cancRatio = totalDelivCanc > 0 ? Math.round((item.cancelledOrders / totalDelivCanc) * 100) : 0;
        const bSize = item.servedOrders > 0 ? Math.round(item.deliveredOrderValue / item.servedOrders) : 0;
        const netRevRatio = item.deliveredOrderValue > 0 ? Number(((item.profit / item.deliveredOrderValue) * 100).toFixed(1)) : 0;

        return {
          ...item,
          bucketSize: bSize,
          deliveredRatio: delivRatio,
          cancelledRatio: cancRatio,
          nrRatio: netRevRatio
        };
      });

    const computeGrandTotal = (items: Array<{
      createOrders: number;
      servedOrders: number;
      cancelledOrders: number;
      orderValue: number;
      deliveredOrderValue: number;
      profit: number;
    }>) => {
      const cOrders = items.reduce((acc, cur) => acc + (cur.createOrders || 0), 0);
      const sOrders = items.reduce((acc, cur) => acc + (cur.servedOrders || 0), 0);
      const cancOrders = items.reduce((acc, cur) => acc + (cur.cancelledOrders || 0), 0);
      const oVal = items.reduce((acc, cur) => acc + (cur.orderValue || 0), 0);
      const dVal = items.reduce((acc, cur) => acc + (cur.deliveredOrderValue || 0), 0);
      const pFit = items.reduce((acc, cur) => acc + (cur.profit || 0), 0);

      const totDC = sOrders + cancOrders;
      const dRatio = totDC > 0 ? Math.round((sOrders / totDC) * 100) : 0;
      const cRatio = totDC > 0 ? Math.round((cancOrders / totDC) * 100) : 0;
      const bSize = sOrders > 0 ? Math.round(dVal / sOrders) : 0;
      const nRatio = dVal > 0 ? Number(((pFit / dVal) * 100).toFixed(1)) : 0;

      return {
        createOrders: cOrders,
        servedOrders: sOrders,
        cancelledOrders: cancOrders,
        orderValue: oVal,
        deliveredOrderValue: dVal,
        profit: pFit,
        bucketSize: bSize,
        deliveredRatio: dRatio,
        cancelledRatio: cRatio,
        nrRatio: nRatio
      };
    };

    const channelGrandTotal = computeGrandTotal(channelSummary);
    const categoryGrandTotal = computeGrandTotal(categorySummary);
    const cityGrandTotal = computeGrandTotal(citySummary);
    const agentGrandTotal = computeGrandTotal(agentSummary);

    return {
      createOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
      openOrdersCount,
      openOrdersValue,
      totalOrderValue,
      deliveredOrderValue,
      totalProfit,
      deliveredRatio,
      cancelledRatio,
      bucketSize,
      nrRatio,
      channelSummary,
      categorySummary,
      citySummary,
      agentSummary,
      channelGrandTotal,
      categoryGrandTotal,
      cityGrandTotal,
      agentGrandTotal
    };
  }, [orders, agents, followupHistory, summaryDateFilter, summaryStartDate, summaryEndDate, orderDeliveredDateMap, orderCancelledDateMap]);

  // Sorted summaries
  const sortedChannelSummary = useMemo(() => {
    return sortItems(summaryStats.channelSummary, channelSortKey, channelSortDirection);
  }, [summaryStats.channelSummary, channelSortKey, channelSortDirection]);

  const sortedCategorySummary = useMemo(() => {
    return sortItems(summaryStats.categorySummary, categorySortKey, categorySortDirection);
  }, [summaryStats.categorySummary, categorySortKey, categorySortDirection]);

  const sortedCitySummary = useMemo(() => {
    return sortItems(summaryStats.citySummary, citySortKey, citySortDirection);
  }, [summaryStats.citySummary, citySortKey, citySortDirection]);

  const filteredAgentPerformance = useMemo(() => {
    const list = summaryStats.agentSummary.filter((ag) => {
      // If user is a Team Leader, only show agents assigned to them
      if (currentManager.role === 'Team Leader') {
        const isSelf = (ag as any).id === currentManager.user;
        const matchesTLId = (ag as any).teamLeaderId && (
          (ag as any).teamLeaderId === currentManager.user ||
          (ag as any).teamLeaderId.includes(currentManager.user) ||
          (ag as any).teamLeaderId.includes(currentManager.name)
        );
        const matchesTLArray = Array.isArray((ag as any).teamLeaders) && (
          (ag as any).teamLeaders.includes(currentManager.user) ||
          (ag as any).teamLeaders.includes(currentManager.name)
        );
        if (!isSelf && !matchesTLId && !matchesTLArray) {
          return false;
        }
      }

      const matchSearch =
        !agentPerformanceSearch ||
        String(ag.name || '').toLowerCase().includes(agentPerformanceSearch.toLowerCase()) ||
        String(ag.id || '').toLowerCase().includes(agentPerformanceSearch.toLowerCase());
      const matchTeam =
        agentPerformanceTeamFilter === 'all' ||
        ag.team === 'All' ||
        String(ag.team || '').toLowerCase() === agentPerformanceTeamFilter.toLowerCase();
      return matchSearch && matchTeam;
    });
    return sortItems(list, agentSortKey, agentSortDirection);
  }, [summaryStats.agentSummary, agentPerformanceSearch, agentPerformanceTeamFilter, agentSortKey, agentSortDirection, currentManager.role, currentManager.user]);

  const filteredAgentGrandTotal = useMemo(() => {
    const cOrders = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.createOrders || 0), 0);
    const sOrders = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.servedOrders || 0), 0);
    const cancOrders = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.cancelledOrders || 0), 0);
    const pOrders = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.pendingOrders || 0), 0);
    const oVal = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.orderValue || 0), 0);
    const dVal = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.deliveredOrderValue || 0), 0);
    const pFit = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.profit || 0), 0);
    const fCount = filteredAgentPerformance.reduce((acc, cur) => acc + (cur.followupCount || 0), 0);

    const totDC = sOrders + cancOrders;
    const dRatio = totDC > 0 ? Math.round((sOrders / totDC) * 100) : 0;
    const cRatio = totDC > 0 ? Math.round((cancOrders / totDC) * 100) : 0;
    const bSize = sOrders > 0 ? Math.round(dVal / sOrders) : 0;
    const nRatio = dVal > 0 ? Number(((pFit / dVal) * 100).toFixed(1)) : 0;

    return {
      createOrders: cOrders,
      servedOrders: sOrders,
      cancelledOrders: cancOrders,
      pendingOrders: pOrders,
      orderValue: oVal,
      deliveredOrderValue: dVal,
      profit: pFit,
      bucketSize: bSize,
      deliveredRatio: dRatio,
      cancelledRatio: cRatio,
      nrRatio: nRatio,
      followupCount: fCount
    };
  }, [filteredAgentPerformance]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden select-none">
      {managerToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{managerToast}</span>
        </div>
      )}
      {/* Manager Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col p-5 border-r border-white/10 shrink-0 transition-all duration-300`}>
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
              📊
            </div>
            {isSidebarOpen && (
              <div>
                <h2 className="font-extrabold text-sm tracking-tight text-white">Manager Portal</h2>
                <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-semibold">
                  Control Hub
                </p>
              </div>
            )}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-white/10 rounded-lg">
            <span className="text-xl">⋮</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1.5">
          {isManager && (
            <button
              onClick={() => setActiveTab('sheet-connection')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'sheet-connection'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              {isSidebarOpen && <span>Google Sheet &amp; Tabs</span>}
            </button>
          )}

          <button
            onClick={() => setActiveTab('summary')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            {isSidebarOpen && <span>Summary</span>}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isSidebarOpen && <span>Orders</span>}
            {isSidebarOpen && (
              <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                {orders.length}
              </span>
            )}
          </button>

          {/* Followup tab removed */}

          {!isTeamLeader && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              {isSidebarOpen && <span>User Details</span>}
              {isSidebarOpen && (
                <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                  {agents.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('agent-performance')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'agent-performance'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            {isSidebarOpen && <span>Agent Performance</span>}
            {isSidebarOpen && (
              <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                {summaryStats.agentSummary.length}
              </span>
            )}
          </button>

          {!isTeamLeader && (
            <>
              <button
                onClick={() => setActiveTab('category-mapping')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'category-mapping'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-300" />
                {isSidebarOpen && <span>Category Mapping</span>}
              </button>

              <button
                onClick={() => setActiveTab('profiles')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'profiles'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4" />
                {isSidebarOpen && <span>Profiles</span>}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Settings className="w-4 h-4 text-indigo-300" />
                {isSidebarOpen && <span>Settings &amp; Export</span>}
              </button>
            </>
          )}
        </nav>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Manager Desk
            </span>
            <span className="text-slate-300">•</span>
            <h1 className="text-lg font-extrabold text-slate-900 capitalize">
              {isManager && activeTab === 'sheet-connection' && 'Google Sheet & Dynamic Tabs Hub'}
              {activeTab === 'users' && 'User Details (Agent Directory)'}
              {activeTab === 'orders' && 'All Orders Database'}
              {activeTab === 'summary' && 'Analytics & Summary'}
              {activeTab === 'agent-performance' && 'Agent Performance Report'}
              {activeTab === 'category-mapping' && 'Category, Team & Status Mapping'}
              {activeTab === 'profiles' && 'Manager Profile & Sheet Integration'}
              {activeTab === 'settings' && 'System Settings & Data Export Hub'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsManagerCreateOrderOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Order</span>
            </button>

            <button
              onClick={() => onRefreshOrders()}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Sheet'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: GOOGLE SHEET & DYNAMIC TABS */}
          {isManager && activeTab === 'sheet-connection' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30 shadow-inner">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight">Google Sheet Connection &amp; Dynamic Tabs Hub</h2>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        Connect any Google Sheet or Apps Script link to instantly sync orders and discover all available tabs.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleConnectSheet} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">
                        Google Sheet Link / Apps Script Web App URL
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="url"
                          required
                          placeholder="https://script.google.com/macros/s/.../exec or Google Sheet URL"
                          value={sheetUrlInput}
                          onChange={(e) => setSheetUrlInput(e.target.value)}
                          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs font-mono text-white placeholder-indigo-300/50 focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isConnectingSheet}
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <RotateCw className={`w-4 h-4 ${isConnectingSheet ? 'animate-spin' : ''}`} />
                          <span>{isConnectingSheet ? 'Connecting...' : 'Connect Sheet'}</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {connectedSheetStatus === 'connected' && (
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected &amp; Live</span>
                        </span>
                        <span className="text-xs text-slate-300">
                          Total Orders Synced: <strong className="text-white font-extrabold">{orders.length}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRefreshOrders()}
                        className="text-xs font-semibold text-indigo-300 hover:text-white underline cursor-pointer"
                      >
                        Force Resync Data
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* DISCOVERED TABS GRID */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Discovered Sheet Tabs ({connectedSheetTabs.length})</h3>
                    <p className="text-xs text-slate-500">
                      Click any tab below to instantly switch to that workspace view.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                    Live Sync Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {connectedSheetTabs.map((tabName, idx) => {
                    const normalized = tabName.toLowerCase();
                    let targetTabKey: any = 'orders';
                    if (normalized.includes('summary')) targetTabKey = 'summary';
                    else if (normalized.includes('performance') || normalized.includes('agent')) targetTabKey = 'agent-performance';
                    else if (normalized.includes('profile')) targetTabKey = 'profiles';
                    else if (normalized.includes('setting')) targetTabKey = 'settings';
                    else if (normalized.includes('mapping')) targetTabKey = 'category-mapping';
                    else targetTabKey = 'orders';

                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveTab(targetTabKey)}
                        className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                            📋
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-white text-slate-600 rounded-lg border border-slate-200">
                            Sheet Tab
                          </span>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                            {tabName}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Click to open {targetTabKey === 'orders' ? 'Orders Database' : targetTabKey} workspace.
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-indigo-600">
                          <span>Open Workspace</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* APPS SCRIPT SETUP GUIDE FOR FULL SYNC */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      ⚡
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">How to Sync All Data &amp; Multi-Tabs Properly</h3>
                      <p className="text-xs text-slate-500">
                        Direct Google Sheet links only export the first tab. To sync all tabs (Orders, Followup, etc.), deploy our Apps Script web app URL.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const code = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var allData = {};
  sheets.forEach(function(sh) {
    var name = sh.getName();
    var values = sh.getDataRange().getValues();
    allData[name] = values;
  });
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    tabs: sheets.map(function(s){ return s.getName(); }),
    data: allData
  })).setMimeType(ContentService.MimeType.JSON);
}`;
                      navigator.clipboard.writeText(code);
                      showToast('Apps Script code copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Apps Script Code</span>
                  </button>
                </div>

                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 pl-1">
                  <li>Open your Google Sheet, click <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Paste the copied code above into the script editor and save (<code className="bg-slate-100 px-1.5 py-0.5 rounded">Ctrl + S</code>).</li>
                  <li>Click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>.</li>
                  <li>Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>, then click Deploy.</li>
                  <li>Paste the resulting Web App URL (<code className="bg-slate-100 px-1.5 py-0.5 rounded">.../exec</code>) in the input box above and click <strong>Connect Sheet</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB: USER DETAILS (AGENT DIRECTORY WITH DETAILS STORE) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* 1-ROW ADD / EDIT AGENT CARD */}
              <div id="add-edit-agent-card" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative z-40">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        {editingIndex !== null ? `Edit Agent (@${newAgentUser})` : 'Add New Agent'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        All in 1 Row — Click Team, Team Leader, and Access Control to open configuration popups.
                      </p>
                    </div>
                  </div>
                  {editingIndex !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                        Editing Mode
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null);
                          setNewAgentUser('');
                          setNewAgentPass('');
                          setNewAgentName('');
                          setNewAgentRole('Agent');
                          setNewAgentTeam('Acquisition');
                          setNewAgentTeamLeaders([]);
                          setNewCanCreate(true);
                          setNewCanUpdateStatus(true);
                          setNewCanChangeSchedule(true);
                          setNewCanChangeValue(true);
                          setNewCanAddProfit(true);
                          setNewAllowedOrderStatuses(['Pending', 'In Progress', 'Confirmed', 'Follow-up']);
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* THE 1 SINGLE ROW FORM */}
                <form onSubmit={handleSaveAgent}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
                    {/* 1. user_id (2 cols) */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        user_id <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1"
                        value={newAgentUser}
                        onChange={(e) => setNewAgentUser(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                      />
                    </div>

                    {/* 2. user_name (2 cols) */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        user_name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahim Ahmed"
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                      />
                    </div>

                    {/* 3. password (2 cols) */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. agent@example.com"
                        value={newAgentEmail}
                        onChange={(e) => setNewAgentEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                      />
                    </div>
                    
                    {/* 4. password (2 cols) */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Password"
                        value={newAgentPass}
                        onChange={(e) => setNewAgentPass(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                      />
                    </div>

                    {/* 4. role (1 col) - INLINE DROPDOWN */}
                    <div className="lg:col-span-1 relative">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        role
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenAddAgentPopup(prev => prev === 'role' ? null : 'role');
                        }}
                        className={`w-full px-2.5 py-2 text-xs rounded-lg border text-left flex items-center justify-between font-semibold transition-all cursor-pointer shadow-2xs ${
                          openAddAgentPopup === 'role'
                            ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-200'
                            : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-indigo-400 text-slate-800'
                        }`}
                        title={newAgentRole || 'Select Role'}
                      >
                        <span className="truncate">{newAgentRole || 'Agent'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5 transition-transform duration-150 ${openAddAgentPopup === 'role' ? 'rotate-180 text-indigo-600' : ''}`} />
                      </button>

                      {/* Dropdown: Role Dropdown Menu */}
                      {openAddAgentPopup === 'role' && (
                        <div
                          className="absolute top-full left-0 mt-1.5 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-indigo-600" />
                              <h4 className="font-extrabold text-sm text-slate-900">Select Role</h4>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenAddAgentPopup(null);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Existing Roles List */}
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {availableRoles.map((role) => {
                              const isSelected = newAgentRole === role;
                              const isTL = role === 'Team Leader';
                              return (
                                <button
                                  key={`pop-role-${role}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewAgentRole(role);
                                    setOpenAddAgentPopup(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border ${
                                    isSelected
                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isTL ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {role}
                                    </span>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Add Role Option at Bottom */}
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              + Add New Role
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Type new role..."
                                value={newCustomRoleInput}
                                onChange={(e) => setNewCustomRoleInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const trimmed = newCustomRoleInput.trim();
                                    if (trimmed) {
                                      if (!availableRoles.includes(trimmed)) {
                                        setAvailableRoles(prev => [...prev, trimmed]);
                                      }
                                      setNewAgentRole(trimmed);
                                      setNewCustomRoleInput('');
                                      setOpenAddAgentPopup(null);
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 bg-white"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const trimmed = newCustomRoleInput.trim();
                                  if (trimmed) {
                                    if (!availableRoles.includes(trimmed)) {
                                      setAvailableRoles(prev => [...prev, trimmed]);
                                    }
                                    setNewAgentRole(trimmed);
                                    setNewCustomRoleInput('');
                                    setOpenAddAgentPopup(null);
                                  }
                                }}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                              >
                                Add Role
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5. team (2 cols) - INLINE DROPDOWN */}
                    <div className="lg:col-span-2 relative">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        team
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenAddAgentPopup(prev => prev === 'team' ? null : 'team');
                        }}
                        className={`w-full px-3 py-2 text-xs rounded-lg border text-left flex items-center justify-between font-semibold transition-all cursor-pointer shadow-2xs ${
                          openAddAgentPopup === 'team'
                            ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-200'
                            : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-indigo-400 text-slate-800'
                        }`}
                      >
                        <span className="truncate">{newAgentTeam === 'All' ? 'All (All Select)' : (newAgentTeam || 'Select Team')}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-150 ${openAddAgentPopup === 'team' ? 'rotate-180 text-indigo-600' : ''}`} />
                      </button>

                      {/* Dropdown 1: Team Dropdown Menu */}
                      {openAddAgentPopup === 'team' && (
                        <div
                          className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-indigo-600" />
                              <h4 className="font-extrabold text-sm text-slate-900">Select Team</h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewAgentTeam('All');
                                  setOpenAddAgentPopup(null);
                                }}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200"
                              >
                                All Select
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenAddAgentPopup(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Existing Teams List */}
                          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                            {/* All Select Option */}
                            <button
                              key="pop-team-all-select"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewAgentTeam('All');
                                setOpenAddAgentPopup(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border ${
                                newAgentTeam === 'All'
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold ring-1 ring-indigo-300'
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-700">ALL</span>
                                <span>All (All Select)</span>
                              </div>
                              {newAgentTeam === 'All' && <Check className="w-4 h-4 text-indigo-600" />}
                            </button>

                            {availableChannels.map((team) => {
                              const isSelected = newAgentTeam === team;
                              return (
                                <button
                                  key={`pop-team-${team}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewAgentTeam(team);
                                    setOpenAddAgentPopup(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border ${
                                    isSelected
                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <span>{team}</span>
                                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Add Team Option at Bottom */}
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              + Add New Team
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Type new team name..."
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (newTeamName.trim()) {
                                      handleAddChannel(newTeamName.trim());
                                      setNewAgentTeam(newTeamName.trim());
                                      setNewTeamName('');
                                      setOpenAddAgentPopup(null);
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 bg-white"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (newTeamName.trim()) {
                                    handleAddChannel(newTeamName.trim());
                                    setNewAgentTeam(newTeamName.trim());
                                    setNewTeamName('');
                                    setOpenAddAgentPopup(null);
                                  }
                                }}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                              >
                                Add Team
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 6. team leader (1 col) - INLINE DROPDOWN */}
                    <div className="lg:col-span-1 relative">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        team leader
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenAddAgentPopup(prev => prev === 'teamLeader' ? null : 'teamLeader');
                        }}
                        className={`w-full px-2 py-2 text-xs rounded-lg border text-left flex items-center justify-between font-semibold transition-all cursor-pointer shadow-2xs ${
                          openAddAgentPopup === 'teamLeader'
                            ? 'border-purple-500 bg-purple-50/50 text-purple-950 ring-2 ring-purple-200'
                            : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-purple-400 text-slate-800'
                        }`}
                        title={newAgentTeamLeaders.join(', ') || 'No Team Leader'}
                      >
                        <span className="truncate">
                          {newAgentTeamLeaders.length > 0
                            ? (newAgentTeamLeaders.length === 1 ? newAgentTeamLeaders[0] : `${newAgentTeamLeaders.length} TLs`)
                            : 'Select TL'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-150 ${openAddAgentPopup === 'teamLeader' ? 'rotate-180 text-purple-600' : ''}`} />
                      </button>

                      {/* Dropdown 2: Team Leader Dropdown Menu */}
                      {openAddAgentPopup === 'teamLeader' && (
                        <div
                          className="absolute top-full left-0 sm:-left-24 lg:-left-32 mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-purple-600" />
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-900">Assign Team Leader(s)</h4>
                                <p className="text-[11px] text-slate-500">Tik mark / select one or multiple Team Leaders</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenAddAgentPopup(null);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Selected badges */}
                          {newAgentTeamLeaders.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-purple-50/60 rounded-xl border border-purple-100">
                              <span className="text-[11px] font-bold text-purple-900 mr-1">Selected ({newAgentTeamLeaders.length}):</span>
                              {newAgentTeamLeaders.map((tl) => (
                                <span
                                  key={`pop-badge-${tl}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-white text-purple-700 border border-purple-200 shadow-2xs"
                                >
                                  <span>{tl}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNewAgentTeamLeaders(prev => prev.filter(x => x !== tl));
                                    }}
                                    className="text-purple-400 hover:text-rose-600 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewAgentTeamLeaders([]);
                                }}
                                className="text-[11px] text-rose-600 hover:underline font-semibold ml-auto cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          )}

                          {/* Checkbox list */}
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {availableTeamLeaders.map((tl) => {
                              const isSelected = newAgentTeamLeaders.includes(tl);
                              return (
                                <label
                                  key={`pop-tl-${tl}`}
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                                    isSelected
                                      ? 'bg-purple-50 border-purple-200 text-purple-950 font-bold'
                                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        if (isSelected) {
                                          setNewAgentTeamLeaders(prev => prev.filter(x => x !== tl));
                                        } else {
                                          setNewAgentTeamLeaders(prev => [...prev, tl]);
                                        }
                                      }}
                                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="truncate">{tl}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* Add Team Leader Option at Bottom */}
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              + Add New Team Leader
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Type new TL name..."
                                value={newCustomTLInput}
                                onChange={(e) => setNewCustomTLInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const trimmed = newCustomTLInput.trim();
                                    if (trimmed) {
                                      const updated = addTeamLeaderItem(trimmed);
                                      setTeamLeadersList([...updated]);
                                      if (!newAgentTeamLeaders.includes(trimmed)) {
                                        setNewAgentTeamLeaders(prev => [...prev, trimmed]);
                                      }
                                      setNewCustomTLInput('');
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 bg-white"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const trimmed = newCustomTLInput.trim();
                                  if (trimmed) {
                                    const updated = addTeamLeaderItem(trimmed);
                                    setTeamLeadersList([...updated]);
                                    if (!newAgentTeamLeaders.includes(trimmed)) {
                                      setNewAgentTeamLeaders(prev => [...prev, trimmed]);
                                    }
                                    setNewCustomTLInput('');
                                  }
                                }}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                              >
                                Add TL
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenAddAgentPopup(null);
                              }}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 7. access control (1 col) - INLINE DROPDOWN */}
                    <div className="lg:col-span-1 relative">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        access control
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenAddAgentPopup(prev => prev === 'accessControl' ? null : 'accessControl');
                        }}
                        className={`w-full px-2 py-2 text-xs rounded-lg border text-left flex items-center justify-between font-bold transition-all cursor-pointer shadow-2xs ${
                          openAddAgentPopup === 'accessControl'
                            ? 'border-indigo-500 bg-indigo-100 text-indigo-950 ring-2 ring-indigo-200'
                            : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-indigo-400 text-slate-800'
                        }`}
                        title="Access Control"
                      >
                        <span className="truncate">Permissions</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-150 ${openAddAgentPopup === 'accessControl' ? 'rotate-180 text-indigo-600' : ''}`} />
                      </button>

                      {/* Dropdown: Access Control */}
                      {openAddAgentPopup === 'accessControl' && (
                        <div
                          className="absolute top-full right-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              <h4 className="font-extrabold text-sm text-slate-900">Access Control</h4>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenAddAgentPopup(null);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* 1. Order Creation Access */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Order Creation
                            </span>
                            <label className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800 transition-colors">
                              <span>Create Order</span>
                              <input
                                type="checkbox"
                                checked={newCanCreate}
                                onChange={(e) => setNewCanCreate(e.target.checked)}
                                className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                              />
                            </label>
                          </div>

                          {/* 2. Placed Order Permissions */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Placed Order Permissions
                            </span>
                            <label className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800 transition-colors">
                              <span>Schedule Change</span>
                              <input
                                type="checkbox"
                                checked={newCanChangeSchedule}
                                onChange={(e) => setNewCanChangeSchedule(e.target.checked)}
                                className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                              />
                            </label>

                            <label className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800 transition-colors">
                              <span>Price Change</span>
                              <input
                                type="checkbox"
                                checked={newCanChangeValue}
                                onChange={(e) => setNewCanChangeValue(e.target.checked)}
                                className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                              />
                            </label>

                            <label className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800 transition-colors">
                              <span>Profit</span>
                              <input
                                type="checkbox"
                                checked={newCanAddProfit}
                                onChange={(e) => setNewCanAddProfit(e.target.checked)}
                                className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                              />
                            </label>
                          </div>

                          {/* 3. Status Section */}
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newCanUpdateStatus}
                                  onChange={(e) => setNewCanUpdateStatus(e.target.checked)}
                                  className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                                />
                                <span>Status Update</span>
                              </label>
                              {newCanUpdateStatus && (
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => setNewAllowedOrderStatuses([...ORDER_STATUS_LIST])}
                                    className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                                  >
                                    All
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button
                                    type="button"
                                    onClick={() => setNewAllowedOrderStatuses([])}
                                    className="text-slate-500 font-semibold hover:underline cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}
                            </div>

                            {newCanUpdateStatus && (
                              <div className="grid grid-cols-2 gap-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
                                {ORDER_STATUS_LIST.map((st) => {
                                  const isChecked = newAllowedOrderStatuses.includes(st);
                                  return (
                                    <label
                                      key={`status-chk-${st}`}
                                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        isChecked
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <span className="truncate">{st}</span>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setNewAllowedOrderStatuses(prev => [...prev, st]);
                                          } else {
                                            setNewAllowedOrderStatuses(prev => prev.filter(x => x !== st));
                                          }
                                        }}
                                        className="rounded text-indigo-600 w-3.5 h-3.5 cursor-pointer ml-1"
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenAddAgentPopup(null);
                              }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 8. Action button (1 col) */}
                    <div className="lg:col-span-1">
                      <button
                        type="submit"
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{editingIndex !== null ? 'Save' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Transparent Backdrop to dismiss any open dropdown by clicking anywhere outside */}
                {openAddAgentPopup && (
                  <div
                    className="fixed inset-0 z-30 bg-transparent cursor-default"
                    onClick={() => setOpenAddAgentPopup(null)}
                  />
                )}
              </div>

              {/* USER DETAILS DIRECTORY TABLE (MATCHING COLUMNS) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">User Details &amp; Directory</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Overview of registered agent credentials, assigned roles, team leaders, and action controls.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                    {agents.length} Accounts Registered
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3.5">user_id</th>
                        <th className="py-3 px-3.5">email</th>
                        <th className="py-3 px-3.5">user_name</th>
                        <th className="py-3 px-3.5">password</th>
                        <th className="py-3 px-3.5">role</th>
                        <th className="py-3 px-3.5">team</th>
                        <th className="py-3 px-3.5">team leader</th>
                        <th className="py-3 px-3.5">access control</th>
                        <th className="py-3 px-3.5">status</th>
                        <th className="py-3 px-3.5 text-right">actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {agents.map((agent, index) => {
                        const isDeactivated = agent.status === 'deactivated';
                        const isTL = agent.role === 'Team Leader';
                        const isPassVisible = showTablePasswords[agent.user];
                        const perms = agent.permissions || {
                          canCreate: true,
                          canUpdateStatus: true,
                          canChangeSchedule: true,
                          canChangeValue: true,
                          canAddProfit: true,
                          allowedOrderStatuses: ['Pending', 'In Progress', 'Confirmed', 'Follow-up']
                        };
                        const tlDisplay = Array.isArray(agent.teamLeaders) && agent.teamLeaders.length > 0
                          ? agent.teamLeaders.join(', ')
                          : (agent.teamLeaderId || '-');

                        return (
                          <tr
                            key={`agent-row-${agent.user}-${index}`}
                            className={`hover:bg-indigo-50/30 transition-colors ${editingIndex === index ? 'bg-indigo-50/60 font-semibold' : ''}`}
                          >
                            {/* user_id */}
                            <td className="py-3 px-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                              @{agent.user}
                            </td>

                            {/* email */}
                            <td className="py-3 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                              {agent.email || '-'}
                            </td>

                            {/* user_name */}
                            <td className="py-3 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                              {agent.name || agent.user}
                            </td>

                            {/* password */}
                            <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{isPassVisible ? agent.pass : '••••••'}</span>
                                <button
                                  type="button"
                                  onClick={() => setShowTablePasswords(prev => ({ ...prev, [agent.user]: !prev[agent.user] }))}
                                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                  title={isPassVisible ? 'Hide Password' : 'Show Password'}
                                >
                                  {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>

                            {/* role */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleEditAgent(agent)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                  isTL ? 'bg-purple-100 hover:bg-purple-200 text-purple-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Click to edit Agent in popup modal"
                              >
                                {agent.role || 'Agent'}
                              </button>
                            </td>

                            {/* team */}
                            <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-700">
                              <button
                                type="button"
                                onClick={() => handleEditAgent(agent)}
                                className="px-2.5 py-1 rounded-lg text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-100 transition-colors cursor-pointer"
                                title="Click to edit Agent in popup modal"
                              >
                                {agent.team || 'Acquisition'}
                              </button>
                            </td>

                            {/* team leader */}
                            <td className="py-3 px-3.5 text-slate-600 max-w-[180px] truncate" title={tlDisplay}>
                              <button
                                type="button"
                                onClick={() => handleEditAgent(agent)}
                                className="text-left text-slate-600 hover:text-purple-700 max-w-[180px] truncate cursor-pointer transition-colors block"
                                title={`Click to edit Agent in popup modal (${tlDisplay})`}
                              >
                                {tlDisplay}
                              </button>
                            </td>

                            {/* access control badges */}
                            <td className="py-3 px-3.5">
                              <button
                                type="button"
                                onClick={() => handleEditAgent(agent)}
                                className="flex flex-wrap gap-1 max-w-[280px] text-left cursor-pointer hover:opacity-80 transition-opacity"
                                title="Click to edit Agent permissions in popup modal"
                              >
                                {perms.canCreate && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Order Creation: Full data input permitted">
                                    ✓ Create
                                  </span>
                                )}
                                {perms.canChangeSchedule && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200" title="Placed Orders: Schedule change permitted">
                                    Schedule
                                  </span>
                                )}
                                {perms.canChangeValue && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200" title="Placed Orders: Price/value change permitted">
                                    Price
                                  </span>
                                )}
                                {perms.canAddProfit && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title="Placed Orders: Profit edit permitted">
                                    Profit
                                  </span>
                                )}
                                {perms.canUpdateStatus && Array.isArray(perms.allowedOrderStatuses) && perms.allowedOrderStatuses.length > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200" title={`Placed Orders: Status updates allowed for: ${perms.allowedOrderStatuses.join(', ')}`}>
                                    Status ({perms.allowedOrderStatuses.length})
                                  </span>
                                )}
                              </button>
                            </td>

                            {/* status */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDeactivated ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isDeactivated ? 'Inactive' : 'Active'}
                              </span>
                            </td>

                            {/* actions */}
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditAgent(agent)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAgentStatus(index)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                    isDeactivated ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  }`}
                                >
                                  {isDeactivated ? 'Activate' : 'Deactivate'}
                                </button>
                                {agents.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAgent(index)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                    title="Delete Agent"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORDERS (ALL ORDERS TABLE WITH ALL 19 COLUMNS) */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Filters Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-sm">Filters & Search</h3>
                  <button
                    onClick={() => onRefreshOrders()}
                    disabled={isRefreshing}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>🔄 Refresh Data</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setOpenExportMenuId(openExportMenuId === 'orders' ? null : 'orders')}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📥 Export</span>
                    </button>
                    {openExportMenuId === 'orders' && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-1 w-24">
                        <button onClick={() => { handleExportCsv(filteredOrders, 'orders.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">CSV</button>
                        <button onClick={() => { handleExportXlsx(filteredOrders, 'orders.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">XLSX</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Create Date Filter */}
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      create_date
                    </label>
                    <select
                      value={orderCreateFilter}
                      onChange={(e) => setOrderCreateFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                    </select>
                  </div>

                  {/* Schedule Date Filter */}
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      schedule_date
                    </label>
                    <select
                      value={orderScheduleFilter}
                      onChange={(e) => setOrderScheduleFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                    </select>
                  </div>

                  {/* Followup Status Filter */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      followup_status
                    </label>
                    <select
                      value={filterFollowupStatus}
                      onChange={(e) => setFilterFollowupStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option key="mgr-status-all" value="all">All Statuses</option>
                      {orderStatuses.map((s, idx) => (
                        <option key={`mgr-status-${s}-${idx}`} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Combined Search */}
                  <div className="flex-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Search
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value)}
                        className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option key="mgr-search-order_id" value="order_id">order_id</option>
                        <option key="mgr-search-customer_id" value="customer_id">customer_id</option>
                        <option key="mgr-search-customer_mobile" value="customer_mobile">customer_mobile</option>
                        <option key="mgr-search-customer_name" value="customer_name">customer_name</option>
                      </select>
                      <input
                        type="text"
                        placeholder={`Search ${searchType}... (e.g. 1002)`}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && filteredOrders.length > 0) {
                            setViewJourneyOrder(filteredOrders[0]);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-hidden"
                      />
                      {searchValue.trim() && filteredOrders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setViewJourneyOrder(filteredOrders[0])}
                          className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-transform active:scale-95"
                          title="Open Order Details & Full Journey"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>View #{filteredOrders[0].order_id || filteredOrders[0].id} Journey</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">
                      Showing <strong>{filteredOrders.length === 0 ? 0 : (orderPage - 1) * (orderPageSize === 'all' ? filteredOrders.length : (orderPageSize as number)) + 1}</strong> - <strong>{orderPageSize === 'all' ? filteredOrders.length : Math.min(orderPage * (orderPageSize as number), filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> orders
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-mono text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Sheet Total: {orders.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Rows:</span>
                      <select
                        value={orderPageSize}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                          setOrderPageSize(val);
                          setOrderPage(1);
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                      >
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                        <option value={200}>200 / page</option>
                        <option value={500}>500 / page</option>
                        <option value="all">All ({filteredOrders.length})</option>
                      </select>
                    </div>

                    {orderPageSize !== 'all' && totalOrderPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={orderPage <= 1}
                          onClick={() => setOrderPage(1)}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-xs font-bold text-slate-700 cursor-pointer"
                          title="First Page"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          disabled={orderPage <= 1}
                          onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          Prev
                        </button>
                        <span className="px-2 text-xs font-medium text-slate-600">
                          <strong>{orderPage}</strong> / {totalOrderPages}
                        </span>
                        <button
                          type="button"
                          disabled={orderPage >= totalOrderPages}
                          onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          Next
                        </button>
                        <button
                          type="button"
                          disabled={orderPage >= totalOrderPages}
                          onClick={() => setOrderPage(totalOrderPages)}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-xs font-bold text-slate-700 cursor-pointer"
                          title="Last Page"
                        >
                          »
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* All 19 Columns Sticky Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white sticky top-0 z-20 font-bold">
                        <th className="py-3.5 px-3.5 whitespace-nowrap sticky left-0 z-30 bg-indigo-800 border-r border-indigo-600">order_id</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">customer_id</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">customer_mobile</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">customer_name</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">gender</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">create_date</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">order_channel</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">agent_id</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">agent_name</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">product_category</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">product_name</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">city</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">delivery_area</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">address_details</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">schedule_date</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">schedule_time</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">order_value</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">order_status</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">followup_status</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">profit</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">delivered_date</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">cancelled_date</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">followup_date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={23} className="text-center py-12 text-slate-400 font-semibold">
                            No orders found matching filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedOrders.map((ord, idx) => {
                          const isDelivered = (ord.followup_status || ord.followupStatus || '').toLowerCase() === 'delivered';
                          return (
                            <tr key={`manager-ord-${ord.order_id || ord.id || idx}-${idx}`} className="hover:bg-indigo-50/40 transition-colors">

                              <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-indigo-700 sticky left-0 z-10 bg-white border-r border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setViewJourneyOrder(ord)}
                                  className="hover:underline text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer font-bold"
                                  title="Click to open order details"
                                >
                                  <span>#{ord.order_id || ord.id}</span>
                                </button>
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800">
                                {ord.customer_id || ord.customerId}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                                {ord.customer_mobile || ord.customerContact}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-900">
                                {ord.customer_name || ord.customerName}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                                {ord.gender}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                {OrderService.formatDateTime(ord.create_date)}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                  {ord.order_channel}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-indigo-900 font-semibold">
                                {ord.agent_id}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                                {ord.agent_name}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                                {ord.product_category}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800 max-w-[200px] truncate" title={ord.product_name}>
                                {ord.product_name}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                                {ord.city}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                                {ord.delivery_area}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 max-w-[200px] truncate" title={ord.address_details}>
                                {ord.address_details}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                                {OrderService.formatDateTime(ord.schedule_date)}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                                {ord.schedule_time}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900">
                                ৳ {(ord.order_value || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {ord.order_status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                                    ord.followup_status === 'Delivered'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : ord.followup_status === 'Cancelled'
                                      ? 'bg-red-50 text-red-800 border-red-300'
                                      : ord.followup_status === 'Confirmed'
                                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                                      : ord.followup_status === 'Follow-up'
                                      ? 'bg-purple-50 text-purple-800 border-purple-300'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}>
                                  {ord.followup_status || 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-bold text-emerald-600">
                                {ord.profit && ord.profit > 0 ? `৳ ${(ord.profit || 0).toLocaleString()}` : '-'}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-emerald-700 font-medium">
                                {ord.delivered_date ? OrderService.formatDateTime(ord.delivered_date) : '-'}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-red-700 font-medium">
                                {ord.cancelled_date ? OrderService.formatDateTime(ord.cancelled_date) : '-'}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-blue-700 font-medium">
                                {ord.followup_date || ord.followupDate ? OrderService.formatDateTime(ord.followup_date || ord.followupDate) : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Pagination Bar */}
                {totalOrderPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs">
                    <span className="text-slate-600 font-medium">
                      Showing page <strong>{orderPage}</strong> of <strong>{totalOrderPages}</strong> ({filteredOrders.length} total orders)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={orderPage <= 1}
                        onClick={() => setOrderPage(1)}
                        className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                      >
                        « First
                      </button>
                      <button
                        type="button"
                        disabled={orderPage <= 1}
                        onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded shadow-xs">
                        {orderPage}
                      </span>
                      <button
                        type="button"
                        disabled={orderPage >= totalOrderPages}
                        onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))}
                        className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        disabled={orderPage >= totalOrderPages}
                        onClick={() => setOrderPage(totalOrderPages)}
                        className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                      >
                        Last »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: FOLLOWUP & SHEET SYNC - REMOVED */}
          {false && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Followup Status &amp; Order Management</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Update order status, delivery schedule date &amp; time, order values, and record audit notes directly for customer followups.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRefreshOrders()}
                    disabled={isRefreshing}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Orders</span>
                  </button>
                </div>
              </div>

              {/* Quick Status Updater Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Order Followup Status &amp; Schedule Updater</h3>
                    <p className="text-[11px] text-indigo-200">
                      Pick any Order ID, update its Followup Status, Order Value, Schedule Date &amp; Time dropdown, and log remarks.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!quickUpdateOrderId) return;
                    setIsSavingStatus(true);
                    try {
                      const isDeliv = quickUpdateStatus.toLowerCase() === 'delivered';
                      const isCanc = quickUpdateStatus.toLowerCase() === 'cancelled';
                      const nowTs = OrderService.getBdtTimestamp();
                      await onUpdateOrderStatus?.(
                        quickUpdateOrderId,
                        {
                          followupStatus: quickUpdateStatus,
                          followup_status: quickUpdateStatus,
                          orderStatus: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : 'Pending'),
                          order_status: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : 'Pending'),
                          orderValue: quickUpdateOrderValue !== '' ? parseFloat(quickUpdateOrderValue) : undefined,
                          order_value: quickUpdateOrderValue !== '' ? parseFloat(quickUpdateOrderValue) : undefined,
                          profit: isDeliv 
                            ? (quickUpdateProfit !== '' ? parseFloat(quickUpdateProfit) : Math.round((parseFloat(quickUpdateOrderValue) || 0) * 0.20)) 
                            : 0,
                          deliveredDate: isDeliv ? nowTs : '',
                          delivered_date: isDeliv ? nowTs : '',
                          cancelledDate: isCanc ? nowTs : '',
                          cancelled_date: isCanc ? nowTs : '',
                          followupDate: nowTs,
                          followup_date: nowTs,
                          scheduleDate: quickUpdateScheduleDate,
                          schedule_date: quickUpdateScheduleDate,
                          scheduledTime: quickUpdateScheduledTime,
                          schedule_time: quickUpdateScheduledTime
                        },
                        'Manager',
                        quickUpdateNotes
                      );
                      const updatedOId = quickUpdateOrderId;
                      setQuickUpdateOrderId('');
                      setQuickUpdateStatus('Pending');
                      setQuickUpdateOrderValue('');
                      setQuickUpdateProfit('');
                      setQuickUpdateScheduleDate('');
                      setQuickUpdateScheduledTime('');
                      setQuickUpdateNotes('');
                      await onRefreshOrders?.();
                      showToast(`Order #${updatedOId} followup updated & form reset!`);
                    } finally {
                      setIsSavingStatus(false);
                    }
                  }}
                  className="space-y-3.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Select Order
                      </label>
                      <select
                        value={quickUpdateOrderId}
                        onChange={(e) => {
                          const chosenId = e.target.value;
                          setQuickUpdateOrderId(chosenId);
                          const ord = orders.find((o) => String(o.order_id || o.id) === String(chosenId));
                          if (ord) {
                            setQuickUpdateStatus(ord.followup_status || ord.followupStatus || 'Pending');
                            setQuickUpdateOrderValue(String(ord.order_value ?? ord.orderValue ?? ''));
                            setQuickUpdateProfit(String(ord.profit ?? ''));
                            setQuickUpdateScheduleDate(ord.schedule_date || ord.scheduleDate || '');
                            setQuickUpdateScheduledTime(ord.schedule_time || ord.scheduledTime || '');
                          }
                        }}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      >
                        <option key="opt-quick-choose" value="">-- Choose Order ID --</option>
                        {orders.map((ord, idx) => {
                          const oId = String(ord.order_id || ord.id || idx);
                          const cName = ord.customer_name || ord.customerName || 'Customer';
                          const val = Number(ord.order_value ?? ord.orderValue ?? 0);
                          const fStatus = ord.followup_status || ord.followupStatus || 'Pending';
                          return (
                            <option key={`opt-quick-ord-${oId}-${idx}`} value={oId}>
                              #{oId} - {cName} (৳{val.toLocaleString()}) [{fStatus}]
                            </option>
                          );
                        })}
                      </select>
                      {quickUpdateOrderId && (
                        <button
                          type="button"
                          onClick={() => {
                            const ord = orders.find((o) => String(o.order_id || o.id) === String(quickUpdateOrderId));
                            if (ord) setViewJourneyOrder(ord);
                          }}
                          className="mt-1.5 text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>View #{quickUpdateOrderId} Journey &amp; History ➔</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Order Value (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quickUpdateOrderValue}
                        onChange={(e) => setQuickUpdateOrderValue(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Profit Amount (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quickUpdateProfit}
                        onChange={(e) => setQuickUpdateProfit(e.target.value)}
                        placeholder="e.g. 300 (0 if cancelled)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-emerald-400 font-bold focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Followup Status
                      </label>
                      <select
                        value={quickUpdateStatus}
                        onChange={(e) => {
                          const s = e.target.value;
                          setQuickUpdateStatus(s);
                          if (s.toLowerCase() === 'cancelled') {
                            setQuickUpdateProfit('0');
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled (Profit auto 0)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Schedule Date
                      </label>
                      <input
                        type="date"
                        value={quickUpdateScheduleDate}
                        onChange={(e) => setQuickUpdateScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Scheduled Time (Slot)
                      </label>
                      <select
                        value={quickUpdateScheduledTime}
                        onChange={(e) => setQuickUpdateScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 cursor-pointer"
                      >
                        <option key="quick-slot-default" value="">-- Select Time Slot --</option>
                        {quickUpdateScheduledTime && !TIME_SLOTS.includes(quickUpdateScheduledTime) && (
                          <option key="quick-slot-custom" value={quickUpdateScheduledTime}>{quickUpdateScheduledTime}</option>
                        )}
                        {TIME_SLOTS.map((slot, idx) => (
                          <option key={`quick-slot-${slot}-${idx}`} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Audit Note / Remarks (Stored in 'Followup' sheet)
                      </label>
                      <input
                        type="text"
                        value={quickUpdateNotes}
                        onChange={(e) => setQuickUpdateNotes(e.target.value)}
                        placeholder="e.g. Schedule updated by customer request, confirmed delivery time."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium placeholder:text-slate-500 focus:border-indigo-400"
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickUpdateOrderId('');
                          setQuickUpdateStatus('Pending');
                          setQuickUpdateOrderValue('');
                          setQuickUpdateProfit('');
                          setQuickUpdateScheduleDate('');
                          setQuickUpdateScheduledTime('');
                          setQuickUpdateNotes('');
                        }}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
                        title="Clear / Reset fields"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={!quickUpdateOrderId || isSavingStatus}
                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/30 active:scale-[0.99]"
                      >
                        {isSavingStatus ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Syncing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Update &amp; Sync Sheet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Followup Historical Audit Trail Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      <span>Historical Followup Status Audit Trail</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Complete log recorded in the 'Followup' sheet for tracking changes over time.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={followupSearch}
                      onChange={(e) => setFollowupSearch(e.target.value)}
                      placeholder="Search history by order, customer..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <th className="py-3 px-3.5 whitespace-nowrap text-indigo-700">Followup ID</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Order ID</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Timestamp</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Customer Name</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Previous Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">New Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Order Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Order Value</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Schedule</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Updated By</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Updated By Name</th>
                        <th className="py-3 px-3.5 whitespace-nowrap text-purple-700">Action Name</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Remarks / Notes</th>
                        <th className="py-3 px-3.5 whitespace-nowrap text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {followupHistory.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="text-center py-10 text-slate-400 font-semibold">
                            No followup history records logged yet. Change any order status above to create the first record!
                          </td>
                        </tr>
                      ) : (
                        followupHistory
                          .filter((h) => {
                            // Filter by current user or TL's agents
                            const isAuthorized = currentManager.role === 'Manager' || 
                                                 h.updatedBy === currentManager.user ||
                                                 agents.some(a => a.user === h.updatedBy && (
                                                   a.teamLeaderId === currentManager.user ||
                                                   a.teamLeaderId?.includes(currentManager.user) ||
                                                   a.teamLeaderId?.includes(currentManager.name) ||
                                                   (Array.isArray(a.teamLeaders) && (
                                                     a.teamLeaders.includes(currentManager.user) ||
                                                     a.teamLeaders.includes(currentManager.name)
                                                   ))
                                                 ));
                            if (!isAuthorized) return false;
                            
                            if (!followupSearch.trim()) return true;
                            const q = followupSearch.toLowerCase();
                            return (
                              String(h.followupId || '').toLowerCase().includes(q) ||
                              String(h.orderId || (h as any).order_id || '').toLowerCase().includes(q) ||
                              String(h.customerName || (h as any).customer_name || '').toLowerCase().includes(q) ||
                              String(h.previousStatus || '').toLowerCase().includes(q) ||
                              String(h.newStatus || (h as any).new_status || '').toLowerCase().includes(q) ||
                              String(h.action || '').toLowerCase().includes(q) ||
                              String(h.notes || '').toLowerCase().includes(q) ||
                              (h.isUndo ? 'undo revert'.includes(q) : false)
                            );
                          })
                          .map((hist, histIdx) => {
                            const isUndoRecord = !!hist.isUndo;
                            const isRevertedRecord = !!hist.isUndone;

                            return (
                              <tr 
                                key={`followup-hist-${hist.id || hist.followupId || histIdx}-${histIdx}`} 
                                className={`transition-colors ${isUndoRecord ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-4 border-l-amber-500' : (isRevertedRecord ? 'opacity-80 bg-slate-50/40 hover:bg-slate-100/50' : 'hover:bg-slate-50')}`}
                              >
                                <td className="py-3 px-3.5 font-mono font-bold text-indigo-800 whitespace-nowrap">
                                  #{hist.followupId || hist.id}
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {isUndoRecord && (
                                      <span title="Undo Audit Event">
                                        <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const ord = orders.find((o) => String(o.order_id || o.id) === String(hist.orderId));
                                        if (ord) setViewJourneyOrder(ord);
                                      }}
                                      className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 cursor-pointer"
                                      title="Click to view full order details & complete journey"
                                    >
                                      <span>#{hist.orderId}</span>
                                      <ExternalLink className="w-3 h-3 text-indigo-400" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {hist.timestamp}
                                </td>
                                <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap font-medium">
                                  {hist.customerName || '-'}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 font-mono whitespace-nowrap">
                                  {hist.customerContact || '-'}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  {isUndoRecord ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                      from {hist.previousStatus}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 font-medium">
                                      {hist.previousStatus}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  {isUndoRecord ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      ➔ to {hist.newStatus}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-indigo-700">
                                      {hist.newStatus}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                                  {hist.orderStatus}
                                </td>
                                <td className="py-3 px-3.5 text-slate-700 font-medium whitespace-nowrap">
                                  ৳ {hist.orderValue != null ? Number(hist.orderValue).toLocaleString() : '-'}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 text-[10px] whitespace-nowrap">
                                  {hist.scheduleDate}<br/>{hist.scheduledTime}
                                </td>
                                <td className="py-3 px-3.5 font-bold text-slate-700 whitespace-nowrap">
                                  {hist.updatedBy?.replace(/\s*\(@.*\)/, '').replace('@', '_')}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                                  {hist.updatedByName || '-'}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  {isUndoRecord ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                      <RotateCcw className="w-3 h-3 text-amber-700" />
                                      {hist.action || 'Undo / Revert'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                      {hist.action || 'Follow-up Update'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 max-w-[200px] truncate" title={hist.notes}>
                                  {hist.notes?.replace(/\(Status: (.*) -> (.*)\).*/, 'Status: $1 -> $2') || '-'}
                                </td>
                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const ord = orders.find((o) => String(o.order_id || o.id) === String(hist.orderId));
                                        if (ord) setViewJourneyOrder(ord);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-bold text-[10px] cursor-pointer transition-colors"
                                      title="Open Full Order Details & Step-by-Step Activity Journey"
                                    >
                                      <History className="w-3 h-3 text-indigo-600" />
                                      <span>Journey</span>
                                    </button>
                                    {isUndoRecord ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold text-[10px]">
                                        <RotateCcw className="w-2.5 h-2.5 text-amber-600" />
                                        Undo
                                      </span>
                                    ) : isRevertedRecord ? (
                                      <span 
                                        className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-md font-bold text-[10px] italic"
                                        title="This action has already been reverted via Undo"
                                      >
                                        Reverted
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleUndoFollowup(hist.id)}
                                        title={`Undo this follow-up & revert order back to "${hist.previousStatus}"`}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md font-bold text-[10px] cursor-pointer transition-colors"
                                      >
                                        <RotateCcw className="w-3 h-3 text-red-600" />
                                        Revert
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Summary Single Date Filter */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Summary Analytics</h3>
                  <p className="text-xs text-slate-500">Filtered automatically across create date, delivered date, and cancelled date columns.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={summaryDateFilter}
                    onChange={(e) => setSummaryDateFilter(e.target.value as DateFilterType)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7">Last 7 Days</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="lastYear">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {summaryDateFilter === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={summaryStartDate}
                        onChange={(e) => setSummaryStartDate(e.target.value)}
                        className="text-xs p-1.5 border rounded-lg"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="date"
                        value={summaryEndDate}
                        onChange={(e) => setSummaryEndDate(e.target.value)}
                        className="text-xs p-1.5 border rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-6 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Create Orders</span>
                  <p className="text-xl font-extrabold text-indigo-700 mt-1">{summaryStats.createOrdersCount}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Served Orders</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-1">{summaryStats.deliveredOrdersCount}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled Orders</span>
                  <p className="text-xl font-extrabold text-red-700 mt-1">{summaryStats.cancelledOrdersCount}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Orders</span>
                  <p className="text-xl font-extrabold text-amber-700 mt-1">{summaryStats.openOrdersCount}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Value</span>
                  <p className="text-lg font-extrabold text-amber-700 mt-1">৳ {(summaryStats.openOrdersValue || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Value</span>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">৳ {(summaryStats.totalOrderValue || 0).toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivered Value</span>
                  <p className="text-lg font-extrabold text-indigo-700 mt-1">৳ {(summaryStats.deliveredOrderValue || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profit</span>
                  <p className="text-lg font-extrabold text-emerald-700 mt-1">৳ {(summaryStats.totalProfit || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bucket Size</span>
                  <p className="text-lg font-extrabold text-blue-700 mt-1">৳ {(summaryStats.bucketSize || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">NR Ratio</span>
                  <p className="text-lg font-extrabold text-purple-600 mt-1">{summaryStats.nrRatio}%</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivered Ratio</span>
                  <p className="text-lg font-extrabold text-emerald-600 mt-1">{summaryStats.deliveredRatio}%</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled Ratio</span>
                  <p className="text-lg font-extrabold text-red-600 mt-1">{summaryStats.cancelledRatio}%</p>
                </div>
              </div>

              {/* Breakdown Tables Navigation */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Breakdown View:</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSummaryBreakdownTab('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        summaryBreakdownTab === 'all'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Breakdowns
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryBreakdownTab('channel')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        summaryBreakdownTab === 'channel'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Channel Wise ({summaryStats.channelSummary.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryBreakdownTab('category')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        summaryBreakdownTab === 'category'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Category Wise ({summaryStats.categorySummary.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryBreakdownTab('city')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        summaryBreakdownTab === 'city'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      City Wise ({summaryStats.citySummary.length})
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Click column header to sort Asc / Desc • Grand Total remains pinned at bottom
                </p>
              </div>

              {/* Channel Wise Summary */}
              {(summaryBreakdownTab === 'all' || summaryBreakdownTab === 'channel') && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Channel Wise Summary</span>
                    </h4>
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => setOpenExportMenuId(openExportMenuId === 'channel' ? null : 'channel')}
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer text-slate-700"
                      >
                        📥 Export
                      </button>
                      {openExportMenuId === 'channel' && (
                        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-1 w-24">
                          <button onClick={() => { handleExportCsv(summaryStats.channelSummary, 'channel_summary.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">CSV</button>
                          <button onClick={() => { handleExportXlsx(summaryStats.channelSummary, 'channel_summary.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">XLSX</button>
                        </div>
                      )}
                      <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                        {summaryStats.channelSummary.length} Channels
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap select-none">
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'name', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center gap-1">
                              <span>Channel</span>
                              {channelSortKey === 'name' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'createOrders', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-indigo-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Create Orders</span>
                              {channelSortKey === 'createOrders' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'servedOrders', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Served Orders</span>
                              {channelSortKey === 'servedOrders' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'cancelledOrders', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Cancelled Orders</span>
                              {channelSortKey === 'cancelledOrders' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'orderValue', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Order Value</span>
                              {channelSortKey === 'orderValue' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'deliveredOrderValue', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Delivered Value</span>
                              {channelSortKey === 'deliveredOrderValue' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'profit', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Profit</span>
                              {channelSortKey === 'profit' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'bucketSize', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-blue-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Bucket Size</span>
                              {channelSortKey === 'bucketSize' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'deliveredRatio', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Delivered Ratio</span>
                              {channelSortKey === 'deliveredRatio' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'cancelledRatio', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Cancelled Ratio</span>
                              {channelSortKey === 'cancelledRatio' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(channelSortKey, channelSortDirection, 'nrRatio', setChannelSortKey, setChannelSortDirection)}
                            className="py-3 px-3.5 text-right text-purple-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>NR Ratio</span>
                              {channelSortKey === 'nrRatio' ? (
                                channelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {sortedChannelSummary.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-6 text-slate-400 font-semibold">
                              No channel data available for the selected date filter.
                            </td>
                          </tr>
                        ) : (
                          sortedChannelSummary.map((row) => (
                            <tr key={row.name} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                              <td className="py-3 px-3.5 font-bold text-slate-900">{row.name}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-indigo-700">{row.createOrders}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-700">{row.servedOrders}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledOrders}</td>
                              <td className="py-3 px-3.5 text-right font-medium">৳ {(row.orderValue || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-700">৳ {(row.deliveredOrderValue || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-600">৳ {(row.profit || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-medium text-blue-700">৳ {(row.bucketSize || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-600">{row.deliveredRatio}%</td>
                              <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledRatio}%</td>
                              <td className="py-3 px-3.5 text-right font-bold text-purple-700">{row.nrRatio}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {sortedChannelSummary.length > 0 && (
                        <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                          <tr className="whitespace-nowrap">
                            <td className="py-3.5 px-3.5 font-black uppercase text-slate-900">Grand Total</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-indigo-700">{summaryStats.channelGrandTotal.createOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{summaryStats.channelGrandTotal.servedOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-red-700">{summaryStats.channelGrandTotal.cancelledOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black">৳ {(summaryStats.channelGrandTotal.orderValue || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">৳ {(summaryStats.channelGrandTotal.deliveredOrderValue || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-600">৳ {(summaryStats.channelGrandTotal.profit || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-blue-700">৳ {(summaryStats.channelGrandTotal.bucketSize || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{summaryStats.channelGrandTotal.deliveredRatio}%</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-red-700">{summaryStats.channelGrandTotal.cancelledRatio}%</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-purple-700">{summaryStats.channelGrandTotal.nrRatio}%</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* Category Wise Summary */}
              {(summaryBreakdownTab === 'all' || summaryBreakdownTab === 'category') && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Category Wise Summary</span>
                    </h4>
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => setOpenExportMenuId(openExportMenuId === 'category' ? null : 'category')}
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer text-slate-700"
                      >
                        📥 Export
                      </button>
                      {openExportMenuId === 'category' && (
                        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-1 w-24">
                          <button onClick={() => { handleExportCsv(summaryStats.categorySummary, 'category_summary.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">CSV</button>
                          <button onClick={() => { handleExportXlsx(summaryStats.categorySummary, 'category_summary.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">XLSX</button>
                        </div>
                      )}
                      <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                        {summaryStats.categorySummary.length} Categories
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap select-none">
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'name', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center gap-1">
                              <span>Category</span>
                              {categorySortKey === 'name' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'createOrders', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-indigo-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Create Orders</span>
                              {categorySortKey === 'createOrders' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'servedOrders', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Served Orders</span>
                              {categorySortKey === 'servedOrders' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'cancelledOrders', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Cancelled Orders</span>
                              {categorySortKey === 'cancelledOrders' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'orderValue', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Order Value</span>
                              {categorySortKey === 'orderValue' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'deliveredOrderValue', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Delivered Value</span>
                              {categorySortKey === 'deliveredOrderValue' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'profit', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Profit</span>
                              {categorySortKey === 'profit' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'bucketSize', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-blue-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Bucket Size</span>
                              {categorySortKey === 'bucketSize' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'deliveredRatio', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Delivered Ratio</span>
                              {categorySortKey === 'deliveredRatio' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'cancelledRatio', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Cancelled Ratio</span>
                              {categorySortKey === 'cancelledRatio' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(categorySortKey, categorySortDirection, 'nrRatio', setCategorySortKey, setCategorySortDirection)}
                            className="py-3 px-3.5 text-right text-purple-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>NR Ratio</span>
                              {categorySortKey === 'nrRatio' ? (
                                categorySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {sortedCategorySummary.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-6 text-slate-400 font-semibold">
                              No category data available for the selected date filter.
                            </td>
                          </tr>
                        ) : (
                          sortedCategorySummary.map((row) => (
                            <tr key={row.name} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                              <td className="py-3 px-3.5 font-bold text-slate-900">{row.name}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-indigo-700">{row.createOrders}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-700">{row.servedOrders}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledOrders}</td>
                              <td className="py-3 px-3.5 text-right font-medium">৳ {(row.orderValue || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-700">৳ {(row.deliveredOrderValue || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-600">৳ {(row.profit || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-medium text-blue-700">৳ {(row.bucketSize || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-600">{row.deliveredRatio}%</td>
                              <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledRatio}%</td>
                              <td className="py-3 px-3.5 text-right font-bold text-purple-700">{row.nrRatio}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {sortedCategorySummary.length > 0 && (
                        <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                          <tr className="whitespace-nowrap">
                            <td className="py-3.5 px-3.5 font-black uppercase text-slate-900">Grand Total</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-indigo-700">{summaryStats.categoryGrandTotal.createOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{summaryStats.categoryGrandTotal.servedOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-red-700">{summaryStats.categoryGrandTotal.cancelledOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black">৳ {(summaryStats.categoryGrandTotal.orderValue || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">৳ {(summaryStats.categoryGrandTotal.deliveredOrderValue || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-600">৳ {(summaryStats.categoryGrandTotal.profit || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-blue-700">৳ {(summaryStats.categoryGrandTotal.bucketSize || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{summaryStats.categoryGrandTotal.deliveredRatio}%</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-red-700">{summaryStats.categoryGrandTotal.cancelledRatio}%</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-purple-700">{summaryStats.categoryGrandTotal.nrRatio}%</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* City Wise Summary */}
              {(summaryBreakdownTab === 'all' || summaryBreakdownTab === 'city') && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>City Wise Summary</span>
                    </h4>
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => setOpenExportMenuId(openExportMenuId === 'city' ? null : 'city')}
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer text-slate-700"
                      >
                        📥 Export
                      </button>
                      {openExportMenuId === 'city' && (
                        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-1 w-24">
                          <button onClick={() => { handleExportCsv(summaryStats.citySummary, 'city_summary.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">CSV</button>
                          <button onClick={() => { handleExportXlsx(summaryStats.citySummary, 'city_summary.csv'); setOpenExportMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded">XLSX</button>
                        </div>
                      )}
                      <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                        {summaryStats.citySummary.length} Cities
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap select-none">
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'name', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center gap-1">
                              <span>City</span>
                              {citySortKey === 'name' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'createOrders', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-indigo-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Create Orders</span>
                              {citySortKey === 'createOrders' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'servedOrders', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Served Orders</span>
                              {citySortKey === 'servedOrders' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'cancelledOrders', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Cancelled Orders</span>
                              {citySortKey === 'cancelledOrders' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'orderValue', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Order Value</span>
                              {citySortKey === 'orderValue' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'deliveredOrderValue', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Delivered Value</span>
                              {citySortKey === 'deliveredOrderValue' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'profit', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Profit</span>
                              {citySortKey === 'profit' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'bucketSize', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-blue-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Bucket Size</span>
                              {citySortKey === 'bucketSize' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'deliveredRatio', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Delivered Ratio</span>
                              {citySortKey === 'deliveredRatio' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'cancelledRatio', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>Cancelled Ratio</span>
                              {citySortKey === 'cancelledRatio' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortToggle(citySortKey, citySortDirection, 'nrRatio', setCitySortKey, setCitySortDirection)}
                            className="py-3 px-3.5 text-right text-purple-700 cursor-pointer hover:bg-slate-200/70 transition-colors"
                          >
                            <div className="inline-flex items-center justify-end gap-1">
                              <span>NR Ratio</span>
                              {citySortKey === 'nrRatio' ? (
                                citySortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {sortedCitySummary.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-6 text-slate-400 font-semibold">
                              No city data available for the selected date filter.
                            </td>
                          </tr>
                        ) : (
                          sortedCitySummary.map((row) => (
                            <tr key={row.name} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                              <td className="py-3 px-3.5 font-bold text-slate-900">{row.name}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-indigo-700">{row.createOrders}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-700">{row.servedOrders}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledOrders}</td>
                              <td className="py-3 px-3.5 text-right font-medium">৳ {(row.orderValue || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-700">৳ {(row.deliveredOrderValue || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-600">৳ {(row.profit || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-medium text-blue-700">৳ {(row.bucketSize || 0).toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-emerald-600">{row.deliveredRatio}%</td>
                              <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledRatio}%</td>
                              <td className="py-3 px-3.5 text-right font-bold text-purple-700">{row.nrRatio}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {sortedCitySummary.length > 0 && (
                        <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                          <tr className="whitespace-nowrap">
                            <td className="py-3.5 px-3.5 font-black uppercase text-slate-900">Grand Total</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-indigo-700">{summaryStats.cityGrandTotal.createOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{summaryStats.cityGrandTotal.servedOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-red-700">{summaryStats.cityGrandTotal.cancelledOrders}</td>
                            <td className="py-3.5 px-3.5 text-right font-black">৳ {(summaryStats.cityGrandTotal.orderValue || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">৳ {(summaryStats.cityGrandTotal.deliveredOrderValue || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-600">৳ {(summaryStats.cityGrandTotal.profit || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-blue-700">৳ {(summaryStats.cityGrandTotal.bucketSize || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{summaryStats.cityGrandTotal.deliveredRatio}%</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-red-700">{summaryStats.cityGrandTotal.cancelledRatio}%</td>
                            <td className="py-3.5 px-3.5 text-right font-black text-purple-700">{summaryStats.cityGrandTotal.nrRatio}%</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AGENT PERFORMANCE REPORT */}
          {activeTab === 'agent-performance' && (
            <div className="space-y-6">
              {/* Header & Date Filter Bar */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Agent Performance Report</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Agent-wise operational analysis: orders created, served/delivered, cancellations, revenue, and profit.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={summaryDateFilter}
                      onChange={(e) => setSummaryDateFilter(e.target.value as DateFilterType)}
                      className="text-xs bg-transparent font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {summaryDateFilter === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={summaryStartDate}
                        onChange={(e) => setSummaryStartDate(e.target.value)}
                        className="text-xs p-1.5 border rounded-lg bg-white"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="date"
                        value={summaryEndDate}
                        onChange={(e) => setSummaryEndDate(e.target.value)}
                        className="text-xs p-1.5 border rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Agents</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{filteredAgentPerformance.length}</p>
                  <span className="text-[10px] text-slate-500 font-medium">Filtered Directory</span>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Created / Assigned</span>
                  <p className="text-2xl font-black text-indigo-700 mt-1">{filteredAgentGrandTotal.createOrders}</p>
                  <span className="text-[10px] text-indigo-600 font-medium">৳ {(filteredAgentGrandTotal.orderValue || 0).toLocaleString()} value</span>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Delivered Orders</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{filteredAgentGrandTotal.servedOrders}</p>
                  <span className="text-[10px] text-emerald-600 font-medium">৳ {(filteredAgentGrandTotal.deliveredOrderValue || 0).toLocaleString()} delivered</span>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Profit</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">৳ {(filteredAgentGrandTotal.profit || 0).toLocaleString()}</p>
                  <span className="text-[10px] text-emerald-600 font-medium">NR Ratio: {filteredAgentGrandTotal.nrRatio}%</span>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Success</span>
                  <p className="text-2xl font-black text-purple-700 mt-1">{filteredAgentGrandTotal.deliveredRatio}%</p>
                  <span className="text-[10px] text-red-500 font-medium">Cancel: {filteredAgentGrandTotal.cancelledRatio}%</span>
                </div>
              </div>

              {/* Search & Team Filter Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full sm:w-auto">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={agentPerformanceSearch}
                    onChange={(e) => setAgentPerformanceSearch(e.target.value)}
                    placeholder="Search by Agent ID or Full Name..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <select
                    value={agentPerformanceTeamFilter}
                    onChange={(e) => setAgentPerformanceTeamFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-hidden w-full sm:w-auto cursor-pointer"
                  >
                    <option key="perf-team-all" value="all">All Teams</option>
                    {ORDER_CHANNELS.map((ch, idx) => (
                      <option key={`perf-team-ch-${ch}-${idx}`} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Performance Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Agent Performance Breakdown</span>
                  </h4>
                  <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                    {filteredAgentPerformance.length} Results
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap select-none">
                        <th className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'name', setAgentSortKey, setAgentSortDirection)}>Agent Details</th>
                        <th className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'team', setAgentSortKey, setAgentSortDirection)}>Team</th>
                        <th className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'role', setAgentSortKey, setAgentSortDirection)}>Role</th>
                        <th className="py-3 px-3.5 text-right text-indigo-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'createOrders', setAgentSortKey, setAgentSortDirection)}>Create Orders</th>
                        <th className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'servedOrders', setAgentSortKey, setAgentSortDirection)}>Served Orders</th>
                        <th className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'cancelledOrders', setAgentSortKey, setAgentSortDirection)}>Cancelled Orders</th>
                        <th className="py-3 px-3.5 text-right text-amber-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'pendingOrders', setAgentSortKey, setAgentSortDirection)}>Pending Orders</th>
                        <th className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'orderValue', setAgentSortKey, setAgentSortDirection)}>Order Value</th>
                        <th className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'deliveredOrderValue', setAgentSortKey, setAgentSortDirection)}>Delivered Value</th>
                        <th className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'profit', setAgentSortKey, setAgentSortDirection)}>Profit</th>
                        <th className="py-3 px-3.5 text-right text-blue-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'bucketSize', setAgentSortKey, setAgentSortDirection)}>Bucket Size</th>
                        <th className="py-3 px-3.5 text-right text-emerald-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'deliveredRatio', setAgentSortKey, setAgentSortDirection)}>Delivered Ratio</th>
                        <th className="py-3 px-3.5 text-right text-red-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'cancelledRatio', setAgentSortKey, setAgentSortDirection)}>Cancelled Ratio</th>
                        <th className="py-3 px-3.5 text-right text-purple-700 cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'nrRatio', setAgentSortKey, setAgentSortDirection)}>NR Ratio</th>
                        <th className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'followupCount', setAgentSortKey, setAgentSortDirection)}>Follow-ups</th>
                        <th className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-200/70" onClick={() => handleSortToggle(agentSortKey, agentSortDirection, 'status', setAgentSortKey, setAgentSortDirection)}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredAgentPerformance.length === 0 ? (
                        <tr>
                          <td colSpan={16} className="text-center py-6 text-slate-400 font-semibold">
                            No agent found matching the filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAgentPerformance.map((row, index) => (
                          <tr key={`${row.id}-${index}`} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                            <td className="py-3 px-3.5 font-bold text-slate-900">
                              <div>{row.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">@{row.id}</div>
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {row.team}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.role === 'Team Leader' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}`}>
                                {row.role}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right font-bold text-indigo-700">{row.createOrders}</td>
                            <td className="py-3 px-3.5 text-right font-bold text-emerald-700">{row.servedOrders}</td>
                            <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledOrders}</td>
                            <td className="py-3 px-3.5 text-right font-medium text-amber-600">{row.pendingOrders}</td>
                            <td className="py-3 px-3.5 text-right font-medium">৳ {(row.orderValue || 0).toLocaleString()}</td>
                            <td className="py-3 px-3.5 text-right font-bold text-emerald-700">৳ {(row.deliveredOrderValue || 0).toLocaleString()}</td>
                            <td className="py-3 px-3.5 text-right font-bold text-emerald-600">৳ {(row.profit || 0).toLocaleString()}</td>
                            <td className="py-3 px-3.5 text-right font-medium text-blue-700">৳ {(row.bucketSize || 0).toLocaleString()}</td>
                            <td className="py-3 px-3.5 text-right font-bold text-emerald-600">{row.deliveredRatio}%</td>
                            <td className="py-3 px-3.5 text-right font-bold text-red-600">{row.cancelledRatio}%</td>
                            <td className="py-3 px-3.5 text-right font-bold text-purple-700">{row.nrRatio}%</td>
                            <td className="py-3 px-3.5 text-center font-bold text-slate-700">{row.followupCount}</td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'deactivated' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {row.status === 'deactivated' ? 'Locked' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredAgentPerformance.length > 0 && (
                      <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <tr className="whitespace-nowrap">
                          <td className="py-3.5 px-3.5 font-black uppercase text-slate-900">Grand Total</td>
                          <td className="py-3.5 px-3.5 font-bold text-slate-500">-</td>
                          <td className="py-3.5 px-3.5 font-bold text-slate-500">-</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-indigo-700">{filteredAgentGrandTotal.createOrders}</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{filteredAgentGrandTotal.servedOrders}</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-red-700">{filteredAgentGrandTotal.cancelledOrders}</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-amber-700">{filteredAgentGrandTotal.pendingOrders}</td>
                          <td className="py-3.5 px-3.5 text-right font-black">৳ {(filteredAgentGrandTotal.orderValue || 0).toLocaleString()}</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">৳ {(filteredAgentGrandTotal.deliveredOrderValue || 0).toLocaleString()}</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-emerald-600">৳ {(filteredAgentGrandTotal.profit || 0).toLocaleString()}</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-blue-700">৳ {(filteredAgentGrandTotal.bucketSize || 0).toLocaleString()}</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-emerald-700">{filteredAgentGrandTotal.deliveredRatio}%</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-red-700">{filteredAgentGrandTotal.cancelledRatio}%</td>
                          <td className="py-3.5 px-3.5 text-right font-black text-purple-700">{filteredAgentGrandTotal.nrRatio}%</td>
                          <td className="py-3.5 px-3.5 text-center font-black text-slate-900">{filteredAgentGrandTotal.followupCount}</td>
                          <td className="py-3.5 px-3.5 text-center font-bold text-slate-500">-</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROFILES */}
          {activeTab === 'profiles' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Manager Profile</h2>
              <AgentProfileView
                currentAgent={{
                  user: managerProfile.user,
                  pass: managerProfile.pass,
                  name: managerProfile.name,
                  team: 'Manager',
                  contact: managerProfile.contact,
                  email: managerProfile.email,
                  address: managerProfile.address,
                  bloodGroup: managerProfile.bloodGroup,
                  gender: managerProfile.gender,
                  birthday: managerProfile.birthday
                }}
                onUpdateAgentProfile={(updated) => {
                    handleUpdateManagerProfile({
                        user: updated.user,
                        pass: updated.pass,
                        name: updated.name,
                        role: 'Manager',
                        contact: updated.contact,
                        email: updated.email,
                        address: updated.address,
                        bloodGroup: updated.bloodGroup,
                        gender: updated.gender,
                        birthday: updated.birthday
                    });
                }}
              />
            </div>
          )}


          {/* TAB: SETTINGS & EXPORT HUB */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Manager Settings &amp; Data Export Hub</h3>
                      <p className="text-xs text-slate-500">Configure Apps Script integration, export CSV with preview, and manage system data.</p>
                    </div>
                  </div>
                </div>

                {/* CSV Export with Preview */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm">CSV Data Export &amp; Preview</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div>
                        <h5 className="font-bold text-xs text-slate-800">Followup History CSV</h5>
                        <p className="text-[11px] text-slate-500">{followupHistory.length} audit logs</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handlePreviewCsv(followupHistory, 'Followup History CSV Preview', 'followup_history_export.csv')} className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer">Preview</button>
                        <button onClick={() => handleExportCsv(followupHistory, 'followup_history_export.csv')} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer">Download</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Google Apps Script Integration */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">Google Apps Script Web App URL</h4>
                    <span className="text-[11px] text-slate-400">Live dual-sheet sync ('Sheet1' &amp; 'Followup')</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={profileScriptUrl}
                      onChange={(e) => setProfileScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        OrderService.setScriptUrl(profileScriptUrl);
                        setScriptUrlSaved(true);
                        setTimeout(() => setScriptUrlSaved(false), 3000);
                        onRefreshOrders();
                      }}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {scriptUrlSaved ? 'Saved & Synced!' : 'Save & Sync'}
                    </button>
                  </div>

                  {/* Apps Script Action Controls: Copy, View, Download */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-800">
                      Google Apps Script Code
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(OrderService.getUpdatedAppsScriptCode());
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2500);
                          showToast('Apps Script copied to clipboard!');
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        {copiedScript ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Script Code</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAppsScriptModal(true)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Code className="w-3.5 h-3.5 text-indigo-300" />
                        <span>View Script (Pop-up)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([OrderService.getUpdatedAppsScriptCode()], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = 'Code.gs';
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span>Download .gs</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CATEGORY & TEAM MAPPING */}
          {activeTab === 'category-mapping' && (
            <div className="max-w-6xl space-y-6">
              {/* Header Hero */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xl border border-indigo-400/30">
                      🏷️
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">Category, Order Status, Team, Channel &amp; Team Leader</h3>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        Manage master configuration lists for Categories, Order Statuses, Teams, Channels, and Team Leaders. Add or remove items dynamically.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-white/10 text-indigo-100 font-bold px-3 py-1.5 rounded-xl border border-white/10">
                      5 Master Columns
                    </span>
                  </div>
                </div>

                {/* Quick Column Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Categories</span>
                    <span className="text-lg font-extrabold text-white mt-0.5 block">{categories.length}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Order Statuses</span>
                    <span className="text-lg font-extrabold text-white mt-0.5 block">{orderStatuses.length}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Teams</span>
                    <span className="text-lg font-extrabold text-white mt-0.5 block">{teamsList.length}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider block">Channels</span>
                    <span className="text-lg font-extrabold text-white mt-0.5 block">{channelsList.length}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Team Leaders</span>
                    <span className="text-lg font-extrabold text-white mt-0.5 block">{teamLeadersList.length}</span>
                  </div>
                </div>
              </div>

              {/* 5 MASTER CONFIGURATION COLUMNS SIDE BY SIDE (Category | Order Status | Team | Channel | Team Leader) */}
              <div className="grid grid-cols-5 gap-3">
                {/* Column 1: Category */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏷️</span>
                      <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Category</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {categories.length}
                    </span>
                  </div>
                  {/* Add form */}
                  <form onSubmit={handleAddNewCategory} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="Add category..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </form>
                  {/* List */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-64 pr-1">
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-xs transition-colors group"
                      >
                        <span className="font-semibold text-slate-800 truncate" title={cat}>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          title={`Remove ${cat}`}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Order Status */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📊</span>
                      <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Order Status</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {orderStatuses.length}
                    </span>
                  </div>
                  {/* Add form */}
                  <form onSubmit={handleAddNewOrderStatus} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      value={newOrderStatusInput}
                      onChange={(e) => setNewOrderStatusInput(e.target.value)}
                      placeholder="Add status..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </form>
                  {/* List */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-64 pr-1">
                    {orderStatuses.map((st) => (
                      <div
                        key={st}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-xs transition-colors group"
                      >
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold truncate ${
                          st === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                          st === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          st === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                          st === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-800'
                        }`} title={st}>{st}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrderStatus(st)}
                          title={`Remove ${st}`}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: Team */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👥</span>
                      <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Team</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {teamsList.length}
                    </span>
                  </div>
                  {/* Add form */}
                  <form onSubmit={handleAddNewTeamItem} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      value={newTeamInput}
                      onChange={(e) => setNewTeamInput(e.target.value)}
                      placeholder="Add team..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </form>
                  {/* List */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-64 pr-1">
                    {teamsList.map((tm) => (
                      <div
                        key={tm}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-xs transition-colors group"
                      >
                        <span className="font-semibold text-slate-800 truncate" title={tm}>{tm}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeamItem(tm)}
                          title={`Remove ${tm}`}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 4: Channel */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🌐</span>
                      <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Channel</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {channelsList.length}
                    </span>
                  </div>
                  {/* Add form */}
                  <form onSubmit={handleAddNewChannel} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      value={newChannelInput}
                      onChange={(e) => setNewChannelInput(e.target.value)}
                      placeholder="Add channel..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </form>
                  {/* List */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-64 pr-1">
                    {channelsList.map((ch) => (
                      <div
                        key={ch}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-xs transition-colors group"
                      >
                        <span className="font-semibold text-slate-800 truncate" title={ch}>{ch}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(ch)}
                          title={`Remove ${ch}`}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 5: Team Leader */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👔</span>
                      <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Team Leader</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {teamLeadersList.length}
                    </span>
                  </div>
                  {/* Add form */}
                  <form onSubmit={handleAddNewTeamLeader} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      value={newTeamLeaderInput}
                      onChange={(e) => setNewTeamLeaderInput(e.target.value)}
                      placeholder="Add leader..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </form>
                  {/* List */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-64 pr-1">
                    {teamLeadersList.map((tl) => (
                      <div
                        key={tl}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-xs transition-colors group"
                      >
                        <span className="font-semibold text-slate-800 truncate" title={tl}>{tl}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeamLeader(tl)}
                          title={`Remove ${tl}`}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CSV Preview Modal */}
      {csvPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{csvPreviewModal.title}</h3>
                <p className="text-xs text-slate-500">Showing first {Math.min(csvPreviewModal.data.length, 50)} records of {csvPreviewModal.data.length} total rows</p>
              </div>
              <button
                onClick={() => setCsvPreviewModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {csvPreviewModal.data.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold">No data available to preview.</div>
              ) : (
                <div className="overflow-x-auto border rounded-xl border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-200">
                        {Object.keys(csvPreviewModal.data[0]).map((key) => (
                          <th key={key} className="py-2.5 px-3 whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvPreviewModal.data.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 whitespace-nowrap">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={String(val ?? '')}>
                              {String(val ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setCsvPreviewModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  handleExportCsv(csvPreviewModal.data, csvPreviewModal.filename);
                  setCsvPreviewModal(null);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <span>Download CSV File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Order Details & Complete Activity Journey */}
      {viewJourneyOrder && (
        <OrderJourneyModal
          order={viewJourneyOrder}
          onClose={() => setViewJourneyOrder(null)}
          followupHistory={followupHistory}
          currentUser={{
            name: currentManager.name || currentManager.user,
            user: currentManager.user,
            role: currentManager.role || 'Manager'
          }}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onRefreshOrders={onRefreshOrders}
          canEdit={true}
        />
      )}

      {/* Modal: Status & Remarks Update Modal */}
      {statusModalOrder && (
        <OrderJourneyModal
          order={statusModalOrder}
          onClose={() => setStatusModalOrder(null)}
          followupHistory={followupHistory}
          currentUser={{
            name: currentManager.name || currentManager.user,
            user: currentManager.user,
            role: currentManager.role || 'Manager'
          }}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onRefreshOrders={onRefreshOrders}
          canEdit={true}
        />
      )}

      {/* Modal: Google Apps Script Dual-Sheet Code */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Google Apps Script Dual-Sheet Sync Code
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Supports in-place Sheet1 update &amp; 'Followup' sheet historical logging
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 shrink-0 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
              <p className="font-bold text-[12px] text-amber-950 flex items-center gap-1.5">
                <span>⚠️ Why didn't history save previously? (Apps Script Update Required)</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                The previously deployed script in your Google Sheet only handled adding new orders. To enable order value, schedule, and follow-up status updates along with audit trail logging in the <strong>'Followup'</strong> sheet, update your <strong>Code.gs</strong> with the script below:
              </p>
              <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-slate-800 font-medium pt-1">
                <li>In your Google Sheet, open <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Clear all existing code in <strong>Code.gs</strong>, paste the script below, and click <strong>Save</strong> (💾).</li>
                <li>Click <strong>Deploy &gt; Manage deployments</strong> &gt; Edit (pencil icon) &gt; Version: <strong>"New version"</strong>, and click <strong>Deploy</strong>.</li>
              </ol>
            </div>

            <div className="relative flex-1 min-h-[220px] bg-slate-900 rounded-xl p-3 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400 shrink-0">
                <span>Code.gs</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(OrderService.getUpdatedAppsScriptCode());
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="flex-1 overflow-auto text-[11px] font-mono text-slate-200 mt-2 p-1 leading-relaxed">
                {OrderService.getUpdatedAppsScriptCode()}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Agent Details Card */}
      {selectedAgentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  {selectedAgentDetails.user.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {selectedAgentDetails.name || selectedAgentDetails.user}
                  </h3>
                  <p className="text-[11px] text-slate-400">Agent ID: {selectedAgentDetails.user}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Password</span>
                <span className="font-mono font-bold text-slate-800">{selectedAgentDetails.pass}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Team</span>
                <span className="font-bold text-indigo-700">{selectedAgentDetails.team}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Contact
                </span>
                <span className="font-mono text-slate-700">{selectedAgentDetails.contact || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </span>
                <span className="text-slate-700 truncate block">{selectedAgentDetails.email || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" /> Blood Group
                </span>
                <span className="font-bold text-red-700">{selectedAgentDetails.bloodGroup || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Birthday
                </span>
                <span className="font-mono text-slate-700">{selectedAgentDetails.birthday || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl col-span-2 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Role &amp; Authorized Permissions
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${selectedAgentDetails.role === 'Team Leader' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {selectedAgentDetails.role || 'Agent'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canCreate ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Create
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canUpdateStatus ?? true ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Status
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canChangeSchedule ?? true ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Schedule
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canChangeValue ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Value
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canAddProfit ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Profit
                  </span>
                </div>

                {/* Granular Order Statuses in Details */}
                {selectedAgentDetails.permissions?.canUpdateStatus && (
                  <div className="pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      Permitted Order Statuses ({selectedAgentDetails.permissions.allowedOrderStatuses?.length || 'All'}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(selectedAgentDetails.permissions.allowedOrderStatuses || ORDER_STATUS_LIST).map((st) => {
                        const isDeliv = st.toLowerCase() === 'delivered';
                        const isCanc = st.toLowerCase() === 'cancelled';
                        return (
                          <span
                            key={`det-st-${st}`}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isDeliv 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : isCanc 
                                ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {st}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Permitted Tabs in Details */}
                <div className="pt-1.5 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    Permitted Navigation Tabs ({(selectedAgentDetails.permissions?.allowedTabs || ['summary', 'orders', 'followup', 'agent-performance', 'profiles']).length}/5):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {AGENT_MANAGEABLE_TABS.map((tab) => {
                      const allowedList = selectedAgentDetails.permissions?.allowedTabs || ['summary', 'orders', 'followup', 'agent-performance', 'profiles'];
                      const isAllowed = allowedList.includes(tab.id) ||
                        (tab.id === 'agent-performance' && (allowedList as any[]).includes('dashboard'));
                      return (
                        <span
                          key={`det-tab-${tab.id}`}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isAllowed
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {isAllowed ? '✓' : '✗'} {tab.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Assigned Team Leader(s)
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedAgentDetails.teamLeaders && selectedAgentDetails.teamLeaders.length > 0 ? (
                    selectedAgentDetails.teamLeaders.map((tl, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        👔 {tl}
                      </span>
                    ))
                  ) : selectedAgentDetails.teamLeaderId ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      👔 {selectedAgentDetails.teamLeaderId}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">No Team Leader Assigned</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Residential Address
                </span>
                <span className="text-slate-700 block mt-0.5">{selectedAgentDetails.address || 'Not specified'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</span>
                  <span className={`font-bold text-xs ${selectedAgentDetails.status === 'deactivated' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {selectedAgentDetails.status === 'deactivated' ? 'Deactivated (Locked)' : 'Active (Normal)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const idx = agents.findIndex(a => a.user === selectedAgentDetails.user);
                      if (idx !== -1) {
                        setSelectedAgentDetails(null);
                        handleEditAgent(idx);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Permissions</span>
                  </button>
                  <button
                    onClick={() => {
                      const idx = agents.findIndex(a => a.user === selectedAgentDetails.user);
                      if (idx !== -1) {
                        handleToggleAgentStatus(idx);
                        setSelectedAgentDetails(prev => prev ? {
                          ...prev,
                          status: prev.status === 'deactivated' ? 'active' : 'deactivated'
                        } : null);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedAgentDetails.status === 'deactivated'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                    }`}
                  >
                    {selectedAgentDetails.status === 'deactivated' ? 'Activate' : 'Deactivate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Agent Profile & Permissions Popup */}
      {editingAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn my-6">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-white">
                  <Edit2 className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Edit Agent Profile &amp; Permissions
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Modifying configuration for <span className="font-bold text-white">@{editingAgentModal.user}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAgentModal(null);
                  setEditModalIndex(null);
                }}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedAgentModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Agent Username (ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={editUser}
                    onChange={(e) => setEditUser(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Agent Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    required
                    value={editPass}
                    onChange={(e) => setEditPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-hidden focus:border-indigo-600 bg-white"
                  >
                    <option value="Agent">Agent (Regular)</option>
                    <option value="Team Leader">Team Leader (Summary Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Team Assignment
                  </label>
                  <select
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-hidden focus:border-indigo-600 bg-white"
                  >
                    <option value="All">All (All Teams / All Select)</option>
                    {ORDER_CHANNELS.map((team, idx) => (
                      <option key={`team-edit-${team}-${idx}`} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'deactivated')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-hidden focus:border-indigo-600 bg-white"
                  >
                    <option value="active">Active (Normal Access)</option>
                    <option value="deactivated">Deactivated (Locked)</option>
                  </select>
                </div>

                {/* Multi-Select Team Leader(s) in Edit Modal */}
                <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                        Assign Team Leader(s) <span className="text-indigo-600 font-extrabold normal-case">(Multiple Select Allowed)</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Select one or multiple Team Leaders for @{editUser}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {editTeamLeaders.length} Selected
                    </span>
                  </div>

                  {editTeamLeaders.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5 p-2 bg-white rounded-xl border border-indigo-100">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Assigned:</span>
                      {editTeamLeaders.map((tl) => (
                        <span
                          key={tl}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200"
                        >
                          <span>👔 {tl}</span>
                          <button
                            type="button"
                            onClick={() => setEditTeamLeaders(prev => prev.filter(x => x !== tl))}
                            className="text-purple-400 hover:text-red-600 transition-colors cursor-pointer"
                            title={`Remove ${tl}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditTeamLeaders([])}
                        className="text-[11px] text-red-600 hover:underline font-semibold ml-auto cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {availableTeamLeaders.map((tl) => {
                      const isSelected = editTeamLeaders.includes(tl);
                      return (
                        <label
                          key={tl}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'bg-purple-100/70 border-purple-300 text-purple-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setEditTeamLeaders(prev => prev.filter(x => x !== tl));
                              } else {
                                setEditTeamLeaders(prev => [...prev, tl]);
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="truncate" title={tl}>{tl}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">+ Custom TL:</span>
                    <input
                      type="text"
                      value={editCustomTLInput}
                      onChange={(e) => setEditCustomTLInput(e.target.value)}
                      placeholder="Type new Team Leader name..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = editCustomTLInput.trim();
                        if (trimmed) {
                          const updated = addTeamLeaderItem(trimmed);
                          setTeamLeadersList([...updated]);
                          if (!editTeamLeaders.includes(trimmed)) {
                            setEditTeamLeaders(prev => [...prev, trimmed]);
                          }
                          setEditCustomTLInput('');
                          showToast(`Team Leader "${trimmed}" added and selected!`);
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                    >
                      + Add &amp; Select
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    placeholder="e.g. 01700000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="agent@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={editBloodGroup}
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-hidden focus:border-indigo-600 bg-white"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Clean & Uncluttered Access Controls & Permissions */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Access Control &amp; Permissions
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Configure permissions for agent <span className="font-semibold text-slate-700">@{editUser}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. Order Creation Access */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Order Creation Access
                  </span>
                  <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Create Order</span>
                      <span className="text-[11px] text-slate-500">Allow agent to input order details and place new orders</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editCanCreate}
                      onChange={(e) => setEditCanCreate(e.target.checked)}
                      className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>

                {/* 2. Placed Order Permissions */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Placed Order Permissions
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className="text-xs font-bold text-slate-800">Schedule Change</span>
                      <input
                        type="checkbox"
                        checked={editCanChangeSchedule}
                        onChange={(e) => setEditCanChangeSchedule(e.target.checked)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className="text-xs font-bold text-slate-800">Price Change</span>
                      <input
                        type="checkbox"
                        checked={editCanChangeValue}
                        onChange={(e) => setEditCanChangeValue(e.target.checked)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className="text-xs font-bold text-slate-800">Profit</span>
                      <input
                        type="checkbox"
                        checked={editCanAddProfit}
                        onChange={(e) => setEditCanAddProfit(e.target.checked)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Status Update with simple status checkboxes */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editCanUpdateStatus}
                          onChange={(e) => setEditCanUpdateStatus(e.target.checked)}
                          className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                        />
                        <span>Status Update</span>
                      </label>
                      {editCanUpdateStatus && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setEditAllowedOrderStatuses([...ORDER_STATUS_LIST])}
                            className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setEditAllowedOrderStatuses([])}
                            className="text-slate-500 font-semibold hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {editCanUpdateStatus && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {ORDER_STATUS_LIST.map((st) => {
                          const isChecked = editAllowedOrderStatuses.includes(st);
                          return (
                            <label
                              key={`edit-status-${st}`}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="truncate">{st}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditAllowedOrderStatuses((prev) => [...prev, st]);
                                  } else {
                                    setEditAllowedOrderStatuses((prev) => prev.filter((x) => x !== st));
                                  }
                                }}
                                className="rounded text-indigo-600 w-3.5 h-3.5 cursor-pointer ml-1"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Allowed Navigation Tabs */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Allowed Navigation Tabs
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditAllowedTabs(['summary', 'orders', 'followup', 'agent-performance', 'profiles'])}
                      className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {AGENT_MANAGEABLE_TABS.map((tab) => {
                      const isSelected = editAllowedTabs.includes(tab.id);
                      return (
                        <label
                          key={`edit-tab-${tab.id}`}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-sky-50 border-sky-200 text-sky-950 font-bold'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditAllowedTabs((prev) => [...prev, tab.id]);
                              } else {
                                if (editAllowedTabs.length <= 1) return;
                                setEditAllowedTabs((prev) => prev.filter((t) => t !== tab.id));
                              }
                            }}
                            className="rounded text-sky-600 w-3.5 h-3.5 cursor-pointer ml-1"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAgentModal(null);
                    setEditModalIndex(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Agent Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editingAgent && editingField && (
        <SelectionModal 
          title={`Edit ${editingField === 'role' ? 'Role' : 'Team'}`}
          options={editingField === 'role' ? ['Agent', 'Team Leader', 'Sr Agent'] : getTeamsList()}
          selected={editingField === 'role' ? (editingAgent.role || '') : (editingAgent.team || '')}
          onSelect={(value) => {
            const updatedAgents = agents.map(a => a.user === editingAgent.user ? { ...a, [editingField === 'role' ? 'role' : 'team']: value } : a);
            onUpdateAgents(updatedAgents);
          }}
          onAdd={(value) => {
             const updatedAgents = agents.map(a => a.user === editingAgent.user ? { ...a, [editingField === 'role' ? 'role' : 'team']: value } : a);
            onUpdateAgents(updatedAgents);
          }}
          onClose={() => { setEditingAgent(null); setEditingField(null); }}
        />
      )}
      {/* Create Order Modal for Manager */}
      <CreateOrderModal
        isOpen={isManagerCreateOrderOpen}
        onClose={() => setIsManagerCreateOrderOpen(false)}
        currentAgent={{
          user: currentManager.user,
          name: currentManager.name || currentManager.user,
          role: currentManager.role || 'Manager',
          team: 'All',
          pass: '',
          status: 'active',
          contact: '',
          email: '',
          bloodGroup: '',
          teamLeaders: [],
          permissions: {
            canCreate: true,
            canUpdateStatus: true,
            canChangeSchedule: true,
            canChangeValue: true,
            canAddProfit: true,
            canCancel: true,
            allowedOrderStatuses: getOrderStatuses(),
            allowedTabs: ['summary', 'orders', 'agent-performance', 'profiles']
          }
        }}
        onOrderCreated={(newOrd) => {
          if (onUpdateOrders) {
            onUpdateOrders([newOrd, ...orders]);
          }
          showToast(`Order #${newOrd.id || newOrd.order_id} created successfully!`);
          onRefreshOrders();
        }}
        orders={orders}
      />
    </div>
  );
};
