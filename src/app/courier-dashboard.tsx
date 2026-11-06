'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import CourierBlock from './courier-blocks';

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
      setReturnDate(new Date().toISOString().split('T')); setReturnCourier(cleanUsername); setReturnComment('');
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

  const active = orders.filter(o => o.status === 'new' || o.status === 'in_transit');
  const inactive = orders.filter(o => o.status === 'delivered' || o.status === 'canceled');
  const getTypeName = (t: string) => {
    const names: Record<string, string> = { city_delivery: '🏙️ Город', minibus_send: '🚌 Маршр.', courier_service: '📦 Служба', pickup: '🏪 Самовыв.', minibus_pickup: '📥 Забор', errand: '🏃 Поруч.' };
    return names[t] || t;
  };

  return (
    <div className="max-w-md mx-auto space-y-4 text-slate-900 px-1 pb-10">
      <CourierBlock title="📥 Заборы маршруток" items={active.filter(o => o.type === 'minibus_pickup')} color="text-amber-600" getTypeName={getTypeName} onStatusChange={handleStatusChange} />
      <CourierBlock title="⚡ Активные задачи" items={active.filter(o => o.type === 'city_delivery' || o.type === 'pickup' || o.type === 'minibus_send')} color="text-blue-600" getTypeName={getTypeName} onStatusChange={handleStatusChange} />
      <CourierBlock title="🏃 Поручения" items={active.filter(o => o.type === 'errand')} color="text-indigo-600" getTypeName={getTypeName} onStatusChange={handleStatusChange} />
      <CourierBlock title="📦 Курьерская доставка" items={active.filter(o => o.type === 'courier_service')} color="text-purple-600" getTypeName={getTypeName} onStatusChange={handleStatusChange} />

      {active.length === 0 && <p className="text-gray-400 text-center py-6 bg-white rounded-2xl border border-dashed text-xs">Нет активных задач</p>}

      <div className="space-y-1 pt-2 border-t border-gray-100">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-1 flex justify-between items-center"><span>Завершенные и отказы</span><span className="bg-gray-50 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">{inactive.length}</span></h2>
        {inactive.map((order) => (
          <div key={order.id} className="bg-gray-50/70 border border-gray-100 rounded-xl p-1.5 flex justify-between items-center opacity-75 gap-2 text-xs">
            <div className="space-y-0.5 max-w-[55%] min-w-0">
              <div className="flex items-center gap-1.5 text-[11px]"><span className="font-black text-gray-400">№{order.id}</span><p className="font-bold truncate text-gray-700">{order.address}</p></div>
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
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-4 space-y-3 max-h-[80vh] overflow-y-auto text-xs">
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
