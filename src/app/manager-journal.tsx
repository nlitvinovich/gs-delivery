'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ManagerEditModal from './manager-edit-modal';

export default function ManagerJournal() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCourierFilter, setSelectedCourierFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const fetchData = async () => {
    const { data: cData } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier');
    if (cData) setCouriers(cData);
    
    // Фильтруем строго по дате выполнения заказа
    let query = supabase.from('orders').select('*').eq('order_date', selectedDate);
    
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

  const getTypeName = (t: string) => {
    const names: Record<string, string> = { 
      city_delivery: '🏙️ Город', minibus_send: '🚌 Маршр.', 
      courier_service: '📦 Служба', pickup: '🏪 Самовыв.', 
      minibus_pickup: '📥 Забор', errand: '🏃 Поруч.' 
    };
    return names[t] || t;
  };
  return (
    <div className="space-y-3">
      {/* Панель фильтров */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-100 space-y-2 text-xs text-slate-800">
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-700">Дата просмотра:</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-1.5 bg-slate-50 rounded-lg border-0 font-bold text-slate-900" />
        </div>
        <div className="flex justify-between items-center border-t border-slate-50 pt-2">
          <span className="font-bold text-slate-700">Фильтр курьера:</span>
          <select value={selectedCourierFilter} onChange={(e) => setSelectedCourierFilter(e.target.value)} className="p-1.5 bg-slate-50 rounded-lg border-0 font-bold text-slate-900">
            <option value="all">👀 Все</option>
            <option value="none">🛑 Не назначены</option>
            {couriers.map((c) => <option key={c.username} value={c.username}>👤 {c.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Список компактных карточек */}
      <div className="space-y-2">
        {allOrders.length === 0 ? (
          <p className="text-slate-400 text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200 text-xs">Заказов на эту дату нет</p>
        ) : (
          allOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl p-2.5 shadow-xs border border-gray-100 space-y-1 text-xs text-slate-900">
              <div className="flex justify-between items-center text-[11px] gap-1.5 overflow-x-auto whitespace-nowrap">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-black text-indigo-600">№{o.id}</span>
                  <span className="font-bold px-1.5 py-0.5 bg-slate-50 text-gray-600 rounded-md">{getTypeName(o.type)}</span>
                </div>
                <a href={`tel:${o.phone}`} className="text-indigo-600 font-bold underline shrink-0">{o.phone}</a>
                <span className={`px-1.5 py-0.5 rounded-md font-black shrink-0 ${o.status === 'canceled' ? 'bg-red-50 text-red-600' : o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : o.status === 'in_transit' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {o.status === 'new' ? 'Новый' : o.status === 'in_transit' ? 'В пути' : o.status === 'delivered' ? 'Вып.' : 'Отк. 🛑'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2 pt-0.5">
                <p className="font-bold text-gray-800 flex-1 leading-tight">{o.address}</p>
              </div>

              <div className="text-[11px] bg-slate-50/60 p-1.5 rounded-lg text-gray-700 leading-tight">
                <span className="font-medium text-gray-400">Товары:</span> {o.items}
                {o.comment && <p className="text-[10px] text-amber-700 mt-0.5 font-mono">💡 {o.comment}</p>}
              </div>

              <div className="flex justify-between items-center pt-1 gap-2 border-t border-gray-50 text-[11px]">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 truncate">Курьер: <strong className="text-gray-700 font-bold">{couriers.find(c => c.username === o.courier_id)?.full_name || 'Пул'}</strong></p>
                  <p className="font-black text-gray-900 break-all">{o.price}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => setEditingOrder(o)} className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-lg">Правка ✏️</button>
                  <button type="button" onClick={() => handleDeleteOrder(o.id)} className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
