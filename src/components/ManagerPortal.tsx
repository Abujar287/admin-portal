import React, { useState, useMemo } from 'react';
import { AgentUser, ManagerUser, OrderItem, DateFilterType, FollowupHistoryItem } from '../types';
import { OrderService } from '../services/orderService';
import { 
  User, 
  Users, 
  FileText, 
  BarChart2, 
  LogOut, 
  RotateCw, 
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
  X,
  Phone,
  Mail,
  Heart,
  Calendar,
  History,
  CheckSquare,
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
  addTeamLeaderItem,
  removeTeamLeaderItem,
  getCategoryMappings,
  saveCategoryMappings,
  CategoryTeamMapping
} from '../data/mockOrders';

interface ManagerPortalProps {
  currentManager: ManagerUser;
  agents: AgentUser[];
  onUpdateAgents: (agents: AgentUser[], notify?: boolean) => void;
  orders: OrderItem[];
  onUpdateOrders?: (orders: OrderItem[]) => void;
  followupHistory?: FollowupHistoryItem[];
  onUpdateFollowupHistory?: (history: FollowupHistoryItem[]) => void;
  onRevertFollowup?: (historyId: string, orderId: string, previousStatus: string) => Promise<void>;
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
  const isTeamLeader = currentManager.role === 'Team Leader';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'profiles' | 'users' | 'orders' | 'followup' | 'summary' | 'agent-performance' | 'settings' | 'category-mapping' | 'city-area-mapping'
  >(isTeamLeader ? 'summary' : 'users');
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
  const [modalScheduleDate, setModalScheduleDate] = useState<string>('');
  const [modalScheduledTime, setModalScheduledTime] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

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
  const [editStatus, setEditStatus] = useState<'active' | 'deactivated'>('active');
  const [editCanCreate, setEditCanCreate] = useState(true);
  const [editCanUpdateStatus, setEditCanUpdateStatus] = useState(true);
  const [editCanChangeValue, setEditCanChangeValue] = useState(true);
  const [editCanAddProfit, setEditCanAddProfit] = useState(true);
  const [editCanCancel, setEditCanCancel] = useState(true);

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

  const handleOpenOrderModal = (ord: OrderItem) => {
    setStatusModalOrder(ord);
    setModalFollowupStatus(ord.followup_status || ord.followupStatus || 'Pending');
    setModalOrderValue(String(ord.order_value ?? ord.orderValue ?? ''));
    setModalProfit(String(ord.profit ?? ''));
    setModalScheduleDate(ord.schedule_date || ord.scheduleDate || '');
    setModalScheduledTime(ord.schedule_time || ord.scheduledTime || '');
    setModalNotes('');
  };

  // Agent Management Form State (with no demo names)
  const [newAgentUser, setNewAgentUser] = useState('');
  const [newAgentPass, setNewAgentPass] = useState('');
  const [newAgentTeam, setNewAgentTeam] = useState('Acquisition');
  const [newTeamName, setNewTeamName] = useState('');
  const [newAgentTeamLeader, setNewAgentTeamLeader] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Agent');
  const [newCanCreate, setNewCanCreate] = useState(true);
  const [newCanUpdateStatus, setNewCanUpdateStatus] = useState(true);
  const [newCanChangeValue, setNewCanChangeValue] = useState(true);
  const [newCanAddProfit, setNewCanAddProfit] = useState(true);
  const [newCanCancel, setNewCanCancel] = useState(true);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
                   agents.some(a => a.user === item.updatedBy && a.teamLeaderId === currentManager.user);
    if (!isAuth) {
      showToast('Not authorized to remove this follow-up record.');
      return;
    }

