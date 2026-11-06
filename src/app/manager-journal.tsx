'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ManagerEditModal from './manager-edit-modal'; // Импортируем нашу новую шторку

export default function ManagerJournal() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T'));
  const [selectedCourierFilter, setSelectedCourierFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const fetchData = async () => {
    const { data: cData } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier');
    if (cData) setCouriers(cData);
    
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    let query = supabase.from('orders').select('*').gte('created_at', start).lte('created_at', end);
    if (selectedCourierFilter === 'none') query = query.is('courier_id', null);
    else if (selectedCourierFilter !== 'all') query = query.eq('courier_id', selectedCourierFilter);

    const { data: oData } = await query.order('created_at', { ascending: false });
    if (oData) setAllOrders(oData);
  };

  useEffect(() => { fetchData(); }, [selectedDate, selectedCourierFilter]);

  const handleDeleteOrder = async (id: number) => {
    if (window.confirm(`Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ заказ №${id}?`)) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3 text-sm text-slate-800">
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-700">Дата просмотра:</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 bg-slate-50 rounded-xl border-0 font-bold text-slate-900" />
        </div>
        <div className="flex justify-between items-center border-t border-slate-50 pt-2">
          <span className="font-bold text-slate-700">Фильтр курьера:</span>
          <select value={selectedCourierFilter} onChange={(e) => setSelectedCourierFilter(e.target.value)} className="p-2 bg-slate-50 rounded-xl border-0 font-bold text-slate-900">
            <option value="all">👀 Все</option><option value="none">🛑 Не назначены</option>
            {couriers.map((c) => <option key={c.username} value={c.username}>👤 {c.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Список заказов */}
      <div className="space-y-3">
        {allOrders.length === 0 ? (
          <p className="text-slate-400 text-center py-8 bg-white rounded-3xl border border-dashed border-slate-200 text-sm">Заказов нет</p>
        ) : (
          allOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-2 text-sm text-slate-900">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">{o.type === 'city_delivery' ? '🏙️ Город' : '🚌 Маршрутка'}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded font-black ${o.status === 'canceled' ? 'bg-red-50 text-red-600' : o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : o.status === 'in_transit' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {o.status === 'new' ? 'Новый' : o.status === 'in_transit' ? 'В пути' : o.status === 'delivered' ? 'Доставлен' : 'Отказ 🛑'}
                  </span>
                  <button type="button" onClick={() => setEditingOrder(o)} className="text-indigo-600 font-black bg-indigo-50 px-2.5 py-1 rounded-xl cursor-pointer">Правка ✏️</button>
                  <button type="button" onClick={() => handleDeleteOrder(o.id)} className="text-red-500 font-black bg-red-50 px-2.5 py-1 rounded-xl cursor-pointer">🗑️</button>
                </div>
              </div>
              <p className="font-black text-base text-slate-900">{o.address}</p>
              <p className="text-sm text-slate-800 font-medium">🛍️ {o.items}</p>
              {o.comment && <p className="text-xs text-amber-800 font-mono bg-amber-50 p-2 rounded-xl">💡 {o.comment}</p>}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50 text-slate-500 font-medium">
                <span>Курьер: <strong className="text-slate-900 font-bold">{couriers.find(c => c.username === o.courier_id)?.full_name || 'Не назначен'}</strong></span>
                <span className="font-black text-slate-900 text-base">{o.price}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Рендерим модальное окно из отдельного файла */}
      {editingOrder && (
        <ManagerEditModal 
          order={editingOrder} 
          couriers={couriers} 
          onClose={() => setEditingOrder(null)} 
          onUpdated={() => { setEditingOrder(null); fetchData(); }} 
        />
      )}
    </div>
  );
}
