'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CourierDashboardProps {
  username: string;
}

export default function CourierDashboard({ username }: CourierDashboardProps) {
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

  const fetchData = async () => {
    // Загружаем ВСЕ заказы курьера (включая доставленные и отказы)
    const { data: oData } = await supabase
      .from('orders')
      .select('*')
      .eq('courier_id', username)
      .order('created_at', { ascending: false });
    if (oData) setOrders(oData);

    const { data: cData } = await supabase
      .from('app_users')
      .select('username, full_name')
      .eq('role', 'courier')
      .order('id', { ascending: true });
    if (cData) setCouriers(cData);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [username]);

  const handleStatusButtonClick = async (order: any) => {
    if (order.status === 'new') {
      await supabase.from('orders').update({ status: 'in_transit' }).eq('id', order.id);
      fetchData();
    } else if (order.status === 'in_transit') {
      if (order.type === 'minibus_send') {
        setActiveOrderForModal(order);
        setReturnAddress(order.address || '');
        setReturnTime(order.delivery_time || '');
        setReturnDate(new Date().toISOString().split('T')[0]);
        setReturnCourier(username);
        setReturnComment('');
        setIsFormOpen(false);
        setShowMinibusModal(true);
      } else {
        await finishOrderDelivery(order.id);
      }
    }
  };

  const finishOrderDelivery = async (id: number) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id);
    setShowMinibusModal(false);
    setActiveOrderForModal(null);
    setIsFormOpen(false);
    fetchData();
  };

  const handleCreateReturnOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderForModal) return;
    const targetTimestamp = `${returnDate}T12:00:00.000Z`;

    const { error } = await supabase.from('orders').insert([
      {
        type: 'minibus_pickup',
        address: returnAddress,
        delivery_time: returnTime,
        phone: activeOrderForModal.phone,
        items: `${activeOrderForModal.items} (Обратка)`,
        price: activeOrderForModal.price,
        currency: activeOrderForModal.currency,
        usd_rate: activeOrderForModal.usd_rate,
        comment: returnComment ? `Внесено курьером: ${returnComment}` : `Обратка к заказу №${activeOrderForModal.id}`,
        status: 'new',
        courier_id: returnCourier || null,
        created_at: targetTimestamp
      }
    ]);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      await finishOrderDelivery(activeOrderForModal.id);
      alert('Обратный заказ успешно создан!');
    }
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      city_delivery: '🏙️ По городу', minibus_send: '🚌 Отправка маршруткой',
      courier_service: '📦 Курьерская служба', pickup: '🏪 Самовывоз',
      minibus_pickup: '📥 Забор маршрутки', errand: '🏃 Поручение'
    };
    return names[type] || type;
  };

  // Разделяем массив на активные и архивные
  const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'in_transit');
  const inactiveOrders = orders.filter(o => o.status === 'delivered' || o.status === 'canceled');
  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* СЕКЦИЯ 1: АКТИВНЫЕ ЗАДАЧИ */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 px-1 flex justify-between items-center">
          <span>Активные задачи</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-full">{activeOrders.length}</span>
        </h2>
        
        {activeOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white rounded-3xl border border-dashed text-sm">Нет активных заказов на сегодня</p>
        ) : (
          activeOrders.map((order) => (
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
                  type="button"
                  onClick={() => handleStatusButtonClick(order)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                    order.status === 'new' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {order.status === 'new' ? 'В путь 🚀' : 'Доставлен ✅'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* СЕКЦИЯ 2: СВЕРНУТЫЙ АРХИВ ЗАВЕРШЕННЫХ И ОТКАЗОВ */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider px-1 flex justify-between items-center">
          <span>Завершенные и отказы</span>
          <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">{inactiveOrders.length}</span>
        </h2>

        <div className="space-y-2">
          {inactiveOrders.map((order) => (
            <div key={order.id} className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3 flex justify-between items-center opacity-70">
              <div className="space-y-0.5 max-w-[70%]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded">
                    {getTypeName(order.type).split(' ')[0]} {/* Показываем только иконку для компактности */}
                  </span>
                  <p className="text-xs font-bold text-gray-700 truncate">{order.address}</p>
                </div>
                <p className="text-[10px] text-gray-400 truncate">🛍️ {order.items}</p>
              </div>

              <div className="text-right">
                <span className={`inline-block text-[10px] font-black px-2 py-1 rounded-lg ${
                  order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {order.status === 'delivered' ? 'Выполнено ✓' : 'ОТКАЗ 🛑'}
                </span>
                <p className="text-xs font-black text-gray-600 mt-0.5">{order.price} {order.currency}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ШТОРКА ЗАВЕРШЕНИЯ МАРШРУТКИ С КАЛЕНДАРЕМ И ВЫБОРОМ КУРЬЕРА */}
      {showMinibusModal && activeOrderForModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-6 space-y-4 shadow-xl text-left max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800">Завершение маршрутки</h3>
              <p className="text-xs text-gray-400 mt-1">
                {!isFormOpen ? 'Требуется ли оформить обратный забор?' : 'Укажите данные для обратного забора'}
              </p>
            </div>
            
            {!isFormOpen ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="w-full bg-indigo-600 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  🔄 С обраткой (заполнить данные)
                </button>
                <button
                  type="button"
                  onClick={() => finishOrderDelivery(activeOrderForModal.id)}
                  className="w-full bg-gray-100 text-gray-700 py-3.5 px-4 rounded-xl font-bold text-sm active:scale-95 transition-all cursor-pointer"
                >
                  ➡️ Без обратки (просто завершить)
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMinibusModal(false); setActiveOrderForModal(null); }}
                  className="w-full text-xs text-gray-400 py-2 text-center cursor-pointer"
                >
                  Отмена
                </button>
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
                  {couriers.map((c) => (
                    <option key={c.username} value={c.username}>
                      {c.username === username ? `👤 Я (${c.full_name})` : `👤 ${c.full_name}`}
                    </option>
                  ))}
                </select>
                <textarea value={returnComment} onChange={(e) => setReturnComment(e.target.value)} placeholder="Номер маршрутки, особенности..." rows={2} className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm" />
                <div className="pt-2 space-y-2">
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md cursor-pointer">💾 Создать обратку</button>
                  <button type="button" onClick={() => setIsFormOpen(false)} className="w-full text-xs text-gray-500 py-2 text-center cursor-pointer">Назад</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