    const prevStatus = item.previousStatus || 'Pending';
    if (onRevertFollowup) {
      await onRevertFollowup(historyId, item.orderId, prevStatus);
    } else {
      const res = await OrderService.revertFollowup(historyId, item.orderId, prevStatus);
      if (onUpdateOrders) {
        onUpdateOrders(res.updatedOrders);
      }
      if (onUpdateFollowupHistory) {
        onUpdateFollowupHistory(res.updatedHistory);
      }
    }
    showToast(`Followup undone: order #${item.orderId} restored to "${prevStatus}", profit & dates cleared!`);
  };

  const handlePreviewCsv = (data: any[], title: string, filename: string) => {
    setCsvPreviewModal({ title, data, filename });
  };

  const handleExportCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
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
  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const u = newAgentUser.trim();
    const p = newAgentPass.trim();
    if (!u || !p) return;

    const permissions = {
      canCreate: newCanCreate,
      canUpdateStatus: newCanUpdateStatus,
      canChangeValue: newCanChangeValue,
      canAddProfit: newCanAddProfit,
      canCancel: newCanCancel
    };

    let updated: AgentUser[];
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < agents.length) {
      updated = agents.map((agent, idx) =>
        idx === editingIndex
          ? {
              ...agent,
              user: u,
              pass: p,
              team: newAgentTeam,
              name: newAgentName.trim() || agent.name || `Agent ${u}`,
              role: newAgentRole,
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
                teamLeaderId: newAgentTeamLeader,
                name: newAgentName.trim() || agent.name,
                role: newAgentRole,
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
            teamLeaderId: newAgentTeamLeader,
            name: newAgentName.trim() || `Agent ${u}`,
            email: `${u.toLowerCase()}@portal.local`,
            status: 'active',
            failedAttempts: 0,
            role: newAgentRole,
            permissions: permissions
          }
        ];
      }
    }

    onUpdateAgents(updated, true);
    setNewAgentUser('');
    setNewAgentPass('');
    setNewAgentName('');
    setNewAgentTeam('Acquisition');
    setNewAgentRole('Agent');
    setNewCanCreate(true);
    setNewCanUpdateStatus(true);
    setNewCanChangeValue(true);
    setNewCanAddProfit(true);
    setNewCanCancel(true);
  };

  const handleEditAgent = (index: number) => {
    const ag = agents[index];
    setEditModalIndex(index);
    setEditingAgentModal(ag);
    setEditUser(ag.user);
    setEditPass(ag.pass);
    setEditName(ag.name || '');
    setEditTeam(ag.team || 'Acquisition');
    setEditRole(ag.role === 'Team Leader' ? 'Team Leader' : 'Agent');
    setEditContact(ag.contact || '');
    setEditEmail(ag.email || '');
    setEditBloodGroup(ag.bloodGroup || '');
    setEditStatus(ag.status === 'deactivated' ? 'deactivated' : 'active');
    setEditCanCreate(ag.permissions?.canCreate ?? true);
    setEditCanUpdateStatus(ag.permissions?.canUpdateStatus ?? true);
    setEditCanChangeValue(ag.permissions?.canChangeValue ?? true);
    setEditCanAddProfit(ag.permissions?.canAddProfit ?? true);
    setEditCanCancel(ag.permissions?.canCancel ?? true);
  };

  const handleSaveEditedAgentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editModalIndex === null || !editingAgentModal) return;

    const u = editUser.trim();
    const p = editPass.trim();
    if (!u || !p) return;

    const permissions = {
      canCreate: editCanCreate,
      canUpdateStatus: editCanUpdateStatus,
      canChangeValue: editCanChangeValue,
      canAddProfit: editCanAddProfit,
      canCancel: editCanCancel
    };

    const updated = agents.map((agent, idx) =>
      idx === editModalIndex
        ? {
            ...agent,
            user: u,
            pass: p,
            name: editName.trim() || agent.name || `Agent ${u}`,
            role: editRole,
            team: editTeam,
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
          if (!idStr.includes(val)) return false;
        } else if (searchType === 'customer_id') {
          const cIdStr = String(r.customer_id || r.customerId || '').trim().toLowerCase();
          if (!cIdStr.includes(val)) return false;
        } else if (searchType === 'customer_mobile') {
          const cStr = String(r.customer_mobile || r.customerContact || '').toLowerCase();
          if (!cStr.includes(val)) return false;
        } else if (searchType === 'customer_name') {
          const nStr = String(r.customer_name || r.customerName || '').toLowerCase();
          if (!nStr.includes(val)) return false;
        } else if (searchType === 'gender') {
          const gStr = String(r.gender || '').toLowerCase();
          if (!gStr.includes(val)) return false;
        } else if (searchType === 'create_date') {
          const crStr = String(r.create_date || r.createDate || '').toLowerCase();
          if (!crStr.includes(val)) return false;
        } else if (searchType === 'agent_id') {
          const aIdStr = String(r.agent_id || r.agentId || '').toLowerCase();
          if (!aIdStr.includes(val)) return false;
        } else if (searchType === 'agent_name') {
          const aNmStr = String(r.agent_name || r.agentName || '').toLowerCase();
          if (!aNmStr.includes(val)) return false;
        } else if (searchType === 'product_category') {
          const catStr = String(r.product_category || r.productCategory || '').toLowerCase();
          if (!catStr.includes(val)) return false;
        } else if (searchType === 'product_name') {
          const prodStr = String(r.product_name || r.productName || '').toLowerCase();
          if (!prodStr.includes(val)) return false;
        } else if (searchType === 'city') {
          const cityStr = String(r.city || '').toLowerCase();
          if (!cityStr.includes(val)) return false;
        } else if (searchType === 'delivery_area') {
          const areaStr = String(r.delivery_area || r.deliveryArea || '').toLowerCase();
          if (!areaStr.includes(val)) return false;
        } else if (searchType === 'address_details') {
          const addrStr = String(r.address_details || r.addressDetails || '').toLowerCase();
          if (!addrStr.includes(val)) return false;
        } else if (searchType === 'schedule_date') {
          const scDtStr = String(r.schedule_date || r.scheduleDate || '').toLowerCase();
          if (!scDtStr.includes(val)) return false;
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

  // Summary Metrics & Aggregations with single date filter
  const orderDeliveredDateMap = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      if (o.delivered_date) map.set(String(o.order_id), o.delivered_date);
    });
    followupHistory.forEach(h => {
      if (h.newStatus?.toLowerCase() === 'delivered' && h.timestamp) {
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
      if (h.newStatus?.toLowerCase() === 'cancelled' && h.timestamp) {
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

    const buildAgentMapItem = (id: string, name: string, team: string, role: string, status: string) => ({
      id,
      name,
      team,
      role,
      status,
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
        a.status || 'active'
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
      if (h.updatedBy && matchDate(h.timestamp, summaryDateFilter, summaryStartDate, summaryEndDate)) {
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
      if (currentManager.role === 'Team Leader' && (ag as any).id !== currentManager.user && (ag as any).teamLeaderId !== currentManager.user) {
        return false;
      }

      const matchSearch =
        !agentPerformanceSearch ||
        String(ag.name || '').toLowerCase().includes(agentPerformanceSearch.toLowerCase()) ||
        String(ag.id || '').toLowerCase().includes(agentPerformanceSearch.toLowerCase());
      const matchTeam =
        agentPerformanceTeamFilter === 'all' ||
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

          <button
            onClick={() => setActiveTab('followup')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'followup'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            {isSidebarOpen && <span>Followup</span>}
            {isSidebarOpen && (
              <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                {followupHistory.length}
              </span>
            )}
          </button>

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
              {activeTab === 'users' && 'User Details (Agent Directory)'}
              {activeTab === 'orders' && 'All Orders Database'}
              {activeTab === 'followup' && 'Followup Status & History'}
              {activeTab === 'summary' && 'Analytics & Summary'}
              {activeTab === 'agent-performance' && 'Agent Performance Report'}
              {activeTab === 'category-mapping' && 'Category, Team & Status Mapping'}
              {activeTab === 'profiles' && 'Manager Profile & Sheet Integration'}
              {activeTab === 'settings' && 'System Settings & Data Export Hub'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
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
          {/* TAB: USER DETAILS (AGENT DIRECTORY WITH DETAILS STORE) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Professional Team & Team Leader Creator Card */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                      🏢
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">Professional Team &amp; Team Leader Management</h3>
                      <p className="text-[11px] text-indigo-200">
                        Create a new team and manually assign/input the Team Leader name.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-white/10 text-indigo-200 font-bold px-3 py-1 rounded-full">
                    {teams.length} Teams Active
                  </span>
                </div>

                <form onSubmit={handleAddNewTeam} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1.5">
                        New Team Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeamInputName}
                        onChange={(e) => setNewTeamInputName(e.target.value)}
                        placeholder="e.g. Acquisition Pro"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-400/30 bg-slate-900 text-white text-xs focus:outline-hidden focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1.5">
                        Team Leader Name (Manual Input)
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeamLeaderInputName}
                        onChange={(e) => setNewTeamLeaderInputName(e.target.value)}
                        placeholder="e.g. MD Abujar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-400/30 bg-slate-900 text-white text-xs focus:outline-hidden focus:border-indigo-400"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Team &amp; Assign TL</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    <span className="text-[11px] text-indigo-300 font-bold uppercase">Active Teams:</span>
                    {teams.map((t) => (
                      <span key={t.name} className="px-2.5 py-1 bg-white/10 text-indigo-100 rounded-lg text-xs font-semibold border border-white/10 flex items-center gap-1.5">
                        <span>{t.name}</span>
                        <span className="text-[10px] bg-indigo-500/40 text-indigo-200 px-1.5 py-0.2 rounded font-mono">TL: {t.teamLeaderName || 'Unassigned'}</span>
                      </span>
                    ))}
                  </div>
                </form>
              </div>

              {/* Add / Edit Agent Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {editingIndex !== null ? 'Edit Agent Profile & Permissions' : 'Add New Agent'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure credentials, team, role, and granular action permissions for this Agent ID.
                    </p>
                  </div>
                  {editingIndex !== null && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                      Editing: {newAgentUser}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveAgent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Agent Username (ID)
                      </label>
                      <input
                        type="text"
                        required
                        value={newAgentUser}
                        onChange={(e) => setNewAgentUser(e.target.value)}
                        placeholder="e.g. agent01"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Agent Full Name
                      </label>
                      <input
                        type="text"
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        placeholder="Enter agent full name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Password
                      </label>
                      <input
                        type="text"
                        required
                        value={newAgentPass}
                        onChange={(e) => setNewAgentPass(e.target.value)}
                        placeholder="Enter password"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Role
                      </label>
                      <select
                        value={newAgentRole}
                        onChange={(e) => setNewAgentRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white font-medium"
                      >
                        <option value="Agent">Agent (Regular)</option>
                        <option value="Sr Agent">Sr Agent</option>
                        <option value="Team Leader">Team Leader</option>
                      </select>
                    </div>

                    <div className="md:col-span-5 flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          Team Assignment
                        </label>
                        <select
                          value={newAgentTeam}
                          onChange={(e) => setNewAgentTeam(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                        >
                          {availableChannels.map((team: string, idx: number) => (
                            <option key={`team-avail-${team}-${idx}`} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          Or Create New Team
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="New team name"
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newTeamName.trim()) {
                                handleAddChannel(newTeamName.trim());
                              }
                            }}
                            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                          >
                            Add Team
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Assign Team Leader
                      </label>
                      <select
                        value={newAgentTeamLeader}
                        onChange={(e) => setNewAgentTeamLeader(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                      >
                        <option key="no-tl" value="">-- No TL Assigned --</option>
                        {agents.filter(a => a.role === 'Team Leader').map((tl, idx) => (
                          <option key={`tl-opt-${tl.user}-${idx}`} value={tl.user}>
                            {tl.name} (@{tl.user})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Individual Access & Permissions (Agent ID Wise) */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Agent ID-Wise Permissions &amp; Access Controls
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Choose exactly what actions this agent is authorized to perform
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${newCanCreate ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={newCanCreate}
                          onChange={(e) => setNewCanCreate(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className="font-bold block">Order Create</span>
                          <span className="text-[10px] text-slate-500">Create new orders</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${newCanUpdateStatus ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={newCanUpdateStatus}
                          onChange={(e) => setNewCanUpdateStatus(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className="font-bold block">Status Update</span>
                          <span className="text-[10px] text-slate-500">Change follow-up status</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${newCanChangeValue ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={newCanChangeValue}
                          onChange={(e) => setNewCanChangeValue(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className="font-bold block">Change Value</span>
                          <span className="text-[10px] text-slate-500">Edit order value (৳)</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${newCanAddProfit ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={newCanAddProfit}
                          onChange={(e) => setNewCanAddProfit(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className="font-bold block">Add Profit</span>
                          <span className="text-[10px] text-slate-500">Set profit on delivery</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${newCanCancel ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={newCanCancel}
                          onChange={(e) => setNewCanCancel(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className="font-bold block">Cancel Order</span>
                          <span className="text-[10px] text-slate-500">Mark order as cancelled</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editingIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null);
                          setNewAgentUser('');
                          setNewAgentPass('');
                          setNewAgentName('');
                          setNewAgentTeam('Acquisition');
                          setNewAgentRole('Agent');
                          setNewCanCreate(true);
                          setNewCanUpdateStatus(true);
                          setNewCanChangeValue(true);
                          setNewCanAddProfit(true);
                          setNewCanCancel(true);
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{editingIndex !== null ? 'Update Agent Profile & Permissions' : 'Save & Add Agent'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* User Details Table - Displays all details updated by agents */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">User Details &amp; Directory</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure agent permissions, role assignments, passwords, and profile directory.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                    {agents.length} Accounts Registered
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-3 px-3.5 whitespace-nowrap">Agent ID</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Full Name</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Password</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Role</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Team</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Individual Permissions</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Email</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Blood</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap text-center">Manager Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {agents.map((agent, index) => {
                        const isDeactivated = agent.status === 'deactivated';
                        const isTL = agent.role === 'Team Leader';
                        const perms = agent.permissions || {
                          canCreate: true,
                          canUpdateStatus: true,
                          canChangeValue: true,
                          canAddProfit: true,
                          canCancel: true
                        };

                        return (
                          <tr key={agent.user} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                              {agent.user}
                            </td>
                            <td className="py-3 px-3.5 font-medium whitespace-nowrap text-slate-800">
                              {agent.name || '-'}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                {agent.pass}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {isTL ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                  Team Leader
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Agent
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {agent.team}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <span
                                  title={perms.canCreate ? 'Can Create Orders: YES' : 'Can Create Orders: NO'}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${perms.canCreate ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400 line-through'}`}
                                >
                                  Create
                                </span>
                                <span
                                  title={perms.canUpdateStatus ? 'Can Update Status: YES' : 'Can Update Status: NO'}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${perms.canUpdateStatus ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400 line-through'}`}
                                >
                                  Status
                                </span>
                                <span
                                  title={perms.canChangeValue ? 'Can Change Value: YES' : 'Can Change Value: NO'}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${perms.canChangeValue ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400 line-through'}`}
                                >
                                  Value
                                </span>
                                <span
                                  title={perms.canAddProfit ? 'Can Add Profit: YES' : 'Can Add Profit: NO'}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${perms.canAddProfit ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400 line-through'}`}
                                >
                                  Profit
                                </span>
                                <span
                                  title={perms.canCancel ? 'Can Cancel Order: YES' : 'Can Cancel Order: NO'}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${perms.canCancel ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400 line-through'}`}
                                >
                                  Cancel
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                              {agent.contact || '-'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                              {agent.email || '-'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {agent.bloodGroup ? (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-red-50 text-red-700 border border-red-200">
                                  {agent.bloodGroup}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {isDeactivated ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-fit">
                                  <Lock className="w-3 h-3" /> Deactivated (3 fails)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-center space-x-1.5">
                              {/* Edit Profile & Permissions */}
                              <button
                                onClick={() => handleEditAgent(index)}
                                title="Edit Credentials & Permissions"
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              {/* Activate / Deactivate button */}
                              <button
                                onClick={() => handleToggleAgentStatus(index)}
                                title={isDeactivated ? 'Reactivate Agent Account' : 'Deactivate Agent'}
                                className={`px-2.5 py-1 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 transition-all ${
                                  isDeactivated
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                }`}
                              >
                                {isDeactivated ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Activate</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    <span>Deactivate</span>
                                  </>
                                )}
                              </button>

                              {/* View full card */}
                              <button
                                onClick={() => setSelectedAgentDetails(agent)}
                                title="View Full Profile Card"
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteAgent(index)}
                                disabled={agents.length <= 1}
                                title="Delete Agent"
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 disabled:opacity-40"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
                        placeholder={`Search...`}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> total sheet orders
                </div>
              </div>

              {/* All 19 Columns Sticky Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white sticky top-0 z-10 font-bold">
                        <th className="py-3.5 px-3.5 whitespace-nowrap">order_id</th>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={22} className="text-center py-12 text-slate-400 font-semibold">
                            No orders found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord, idx) => {
                          const isDelivered = (ord.followup_status || ord.followupStatus || '').toLowerCase() === 'delivered';
                          return (
                            <tr key={`manager-ord-${ord.order_id || ord.id || idx}-${idx}`} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-indigo-700">
                                #{ord.order_id || ord.id}
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
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={ord.followup_status || 'Pending'}
                                    onChange={(e) => {
                                      const newStatus = e.target.value;
                                      onUpdateOrderStatus?.(
                                        ord.order_id,
                                        {
                                          followup_status: newStatus,
                                          order_status: newStatus === 'Delivered' ? 'Delivered' : ord.order_status
                                        },
                                        'Manager'
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                      ord.followup_status === 'Delivered'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : ord.followup_status === 'Cancelled'
                                        ? 'bg-red-50 text-red-800 border-red-300'
                                        : ord.followup_status === 'Confirmed'
                                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                                        : ord.followup_status === 'Follow-up'
                                        ? 'bg-purple-50 text-purple-800 border-purple-300'
                                        : 'bg-amber-50 text-amber-800 border-amber-300'
                                    }`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                  <button
                                    onClick={() => handleOpenOrderModal(ord)}
                                    title="Edit Order Value, Schedule, Followup Status & Remarks"
                                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
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

          {/* TAB: FOLLOWUP & SHEET SYNC */}
          {activeTab === 'followup' && (
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
                      const nowTs = new Date().toISOString().replace('T', ' ').slice(0, 19);
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
                          scheduleDate: quickUpdateScheduleDate,
                          schedule_date: quickUpdateScheduleDate,
                          scheduledTime: quickUpdateScheduledTime,
                          schedule_time: quickUpdateScheduledTime
                        },
                        'Manager',
                        quickUpdateNotes
                      );
                      setQuickUpdateNotes('');
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

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={!quickUpdateOrderId || isSavingStatus}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/30 active:scale-[0.99]"
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
                                                 agents.some(a => a.user === h.updatedBy && a.teamLeaderId === currentManager.user);
                            if (!isAuthorized) return false;
                            
                            if (!followupSearch.trim()) return true;
                            const q = followupSearch.toLowerCase();
                            return (
                              String(h.followupId || '').toLowerCase().includes(q) ||
                              String(h.orderId || (h as any).order_id || '').toLowerCase().includes(q) ||
                              String(h.customerName || (h as any).customer_name || '').toLowerCase().includes(q) ||
                              String(h.newStatus || (h as any).new_status || '').toLowerCase().includes(q) ||
                              String(h.action || '').toLowerCase().includes(q) ||
                              String(h.notes || '').toLowerCase().includes(q)
                            );
                          })
                          .map((hist, histIdx) => (
                            <tr key={`followup-hist-${hist.id || hist.followupId || histIdx}-${histIdx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3.5 font-mono font-bold text-indigo-800 whitespace-nowrap">#{hist.followupId || hist.id}</td>
                              <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">#{hist.orderId}</td>
                              <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{hist.timestamp}</td>
                              <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">{hist.customerName || '-'}</td>
                              <td className="py-3 px-3.5 text-slate-600 font-mono whitespace-nowrap">{hist.customerContact || '-'}</td>
                              <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">{hist.previousStatus}</td>
                              <td className="py-3 px-3.5 font-bold text-indigo-700 whitespace-nowrap">{hist.newStatus}</td>
                              <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">{hist.orderStatus}</td>
                              <td className="py-3 px-3.5 text-slate-700 font-medium whitespace-nowrap">৳ {hist.orderValue != null ? Number(hist.orderValue).toLocaleString() : '-'}</td>
                              <td className="py-3 px-3.5 text-slate-600 text-[10px] whitespace-nowrap">{hist.scheduleDate}<br/>{hist.scheduledTime}</td>
                              <td className="py-3 px-3.5 font-bold text-slate-700 whitespace-nowrap">{hist.updatedBy}</td>
                              <td className="py-3 px-3.5 whitespace-nowrap"><span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">{hist.action || 'Follow-up Update'}</span></td>
                              <td className="py-3 px-3.5 text-slate-600 max-w-[200px] truncate" title={hist.notes}>{hist.notes || '-'}</td>
                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleUndoFollowup(hist.id)}
                                  title="Remove Followup & Revert Order Status"
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-md font-bold text-[10px] cursor-pointer"
                                >
                                  Undo / Remove
                                </button>
                              </td>
                            </tr>
                          ))
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
                    <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                      {summaryStats.channelSummary.length} Channels
                    </span>
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
                    <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                      {summaryStats.categorySummary.length} Categories
                    </span>
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
                    <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                      {summaryStats.citySummary.length} Cities
                    </span>
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
            <div className="max-w-4xl space-y-6">
              {/* Account Details */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Manager Profile &amp; Account</h3>
                      <p className="text-xs text-slate-400">Authenticated administrative session credentials</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Session
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                      Username
                    </p>
                    <p className="text-lg font-extrabold text-slate-900 font-mono">
                      {currentManager.user}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                      Role &amp; Privilege
                    </p>
                    <p className="text-lg font-extrabold text-indigo-700">
                      {currentManager.role}
                    </p>
                  </div>
                </div>
              </div>
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
                        <h5 className="font-bold text-xs text-slate-800">Order Details CSV</h5>
                        <p className="text-[11px] text-slate-500">{orders.length} orders loaded</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handlePreviewCsv(orders, 'Order Details CSV Preview', 'orders_export.csv')} className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer">Preview</button>
                        <button onClick={() => handleExportCsv(orders, 'orders_export.csv')} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer">Download</button>
                      </div>
                    </div>

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

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div>
                        <h5 className="font-bold text-xs text-slate-800">Agent Directory CSV</h5>
                        <p className="text-[11px] text-slate-500">{agents.length} accounts</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handlePreviewCsv(agents, 'Agent Directory CSV Preview', 'agents_directory_export.csv')} className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer">Preview</button>
                        <button onClick={() => handleExportCsv(agents, 'agents_directory_export.csv')} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer">Download</button>
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

      {/* Modal: Status & Remarks Update Modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Update Followup Status &amp; Sync
                  </h3>
                  <p className="text-[11px] text-slate-400">Order #{statusModalOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold">Customer:</span>
                  <span className="font-bold text-slate-900">{statusModalOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">Contact:</span>
                  <span className="font-mono text-slate-700">{statusModalOrder.customerContact}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">Current Followup:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {statusModalOrder.followupStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Editable Order Fields: Order Value & Profit */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Order Value (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={modalOrderValue}
                    onChange={(e) => setModalOrderValue(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Profit Amount (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={modalProfit}
                    onChange={(e) => setModalProfit(e.target.value)}
                    placeholder="Enter profit"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-hidden focus:border-indigo-600 text-emerald-700"
                  />
                </div>
              </div>

              {/* Editable Schedule Date & Time */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Schedule Date
                  </label>
                  <input
                    type="date"
                    value={modalScheduleDate}
                    onChange={(e) => setModalScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scheduled Time (Slot)
                  </label>
                  <select
                    value={modalScheduledTime}
                    onChange={(e) => setModalScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-hidden focus:border-indigo-600 bg-white cursor-pointer"
                  >
                    <option key="opt-modal-time-empty" value="">-- Select Time Slot --</option>
                    {modalScheduledTime && !TIME_SLOTS.includes(modalScheduledTime) && (
                      <option key="opt-modal-time-custom" value={modalScheduledTime}>{modalScheduledTime}</option>
                    )}
                    {TIME_SLOTS.map((slot, idx) => (
                      <option key={`modal-slot-${slot}-${idx}`} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Selector: Followup Status only */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Followup Status
                </label>
                <select
                  value={modalFollowupStatus}
                  onChange={(e) => setModalFollowupStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Audit Note (Stored in 'Followup' sheet)
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Schedule updated, customer requested evening delivery."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingStatus}
                  onClick={async () => {
                    setIsSavingStatus(true);
                    try {
                      const isDeliv = modalFollowupStatus.toLowerCase() === 'delivered';
                      const isCanc = modalFollowupStatus.toLowerCase() === 'cancelled';
                      const nowTs = new Date().toISOString().replace('T', ' ').slice(0, 19);
                      const finalVal = modalOrderValue !== '' ? parseFloat(modalOrderValue) : Number(statusModalOrder.order_value ?? statusModalOrder.orderValue ?? 0);
                      const targetOrderId = String(statusModalOrder.order_id || statusModalOrder.id || '');
                      await onUpdateOrderStatus?.(
                        targetOrderId,
                        {
                          followup_status: modalFollowupStatus,
                          followupStatus: modalFollowupStatus,
                          order_status: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : 'Pending'),
                          orderStatus: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : 'Pending'),
                          order_value: modalOrderValue !== '' ? parseFloat(modalOrderValue) : undefined,
                          orderValue: modalOrderValue !== '' ? parseFloat(modalOrderValue) : undefined,
                          profit: isDeliv 
                            ? (modalProfit !== '' ? parseFloat(modalProfit) : Math.round(finalVal * 0.20)) 
                            : 0,
                          delivered_date: isDeliv ? nowTs : '',
                          deliveredDate: isDeliv ? nowTs : '',
                          cancelled_date: isCanc ? nowTs : '',
                          cancelledDate: isCanc ? nowTs : '',
                          schedule_date: modalScheduleDate,
                          scheduleDate: modalScheduleDate,
                          schedule_time: modalScheduledTime,
                          scheduledTime: modalScheduledTime
                        },
                        'Manager',
                        modalNotes
                      );
                      setStatusModalOrder(null);
                    } finally {
                      setIsSavingStatus(false);
                    }
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  {isSavingStatus ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update &amp; Sync</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                <span>⚠️ কেন হিস্টোরি বা ডাটা আপডেট হয়নি? / Why didn't history save previously?</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                আপনার গুগল শীটে আগে ডিপ্লয় করা পুরানো স্ক্রিপ্টে শুধুমাত্র নতুন অর্ডার যুক্ত করার কোড ছিল। অর্ডার ভ্যালু, শিডিউল ও ফলোআপ স্ট্যাটাস আপডেট এবং <strong>'Followup'</strong> শীটে অডিট ট্রেইল হিস্টোরি স্টোর করতে নিচে দেওয়া নতুন <strong>Code.gs</strong> কোডটি ব্যবহার করতে হবে:
              </p>
              <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-slate-800 font-medium pt-1">
                <li>Google Sheet-এ <strong>Extensions &gt; Apps Script</strong> খুলুন।</li>
                <li><strong>Code.gs</strong>-এর সব কোড মুছে নিচের কোড পেস্ট করে <strong>Save</strong> (💾) করুন।</li>
                <li><strong>Deploy &gt; Manage deployments</strong> &gt; Edit (পেন্সিল) &gt; Version: <strong>"New version"</strong> সিলেক্ট করে <strong>Deploy</strong> করুন।</li>
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
              <div className="bg-slate-50 p-2.5 rounded-xl col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Role &amp; Authorized Permissions
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${selectedAgentDetails.role === 'Team Leader' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {selectedAgentDetails.role || 'Agent'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canCreate ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Create
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canUpdateStatus ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Status
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canChangeValue ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Value
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canAddProfit ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Profit
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedAgentDetails.permissions?.canCancel ?? true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                    Cancel
                  </span>
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

              {/* Granular Access Controls */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block mb-1">
                  Individual Action Permissions
                </span>
                <p className="text-[11px] text-slate-500 mb-3">
                  Specify what operations this agent is permitted to perform in their portal.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${editCanCreate ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={editCanCreate}
                      onChange={(e) => setEditCanCreate(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs">Create Order</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${editCanUpdateStatus ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={editCanUpdateStatus}
                      onChange={(e) => setEditCanUpdateStatus(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs">Update Status</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${editCanChangeValue ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={editCanChangeValue}
                      onChange={(e) => setEditCanChangeValue(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs">Change Value</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${editCanAddProfit ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={editCanAddProfit}
                      onChange={(e) => setEditCanAddProfit(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs">Add Profit</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${editCanCancel ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={editCanCancel}
                      onChange={(e) => setEditCanCancel(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs">Cancel Order</span>
                  </label>
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
    </div>
  );
};
