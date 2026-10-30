'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerJournal() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchAllOrders = async () => {
    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;
    const { data } = await supabase.from('orders').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false });
    if (data) setAllOrders(data);
  };

  useEffect(() => { fetchAllOrders(); }, [selectedDate]);

  const getTypeName = (t: string) => {
    const names: Record<string, string> = {
      city_delivery: '🏙️ По городу', minibus_send: '🚌 Маршрутка (отпр)',
      courier_service: '📦 Курьерская сл.', pickup: '🏪 Самовывоз',
      minibus_pickup: '📥 Маршрутка (забор)', errand: '🏃 Поручение'
    };
    return names[t] || t;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700">Дата просмотра:</span>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-sm font-semibold border-0 text-gray-800" />
      </div>
      <div className="space-y-3">
        {allOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white rounded-3xl border border-dashed">Заказов на эту дату нет</p>
        ) : (
          allOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">{getTypeName(o.type)}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${o.status === 'new' ? 'bg-blue-50 text-blue-600' : o.status === 'in_transit' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {o.status === 'new' ? 'Новый' : o.status === 'in_transit' ? 'В пути' : 'Доставлен'}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-800">{o.address}</p>
              <p className="text-xs text-gray-500">🛍️ {o.items}</p>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-50">
                <span className="text-gray-400">Курьер: <strong className="text-gray-700">{o.courier_id || 'Не назначен'}</strong></span>
                <span className="font-black text-gray-800 text-sm">{o.price} {o.currency}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
