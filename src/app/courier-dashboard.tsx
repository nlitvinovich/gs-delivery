'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CourierDashboard({ username }: { username: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [showMinibusModal, setShowMinibusModal] = useState(false);
  const [activeOrderForModal, setActiveOrderForModal] = useState<any | null>(null);
  const [returnAddress, setReturnAddress] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnCourier, setReturnCourier] = useState(username);
  const [returnComment, setReturnComment] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const cleanUsername = username.trim().toLowerCase();

  const fetchData = async () => {
    if (!cleanUsername) return;
    const { data: o } = await supabase.from('orders').select('*').eq('courier_id', cleanUsername).order('created_at', { ascending: false });
    if (o) setOrders(o);
    const { data: c } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier').order('id', { ascending: true });
    if (c) setCouriers(c);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => { fetchData(); }, 3000);
    return () => clearInterval(interval);
  }, [cleanUsername]);

  const handleStatusChange = async (order: any, newStatus: string) => {
    if (newStatus === 'delivered' && order.type === 'minibus_send') {
      setActiveOrderForModal(order); setReturnAddress(order.address || ''); setReturnTime(order.delivery_time || '');
      setReturnDate(new Date().toISOString().split('T')[0]); setReturnCourier(cleanUsername); setReturnComment('');
      setIsFormOpen(false); setShowMinibusModal(true);
    } else {
      await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      fetchData();
    }
  };

  const handleCreateReturnOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderForModal) return;
    await supabase.from('orders').insert([{
      type: 'minibus_pickup', address: returnAddress, delivery_time: returnTime,
      phone: activeOrderForModal.phone, items: `${activeOrderForModal.items} (Обратка)`,
      price: activeOrderForModal.price, currency: 'MULTI',
      comment: returnComment ? `Внесено курьером: ${returnComment}` : `Обратка к заказу №${activeOrderForModal.id}`,
      status: 'new', courier_id: returnCourier || null, created_at: `${returnDate}T12:00:00.000Z`
    }]);
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', activeOrderForModal.id);
    setShowMinibusModal(false); setActiveOrderForModal(null); setIsFormOpen(false); fetchData();
    alert('Обратный заказ создан!');
  };

  const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'in_transit');
  const inactiveOrders = orders.filter(o => o.status === 'delivered' || o.status === 'canceled');
  const getTypeName = (t: string) => {
    const names: Record<string, string> = { city_delivery: '🏙️ Город', minibus_send: '🚌 Маршр.', courier_service: '📦 Служба', pickup: '🏪 Самовыв.', minibus_pickup: '📥 Забор', errand: '🏃 Поруч.' };
    return names[t] || t;
  };
  return (
    <div className="max-w-md mx-auto space-y-3 text-slate-900 px-1">
      <div className="space-y-1.5">
        <h2 className="text-sm font-bold flex justify-between items-center px-1">
          <span>Активные задачи</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{activeOrders.length}</span>
        </h2>
        {activeOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl p-2.5 shadow-xs border border-gray-100 space-y-1">
            <div className="flex justify-between items-center text-[11px] gap-1.5 overflow-x-auto whitespace-nowrap">
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-black text-indigo-600">№{order.id}</span>
                <span className="font-bold px-1.5 py-0.5 bg-slate-50 text-gray-600 rounded-md">{getTypeName(order.type)}</span>
              </div>
              <a href={`tel:${order.phone}`} className="text-indigo-600 font-bold underline shrink-0">{order.phone}</a>
              <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0">{order.delivery_time || 'Пул'}</span>
            </div>
            
            <div className="flex items-start justify-between gap-2 pt-0.5">
              <p className="text-xs font-bold text-gray-800 flex-1 leading-tight">{order.address}</p>
              <a href={`yandexmaps://maps.yandex.ru/?text=${encodeURIComponent(order.address)}`} className="bg-amber-50 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">Карта 🗺️</a>
            </div>
            
            <div className="text-[11px] bg-slate-50/60 p-1.5 rounded-lg text-gray-700 leading-tight">
              <span className="font-medium text-gray-400">Товары:</span> {order.items}
              {order.comment && <p className="text-[10px] text-amber-700 mt-0.5 font-mono">💡 {order.comment}</p>}
            </div>
            
            <div className="flex justify-between items-center pt-0.5 gap-2 border-t border-gray-50">
              <p className="text-xs font-black text-gray-900 flex-1 truncate">{order.price}</p>
              <select value={order.status} onChange={(e) => handleStatusChange(order, e.target.value)} className="p-0.5 bg-slate-50 font-bold text-[10px] rounded-md border-0 text-slate-800">
                <option value="new">🆕 Новый</option><option value="in_transit">🚀 В пути</option><option value="delivered">✅ Вып.</option><option value="canceled">🛑 Отказ</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 pt-2 border-t border-gray-100">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-1 flex justify-between items-center">
          <span>Завершенные и отказы</span>
          <span className="bg-gray-50 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">{inactiveOrders.length}</span>
        </h2>
        {inactiveOrders.map((order) => (
          <div key={order.id} className="bg-gray-50/70 border border-gray-100 rounded-xl p-1.5 flex justify-between items-center opacity-75 gap-2">
            <div className="space-y-0.5 max-w-[55%] min-w-0">
              <div className="flex items-center gap-1.5 text-[11px]"><span className="font-black text-gray-500">№{order.id}</span><p className="font-bold truncate text-gray-700">{order.address}</p></div>
              <p className="text-[10px] text-gray-400 truncate">🛍️ {order.items}</p>
            </div>
            <div className="flex items-center gap-1 max-w-[45%] justify-end shrink-0">
              <p className="text-[11px] font-black text-gray-600 truncate">{order.price}</p>
              <select value={order.status} onChange={(e) => handleStatusChange(order, e.target.value)} className="p-0.5 bg-white font-bold text-[9px] rounded border text-slate-800">
                <option value="new">🆕 Нов</option><option value="in_transit">🚀 Путь</option><option value="delivered">✅ Вып</option><option value="canceled">🛑 Отк</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {showMinibusModal && activeOrderForModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-2xl p-4 space-y-3 max-h-[80vh] overflow-y-auto text-xs">
            <h3 className="font-bold text-center text-gray-800">Маршрутка №{activeOrderForModal.id}</h3>
            {!isFormOpen ? (
              <div className="space-y-1"><button type="button" onClick={() => setIsFormOpen(true)} className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold text-xs">🔄 С обраткой</button><button type="button" onClick={() => handleStatusChange(activeOrderForModal, 'delivered')} className="w-full bg-gray-50 text-gray-700 py-2 rounded-xl font-bold text-xs">➡️ Без обратки</button><button type="button" onClick={() => { setShowMinibusModal(false); setActiveOrderForModal(null); }} className="w-full text-gray-400 py-1 text-center">Отмена</button></div>
            ) : (
              <form onSubmit={handleCreateReturnOrder} className="space-y-2">
                <input type="text" value={returnAddress} onChange={(e) => setReturnAddress(e.target.value)} required placeholder="Адрес забора" className="w-full p-2 bg-gray-50 rounded-lg border-0" />
                <div className="grid grid-cols-2 gap-2"><input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} required className="w-full p-2 bg-gray-50 rounded-lg border-0" /><input type="text" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} placeholder="До 14:00" className="w-full p-2 bg-gray-50 rounded-lg border-0" /></div>
                <select value={returnCourier} onChange={(e) => setReturnCourier(e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border-0">{couriers.map((c) => <option key={c.username} value={c.username}>{c.username === cleanUsername ? `👤 Я` : `👤 ${c.full_name}`}</option>)}</select>
                <textarea value={returnComment} onChange={(e) => setReturnComment(e.target.value)} placeholder="Комментарий..." rows={2} className="w-full p-2 bg-gray-50 rounded-lg border-0" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">💾 Создать обратку</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="w-full text-gray-400 py-1 text-center">Назад</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
