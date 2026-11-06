'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import CourierOrderCard from './courier-order-card'; // Импортируем карточку

export default function CourierDashboard({ username }: { username: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [showMinibusModal, setShowMinibusModal] = useState(false);
  const [activeOrderForModal, setActiveOrderForModal] = useState<any | null>(null);
  
  const [returnAddress, setReturnAddress] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T'));
  const [returnCourier, setReturnCourier] = useState(username);
  const [returnComment, setReturnComment] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const cleanUsername = username.trim().toLowerCase();

  const fetchData = async () => {
    if (!cleanUsername) return;
    const { data: oData } = await supabase.from('orders').select('*').eq('courier_id', cleanUsername).order('created_at', { ascending: false });
    if (oData) setOrders(oData);
    const { data: cData } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier').order('id', { ascending: true });
    if (cData) setCouriers(cData);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => { fetchData(); }, 3000);
    return () => clearInterval(interval);
  }, [cleanUsername]);

  const handleStatusChange = async (order: any, newStatus: string) => {
    if (newStatus === 'delivered' && order.type === 'minibus_send') {
      setActiveOrderForModal(order); setReturnAddress(order.address || ''); setReturnTime(order.delivery_time || '');
      setReturnDate(new Date().toISOString().split('T')); setReturnCourier(cleanUsername); setReturnComment('');
      setIsFormOpen(false); setShowMinibusModal(true);
    } else {
      await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      fetchData();
    }
  };

  const finishOrderDelivery = async (id: number) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id);
    setShowMinibusModal(false); setActiveOrderForModal(null); setIsFormOpen(false); fetchData();
  };

  const handleCreateReturnOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderForModal) return;
    const targetTimestamp = `${returnDate}T12:00:00.000Z`;

    await supabase.from('orders').insert([{
      type: 'minibus_pickup', address: returnAddress, delivery_time: returnTime,
      phone: activeOrderForModal.phone, items: `${activeOrderForModal.items} (Обратка)`,
      price: activeOrderForModal.price, currency: 'MULTI',
      comment: returnComment ? `Внесено курьером: ${returnComment}` : `Обратка к заказу №${activeOrderForModal.id}`,
      status: 'new', courier_id: returnCourier || null, created_at: targetTimestamp
    }]);

    await finishOrderDelivery(activeOrderForModal.id);
    alert('Обратный заказ создан!');
  };

  const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'in_transit');
  const inactiveOrders = orders.filter(o => o.status === 'delivered' || o.status === 'canceled');

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      city_delivery: '🏙️ По городу', minibus_send: '🚌 Отправка маршруткой',
      courier_service: '📦 Курьерская служба', pickup: '🏪 Самовывоз',
      minibus_pickup: '📥 Забор маршрутки', errand: '🏃 Поручение'
    };
    return names[type] || type;
  };

  return (
    <div className="max-w-md mx-auto space-y-6 text-slate-900">
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex justify-between items-center px-1">
          <span>Активные задачи</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-full">{activeOrders.length}</span>
        </h2>
        {activeOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white rounded-3xl border border-dashed text-sm">Нет активных задач</p>
        ) : (
          activeOrders.map((order) => (
            <CourierOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} getTypeName={getTypeName} />
          ))
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-200">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider px-1 flex justify-between items-center">
          <span>Завершенные и отказы</span>
          <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">{inactiveOrders.length}</span>
        </h2>
        <div className="space-y-2">
          {inactiveOrders.map((order) => (
            <div key={order.id} className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3 flex justify-between items-center opacity-70">
              <div className="space-y-0.5 max-w-[50%]">
                <p className="text-xs font-bold truncate">{order.address}</p>
                <p className="text-[10px] text-gray-400 truncate">🛍️ {order.items}</p>
              </div>
              <div className="flex items-center gap-2 max-w-[50%] justify-end">
                <p className="text-xs font-black text-gray-600 break-all">{order.price}</p>
                <select value={order.status} onChange={(e) => handleStatusChange(order, e.target.value)} className="p-1.5 bg-white font-bold text-[10px] rounded-lg border text-slate-800">
                  <option value="new">🆕 Новый</option><option value="in_transit">🚀 В пути</option><option value="delivered">✅ Выполнено</option><option value="canceled">🛑 Отказ</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showMinibusModal && activeOrderForModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 text-center">Завершение маршрутки</h3>
            {!isFormOpen ? (
              <div className="space-y-2">
                <button type="button" onClick={() => setIsFormOpen(true)} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm">🔄 С обраткой</button>
                <button type="button" onClick={() => finishOrderDelivery(activeOrderForModal.id)} className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold text-sm">➡️ Без обратки</button>
                <button type="button" onClick={() => { setShowMinibusModal(false); setActiveOrderForModal(null); }} className="w-full text-xs text-gray-400 py-2 text-center">Отмена</button>
              </div>
            ) : (
              <form onSubmit={handleCreateReturnOrder} className="space-y-3">
                <input type="text" value={returnAddress} onChange={(e) => setReturnAddress(e.target.value)} required placeholder="Адрес забора" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} required className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-xs" />
                  <input type="text" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} placeholder="До 14:00" className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-xs" />
                </div>
                <select value={returnCourier} onChange={(e) => setReturnCourier(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm">
                  <option value="">-- Общий пул --</option>
                  {couriers.map((c) => <option key={c.username} value={c.username}>{c.username === cleanUsername ? `👤 Я (${c.full_name})` : `👤 ${c.full_name}`}</option>)}
                </select>
                <textarea value={returnComment} onChange={(e) => setReturnComment(e.target.value)} placeholder="Комментарий курьера..." rows={2} className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm">💾 Создать обратку</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="w-full text-xs text-gray-500 py-2 text-center">Назад</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
