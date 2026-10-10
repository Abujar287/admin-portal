import React, { useState, useEffect } from 'react';
import { AgentUser, OrderItem } from '../types';
import { CITY_AREA_MAP, ORDER_CHANNELS, PRODUCT_CATEGORIES, TIME_SLOTS } from '../data/mockOrders';
import { OrderService } from '../services/orderService';
import { X, CheckCircle2, AlertCircle, Loader2, Sparkles, Send } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgent: AgentUser;
  onOrderCreated: (order: OrderItem) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  currentAgent,
  onOrderCreated
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

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const resetFormTimes = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setCreateDate(`${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
  };

  useEffect(() => {
    if (isOpen) {
      resetFormTimes();
      setStatusMessage(null);
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

    const newOrderPayload = {
      customerName: customerName.trim(),
      customerContact: customerContact.trim(),
      gender: gender || 'Other',
      createDate: createDate,
      orderChannel: orderChannel || 'Acquisition',
      agentId: currentAgent.user,
      agentName: currentAgent.name,
      productCategory: productCategory || 'Electronics',
      productName: productName.trim(),
      city: finalCity,
      deliveryArea: finalArea,
      addressDetails: addressDetails,
      scheduleDate: scheduleDate,
      scheduledTime: scheduledTime,
      orderValue: numValue,
      orderStatus: 'Pending',
      followupStatus: 'Pending',
      profit: 0
    };

    try {
      const res = await OrderService.createOrder(newOrderPayload);
      if (res.success) {
        setStatusMessage({
          text: '✓ Order placed successfully and synced!',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create New Order</h2>
            <p className="text-xs text-slate-500">
              Booking under Agent: <span className="font-semibold text-blue-700">{currentAgent.user}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer details */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
              Customer Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Contact *
                </label>
                <input
                  type="tel"
                  required
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender *
                </label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white"
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
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
              Product & Source Channel
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Channel *
                </label>
                <select
                  required
                  value={orderChannel}
                  onChange={(e) => setOrderChannel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white"
                >
                  {ORDER_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Category *
                </label>
                <select
                  required
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white"
                >
                  <option value="">Select Category</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Item name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Delivery Location */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
              Delivery Location
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                <select
                  required
                  value={city}
                  onChange={handleCityChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white"
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
                    className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Area *</label>
                <select
                  required
                  value={deliveryArea}
                  onChange={handleAreaChange}
                  disabled={!city}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 bg-white disabled:bg-slate-100"
                >
                  <option value="">{city ? 'Select Area' : 'Select City First'}</option>
                  {availableAreas.map((ar) => (
                    <option key={ar} value={ar}>{ar}</option>
                  ))}
                </select>
                {deliveryArea === 'Others' && (
                  <input
                    type="text"
                    required
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    placeholder="Enter Area"
                    className="mt-2 w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address (Flat, House, Road, Block)
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <input
                    type="text"
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                    placeholder="Flat"
                    className="px-1.5 py-1 text-xs border rounded-sm bg-white"
                  />
                  <input
                    type="text"
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    placeholder="House"
                    className="px-1.5 py-1 text-xs border rounded-sm bg-white"
                  />
                  <input
                    type="text"
                    value={road}
                    onChange={(e) => setRoad(e.target.value)}
                    placeholder="Road"
                    className="px-1.5 py-1 text-xs border rounded-sm bg-white"
                  />
                  <input
                    type="text"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="Block"
                    className="px-1.5 py-1 text-xs border rounded-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Financials */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
              Schedule & Financials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule Date *
                </label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Time Slot *
                </label>
                <select
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Time Slot</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order Value (৳) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={orderValue}
                  onChange={(e) => setOrderValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Profit preview */}
            <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-blue-900 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Estimated Profit (20%):
              </span>
              <strong className="text-emerald-700 font-bold">
                ৳ {calculatedProfit.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/15 disabled:opacity-70 transition-all flex items-center gap-2 cursor-pointer"
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
    </div>
  );
};
