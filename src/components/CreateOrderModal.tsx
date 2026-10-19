import React, { useState, useEffect } from 'react';
import { AgentUser, OrderItem } from '../types';
import { CITY_AREA_MAP, ORDER_CHANNELS, PRODUCT_CATEGORIES, TIME_SLOTS, getTimeSlots } from '../data/mockOrders';
import { OrderService } from '../services/orderService';
import { X, CheckCircle2, AlertCircle, Loader2, Sparkles, Send } from 'lucide-react';
import ReactDOM from 'react-dom';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgent: AgentUser;
  onOrderCreated: (order: OrderItem) => void;
  orders?: OrderItem[];
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  currentAgent,
  onOrderCreated,
  orders: propOrders = []
}) => {
  // Form States
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');

  const [orderChannel, setOrderChannel] = useState(currentAgent.team || 'Acquisition');
  const [productCategory, setProductCategory] = useState('');
  const [productName, setProductName] = useState('');

  const [city, setCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [customArea, setCustomArea] = useState('');

  const [flat, setFlat] = useState('');
  const [house, setHouse] = useState('');
  const [road, setRoad] = useState('');
  const [block, setBlock] = useState('');

  const [createDate, setCreateDate] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [orderValue, setOrderValue] = useState<string>('');
  const [customProfit, setCustomProfit] = useState<string>('');

  // Compatibility aliases
  const customer_name = customerName;
  const customer_mobile = customerContact;
  const setCustomerMobile = setCustomerContact;
  const order_channel = orderChannel;
  const product_category = productCategory;
  const product_name = productName;
  const delivery_area = deliveryArea;
  const create_date = createDate;
  const schedule_date = scheduleDate;
  const schedule_time = scheduledTime;
  const order_value = orderValue;

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [allOrdersCache, setAllOrdersCache] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      OrderService.getLocalOrders().then(orders => {
        if (orders && orders.length > 0) {
          setAllOrdersCache(orders);
        }
      });
    }
  }, [isOpen]);

  const ordersList = React.useMemo(() => {
    if (propOrders && propOrders.length > 0) return propOrders;
    return allOrdersCache;
  }, [propOrders, allOrdersCache]);

  const { previewOrderId, previewCustomerId, isExistingCustomer } = React.useMemo(() => {
    // 1. Order ID calculation (max of sheet orders + 1)
    const { maxOrderId } = OrderService.getMaxIds(ordersList);
    const nextOrderId = String(maxOrderId + 1);

    // 2. Customer ID calculation (if phone exists in sheet, reuse customer_id; else max customer_id + 1)
    const resolved = OrderService.resolveCustomerIdForPhone(customerContact, ordersList);

    return {
      previewOrderId: nextOrderId,
      previewCustomerId: resolved.customerId,
      isExistingCustomer: resolved.isExisting
    };
  }, [ordersList, customerContact]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerContact('');
    setGender('');
    setProductCategory('');
    setProductName('');
    setCity('');
    setCustomCity('');
    setDeliveryArea('');
    setCustomArea('');
    setFlat('');
    setHouse('');
    setRoad('');
    setBlock('');
    setOrderValue('');
    setCustomProfit('');
    setScheduledTime('');
    setStatusMessage(null);
    setAutofilledCustomerInfo(null);

    setCreateDate(OrderService.getBdtTimestamp());

    const today = new Date();
    const tomY = today.getFullYear();
    const tomM = String(today.getMonth() + 1).padStart(2, '0');
    const tomD = String(today.getDate()).padStart(2, '0');
    setScheduleDate(`${tomY}-${tomM}-${tomD}`);
  };

  const [autofilledCustomerInfo, setAutofilledCustomerInfo] = useState<{ orderId: string; customerName?: string } | null>(null);

  const handleContactChange = (val: string) => {
    setCustomerContact(val);
    const cleanInput = val.replace(/\D/g, '');
    if (cleanInput.length >= 10) {
      const last10 = cleanInput.slice(-10);
      const matchingOrder = [...ordersList].reverse().find((o) => {
        const oPhone = String(o.customer_mobile || o.customerContact || '').replace(/\D/g, '');
        if (oPhone.length < 10) return false;
        return oPhone.endsWith(last10) || cleanInput.endsWith(oPhone.slice(-10));
      });

      if (matchingOrder) {
        // 1. Customer Name
        if (matchingOrder.customer_name || matchingOrder.customerName) {
          setCustomerName(matchingOrder.customer_name || matchingOrder.customerName || '');
        }

        // 2. Gender
        if (matchingOrder.gender) {
          const g = matchingOrder.gender;
          if (g === 'Male' || g === 'Female' || g === 'Other') {
            setGender(g);
          }
        }

        // 3. City & Area
        if (matchingOrder.city) {
          const c = matchingOrder.city;
          if (CITY_AREA_MAP[c]) {
            setCity(c);
            setCustomCity('');
            if (matchingOrder.delivery_area || matchingOrder.deliveryArea) {
              const a = matchingOrder.delivery_area || matchingOrder.deliveryArea || '';
              if (CITY_AREA_MAP[c]?.includes(a)) {
                setDeliveryArea(a);
                setCustomArea('');
              } else {
                setDeliveryArea('Others');
                setCustomArea(a);
              }
            }
          } else {
            setCity('Others');
            setCustomCity(c);
            if (matchingOrder.delivery_area || matchingOrder.deliveryArea) {
              setDeliveryArea('Others');
              setCustomArea(matchingOrder.delivery_area || matchingOrder.deliveryArea || '');
            }
          }
        }

        // 4. Address: Flat, House, Road, Block
        const rawAddr = String(matchingOrder.address_details || matchingOrder.addressDetails || '').trim();
        if (rawAddr && rawAddr.toLowerCase() !== 'not specified') {
          const flatMatch = rawAddr.match(/(?:Flat|flat|Apt|apt)[:\s#-]*([^,;]+)/i);
          const houseMatch = rawAddr.match(/(?:House|house|H)[:\s#-]*([^,;]+)/i);
          const roadMatch = rawAddr.match(/(?:Road|road|R)[:\s#-]*([^,;]+)/i);
          const blockMatch = rawAddr.match(/(?:Block|block|Sec|Sector)[:\s#-]*([^,;]+)/i);

          if (flatMatch) setFlat(flatMatch[1].trim());
          if (houseMatch) setHouse(houseMatch[1].trim());
          if (roadMatch) setRoad(roadMatch[1].trim());
          if (blockMatch) setBlock(blockMatch[1].trim());

          if (!flatMatch && !houseMatch && !roadMatch && !blockMatch) {
            setHouse(rawAddr);
          }
        }

        if ((matchingOrder as any).flat) setFlat((matchingOrder as any).flat);
        if ((matchingOrder as any).house) setHouse((matchingOrder as any).house);
        if ((matchingOrder as any).road) setRoad((matchingOrder as any).road);
        if ((matchingOrder as any).block) setBlock((matchingOrder as any).block);

        setAutofilledCustomerInfo({
          orderId: String(matchingOrder.order_id || matchingOrder.id || ''),
          customerName: matchingOrder.customer_name || matchingOrder.customerName || ''
        });
      } else {
        setAutofilledCustomerInfo(null);
      }
    } else {
      setAutofilledCustomerInfo(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (currentAgent.permissions && currentAgent.permissions.canCreate === false) return null;

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setCity(newCity);
    setDeliveryArea('');
    setCustomCity('');
    setCustomArea('');
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDeliveryArea(e.target.value);
    setCustomArea('');
  };

  const availableAreas = city ? CITY_AREA_MAP[city] || [] : [];

  const calculatedProfit =
    orderValue && !isNaN(Number(orderValue))
      ? Math.round(Number(orderValue) * 0.2)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    const finalCity = city === 'Others' ? customCity.trim() || 'Others' : city;
    const finalArea = deliveryArea === 'Others' ? customArea.trim() || 'Others' : deliveryArea;

    const addressParts = [
      flat ? `Flat: ${flat.trim()}` : '',
      house ? `House: ${house.trim()}` : '',
      road ? `Road: ${road.trim()}` : '',
      block ? `Block: ${block.trim()}` : ''
    ].filter(Boolean);

    const addressDetails = addressParts.length > 0 ? addressParts.join(', ') : 'Not specified';
    const numValue = parseFloat(orderValue) || 0;
    const finalProfit = calculatedProfit;

    const newOrderPayload = {
      order_id: previewOrderId,
      id: previewOrderId,
      customer_id: previewCustomerId,
      customerId: previewCustomerId,
      customer_name: customerName.trim(),
      customer_mobile: customerContact.trim(),
      gender: gender || 'Other',
      create_date: createDate,
      order_channel: orderChannel || 'Acquisition',
      agent_id: currentAgent.user,
      agent_name: currentAgent.name,
      product_category: productCategory || 'Electronics',
      product_name: productName.trim(),
      city: finalCity,
      delivery_area: finalArea,
      address_details: addressDetails,
      schedule_date: scheduleDate,
      schedule_time: scheduledTime,
      order_value: numValue,
      order_status: 'Pending',
      followup_status: 'Pending',
      profit: finalProfit
    };

    try {
      const res = await OrderService.createOrder(newOrderPayload);
      if (res.success) {
        setStatusMessage({
          text: `✓ Order #${res.order.id || previewOrderId} placed successfully for Customer #${res.order.customer_id || previewCustomerId}!`,
          type: 'success'
        });
        onOrderCreated(res.order);

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ text: '✕ Error placing order. Please try again.', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: '✕ Failed to save order. Check connection.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const todayDateStr = new Date().toLocaleDateString('en-CA');

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto select-none">
      <div className="bg-[#111C3D] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#1E2C58] my-8 space-y-4 max-h-[90vh] overflow-y-auto text-[#E2E8F0]">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2C58]">
          <div>
            <h2 className="text-lg font-bold text-[#E2E8F0]">Create New Order</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-[#94A3B8]">
                Agent: <span className="font-semibold text-[#E2E8F0]">{currentAgent.user}</span>
              </span>
              <span className="text-[#1E2C58]">•</span>
              <span className="px-2 py-0.5 bg-[#080E21] text-[#E2E8F0] font-mono text-[11px] font-bold rounded-md border border-[#1E2C58]">
                Auto Order ID: #{previewOrderId}
              </span>
              <span className={`px-2 py-0.5 font-mono text-[11px] font-bold rounded-md border ${
                isExistingCustomer 
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' 
                  : 'bg-blue-950/70 text-blue-300 border-blue-800/60'
              }`}>
                {isExistingCustomer ? 'Existing Customer ID' : 'Auto Customer ID'}: #{previewCustomerId}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#0E1736] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[#E2E8F0]" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer details */}
          <div className="bg-[#0E1736] rounded-xl p-4 border border-[#1E2C58] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
              Customer Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customer_name}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#E2E8F0]">
                    Customer Contact *
                  </label>
                  {customerContact.trim() && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                      isExistingCustomer 
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' 
                        : 'bg-purple-950/70 text-purple-300 border-purple-800/60'
                    }`}>
                      {isExistingCustomer ? `✓ Existing #${previewCustomerId}` : `New #${previewCustomerId}`}
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  required
                  value={customer_mobile}
                  onChange={(e) => handleContactChange(e.target.value)}
                  placeholder="e.g. 01711223344"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Gender *
                </label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0]"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product and Channel */}
          <div className="bg-[#0E1736] rounded-xl p-4 border border-[#1E2C58] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
              Product &amp; Source Channel
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Channel *
                </label>
                <select
                  required
                  value={order_channel}
                  onChange={(e) => setOrderChannel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0]"
                >
                  {ORDER_CHANNELS.map((ch, idx) => (
                    <option key={`create-ch-${ch}-${idx}`} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Product Category *
                </label>
                <select
                  required
                  value={product_category}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0]"
                >
                  <option key="create-cat-empty" value="">Select Category</option>
                  {PRODUCT_CATEGORIES.map((cat, idx) => (
                    <option key={`create-cat-${cat}-${idx}`} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={product_name}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Item name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B]"
                />
              </div>
            </div>
          </div>

          {/* Delivery Location */}
          <div className="bg-[#0E1736] rounded-xl p-4 border border-[#1E2C58] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
              Delivery Location
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">City *</label>
                <select
                  required
                  value={city}
                  onChange={handleCityChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0]"
                >
                  <option value="">Select City</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chittagong">Chittagong</option>
                  <option value="Jashore">Jashore</option>
                  <option value="Others">Others</option>
                </select>
                {city === 'Others' && (
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Enter City"
                    className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-md border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0]"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">Area *</label>
                <select
                  required
                  value={deliveryArea}
                  onChange={handleAreaChange}
                  disabled={!city}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] focus:outline-hidden focus:border-blue-500 bg-[#080E21] text-[#E2E8F0] disabled:opacity-40"
                >
                  <option key="create-area-empty" value="">{city ? 'Select Area' : 'Select City First'}</option>
                  {availableAreas.map((ar, idx) => (
                    <option key={`create-area-${ar}-${idx}`} value={ar}>{ar}</option>
                  ))}
                </select>
                {deliveryArea === 'Others' && (
                  <input
                    type="text"
                    required
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    placeholder="Enter Area"
                    className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-md border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0]"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Address (Flat, House, Road, Block)
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <input
                    type="text"
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                    placeholder="Flat"
                    className="px-1.5 py-1 text-xs border border-[#1E2C58] rounded-sm bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B]"
                  />
                  <input
                    type="text"
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    placeholder="House"
                    className="px-1.5 py-1 text-xs border border-[#1E2C58] rounded-sm bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B]"
                  />
                  <input
                    type="text"
                    value={road}
                    onChange={(e) => setRoad(e.target.value)}
                    placeholder="Road"
                    className="px-1.5 py-1 text-xs border border-[#1E2C58] rounded-sm bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B]"
                  />
                  <input
                    type="text"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="Block"
                    className="px-1.5 py-1 text-xs border border-[#1E2C58] rounded-sm bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Financials */}
          <div className="bg-[#0E1736] rounded-xl p-4 border border-[#1E2C58] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
              Schedule &amp; Financials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Schedule Date *
                </label>
                <input
                  type="date"
                  required
                  min={todayDateStr}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Time Slot *
                </label>
                <select
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0]"
                >
                  <option key="create-slot-empty" value="">Time Slot</option>
                  {getTimeSlots().map((slot, idx) => (
                    <option key={`create-slot-${slot}-${idx}`} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1">
                  Order Value () *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={orderValue}
                  onChange={(e) => setOrderValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#1E2C58] bg-[#080E21] font-bold text-[#E2E8F0] placeholder-[#64748B]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#E2E8F0] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/30 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Place Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
