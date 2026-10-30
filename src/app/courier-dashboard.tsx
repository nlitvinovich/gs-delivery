'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CourierDashboardProps {
  username: string;
}

export default function CourierDashboard({ username }: CourierDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]); // Список коллег
  
  // Состояния для шторки
  const [showMinibusModal, setShowMinibusModal] = useState(false);
  const [activeOrderForModal, setActiveOrderForModal] = useState<any | null>(null);
  
  // Поля ввода для обратки
  const [returnAddress, setReturnAddress] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]); // Дата по умолчанию сегодня
  const [returnCourier, setReturnCourier] = useState(username); // Курьер по умолчанию — сам создатель
  const [returnComment, setReturnComment] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchData = async () => {
    // Загружаем заказы текущего курьера
    const { data: oData } = await supabase
      .from('orders')
      .select('*')
      .eq('courier_id', username)
      .order('created_at', { ascending: false });
    if (oData) setOrders(oData);

    // Загружаем список всех курьеров для переназначения обратки
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
        setReturnCourier(username); // Сбрасываем назначение на себя
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

    // Собираем точную дату и время для поля создаваемого заказа
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
        courier_id: returnCourier || null, // Привязываем к выбранному курьеру (или в общий пул, если пустой)
        created_at: targetTimestamp // Устанавливаем выбранную курьером дату
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
                type="button"
                onClick={() => handleStatusButtonClick(order)}
                disabled={order.status === 'delivered'}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                  order.status === 'new' ? 'bg-blue-600 text-white' : 
                  order.status === 'in_transit' ? 'bg-amber-50 text-white' : 
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
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Место забора (Адрес)</label>
                  <input
                    type="text"
                    value={returnAddress}
                    onChange={(e) => setReturnAddress(e.target.value)}
                    required
                    className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Дата забора</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      required
                      className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-xs text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Время забора</label>
                    <input
                      type="text"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      placeholder="До 14:00"
                      className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-xs text-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Назначить курьера</label>
                  <select
                    value={returnCourier}
                    onChange={(e) => setReturnCourier(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Общий пул (Не назначен) --</option>
                    {couriers.map((c) => (
                      <option key={c.username} value={c.username}>
                        {c.username === username ? `👤 Я (${c.full_name})` : `👤 ${c.full_name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Комментарий курьера</label>
                  <textarea
                    value={returnComment}
                    onChange={(e) => setReturnComment(e.target.value)}
                    placeholder="Номер маршрутки, вокзал, особенности..."
                    rows={2}
                    className="w-full p-2.5 bg-gray-50 rounded-xl border-0 text-sm text-gray-800"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    💾 Подтвердить и создать обратку
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="w-full text-xs text-gray-500 py-2 text-center cursor-pointer"
                  >
                    Назад к выбору
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
