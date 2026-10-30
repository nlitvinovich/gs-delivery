'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CourierDashboardProps {
  username: string;
}

export default function CourierDashboard({ username }: CourierDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('courier_id', username) // Фильтр: показываем только заказы этого курьера
      .order('created_at', { ascending: false });
    if (!error && data) setOrders(data);
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [username]);

  const updateStatus = async (id: number, currentStatus: string) => {
    let nextStatus = 'in_transit';
    if (currentStatus === 'in_transit') nextStatus = 'delivered';
    
    await supabase.from('orders').update({ status: nextStatus }).eq('id', id);
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      city_delivery: '🏙️ По городу', minibus_send: '🚌 Отправка маршруткой',
      courier_service: '📦 Курьерская служба', pickup: '🏪 Самовывоз',
      minibus_pickup: '📥 Забор маршрутки', errand: '🏃 Поручение'
    };
    return names[type] || type;
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800 px-1">Мои задачи (В реальном времени)</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Заказов пока нет</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                {getTypeName(order.type)}
              </span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {order.delivery_time || 'Время не указано'}
              </span>
            </div>

            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">{order.address}</p>
                <a 
                  href={`yandexmaps://maps.yandex.ru/?text=${encodeURIComponent(order.address)}`}
                  className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0"
                >
                  Карта 🗺️
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl">
              <span className="text-xs text-gray-500">Клиент: <a href={`tel:${order.phone}`} className="text-indigo-600 font-bold underline ml-1">{order.phone}</a></span>
            </div>

            <div className="text-sm text-gray-600 bg-slate-50/50 p-3 rounded-xl border border-dashed">
              <span className="font-medium text-gray-700">Товары:</span> {order.items}
              {order.comment && <p className="text-xs text-amber-700 mt-1 font-mono">💡 {order.comment}</p>}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="text-lg font-black text-gray-900">{order.price} {order.currency}</p>
                <p className="text-[10px] text-gray-400">Курс: {order.usd_rate}</p>
              </div>

              <button
                onClick={() => updateStatus(order.id, order.status)}
                disabled={order.status === 'delivered'}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                  order.status === 'new' ? 'bg-blue-600 text-white' : 
                  order.status === 'in_transit' ? 'bg-amber-500 text-white' : 
                  'bg-gray-100 text-gray-400 border cursor-not-allowed'
                }`}
              >
                {order.status === 'new' ? 'В путь 🚀' : 
                 order.status === 'in_transit' ? 'Доставлен ✅' : 'Выполнено 🎉'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
