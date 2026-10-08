import React, { useState, useEffect } from 'react';
import { AgentUser, OrderItem } from '../types';
import { CITY_AREA_MAP, ORDER_CHANNELS, PRODUCT_CATEGORIES, TIME_SLOTS } from '../data/mockOrders';
import { OrderService } from '../services/orderService';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Send } from 'lucide-react';

interface CreateOrderViewProps {
  currentAgent: AgentUser;
  onOrderCreated: (order: OrderItem) => void;
}

export const CreateOrderView: React.FC<CreateOrderViewProps> = ({
  currentAgent,
  onOrderCreated
}) => {
  // Form States
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');

  const [orderChannel, setOrderChannel] = useState('');
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

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Initialize dates
  const resetFormTimes = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setCreateDate(`${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`);

    // Default schedule date is tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
  };

  useEffect(() => {
    resetFormTimes();
  }, []);

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

  const availableAreas = city ? (CITY_AREA_MAP[city] || []) : [];

  const calculatedProfit = orderValue && !isNaN(Number(orderValue))
    ? Math.round(Number(orderValue) * 0.20)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    const finalCity = city === 'Others' ? (customCity.trim() || 'Others') : city;
    const finalArea = deliveryArea === 'Others' ? (customArea.trim() || 'Others') : deliveryArea;

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
      profit: calculatedProfit
    };

    try {
      const res = await OrderService.createOrder(newOrderPayload);
      if (res.success) {
        setStatusMessage({
          text: res.remoteSynced
            ? '✓ Order placed successfully and synced to Google Sheets!'
            : '✓ Order placed successfully! (Saved to local order ledger)',
          type: 'success'
        });
        onOrderCreated(res.order);

        // Reset inputs
        setCustomerName('');
        setCustomerContact('');
        setGender('');
        setProductName('');
        setFlat('');
        setHouse('');
        setRoad('');
        setBlock('');
        setOrderValue('');
        resetFormTimes();
      } else {
        setStatusMessage({ text: '✕ Error placing order. Please try again.', type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: '✕ Failed to save order. Check connection.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Order</h1>
        <p className="text-xs text-slate-500 mt-1">
          Fill out the details below compactly. Orders are recorded under your agent profile.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-fadeIn ${
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
        {/* Card 1: Informations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
            Customer & Agent Information
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full customer name"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Contact <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                placeholder="e.g. 017xxxxxxxx"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Agent ID</label>
              <input
                type="text"
                readOnly
                value={currentAgent.user}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium select-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Name</label>
              <input
                type="text"
                readOnly
                value={currentAgent.name}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium select-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Source & Products */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
            Source & Products
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Channel <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={orderChannel}
                onChange={(e) => setOrderChannel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Select Channel</option>
                {ORDER_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Select Category</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Product item name / SKU"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Locations Details */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
            Location Details
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={city}
                onChange={handleCityChange}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Select City</option>
                <option value="Dhaka">Dhaka</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Jashore">Jashore</option>
                <option value="Others">Others</option>
              </select>
              {city === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Enter custom city name"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-600"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Area <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={deliveryArea}
                onChange={handleAreaChange}
                disabled={!city}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{city ? 'Select Area' : 'Select City First'}</option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              {deliveryArea === 'Others' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    placeholder="Enter custom area"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-600"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address Details (Compact breakdown)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <div className="flex border border-slate-300 rounded-md overflow-hidden bg-white">
                  <div className="bg-slate-100 px-1.5 py-1 text-[10px] font-bold text-slate-600 border-r border-slate-300 flex items-center">
                    Flat
                  </div>
                  <input
                    type="text"
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                    placeholder="102"
                    className="w-full px-1.5 py-1 text-xs outline-hidden"
                  />
                </div>
                <div className="flex border border-slate-300 rounded-md overflow-hidden bg-white">
                  <div className="bg-slate-100 px-1.5 py-1 text-[10px] font-bold text-slate-600 border-r border-slate-300 flex items-center">
                    House
                  </div>
                  <input
                    type="text"
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    placeholder="45"
                    className="w-full px-1.5 py-1 text-xs outline-hidden"
                  />
                </div>
                <div className="flex border border-slate-300 rounded-md overflow-hidden bg-white">
                  <div className="bg-slate-100 px-1.5 py-1 text-[10px] font-bold text-slate-600 border-r border-slate-300 flex items-center">
                    Road
                  </div>
                  <input
                    type="text"
                    value={road}
                    onChange={(e) => setRoad(e.target.value)}
                    placeholder="15A"
                    className="w-full px-1.5 py-1 text-xs outline-hidden"
                  />
                </div>
                <div className="flex border border-slate-300 rounded-md overflow-hidden bg-white">
                  <div className="bg-slate-100 px-1.5 py-1 text-[10px] font-bold text-slate-600 border-r border-slate-300 flex items-center">
                    Block
                  </div>
                  <input
                    type="text"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="F"
                    className="w-full px-1.5 py-1 text-xs outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Date & Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b-2 border-blue-100 pb-2 mb-4">
            Date & Financials
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Create Date</label>
              <input
                type="text"
                readOnly
                value={createDate}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-mono select-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Schedule Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Time <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Time Slot</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Value (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-semibold"
              />
            </div>
          </div>

          {/* Profit estimate bar */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs mb-4">
            <div className="flex items-center gap-2 text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Estimated Commission Profit (20% margin):</span>
            </div>
            <span className="font-bold text-emerald-700 text-sm">
              ৳ {calculatedProfit.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              All mandatory fields marked with (<span className="text-red-500">*</span>)
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-7 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/15 disabled:opacity-70 transition-all flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
