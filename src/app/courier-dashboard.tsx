'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CourierDashboardProps {
  username: string;
}

export default function CourierDashboard({ username }: CourierDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  // Состояния для всплывающего окна маршрутки
  const [showMinibusModal, setShowMinibusModal] = useState(false);
  const [activeOrderForModal, setActiveOrderForModal] = useState<any | null>(null);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('courier_id', username)
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
    return () => { supabase.removeChannel(channel); };
  }, [username]);

  // Главная функция клика по кнопке статуса
  const handleStatusButtonClick = async (order: any) => {
    if (order.status === 'new') {
      // Из "Новый" переводим в "В пути"
      await supabase.from('orders').update({ status: 'in_transit' }).eq('id', order.id);
      fetchOrders();
    } else if (order.status === 'in_transit') {
      // Если это отправка маршруткой — прерываемся и открываем выбор обратки
      if (order.type === 'minibus_send') {
        setActiveOrderForModal(order);
        setShowMinibusModal(true);
      } else {
        // Для всех остальных типов заказов сразу переводим в доставлен
        await finishOrderDelivery(order.id);
      }
    }
  };

  // Обычное завершение заказа (без обратки)
  const finishOrderDelivery = async (id: number) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id);
    setShowMinibusModal(false);
    setActiveOrderForModal(null);
    fetchOrders();
  };

  // Создание обратного рейса (забор маршрутки)
  const handleCreateReturnOrder = async () => {
    if (!activeOrderForModal) return;

    // 1. Создаем зеркальный заказ на забор маршрутки
    const { error } = await supabase.from('orders').insert([
      {
        type: 'minibus_pickup', // Тип строго "Забор маршрутки"
        address: activeOrderForModal.address,
        delivery_time: activeOrderForModal.delivery_time,
        phone: activeOrderForModal.phone,
        items: `${activeOrderForModal.items} (Обратка)`,
        price: activeOrderForModal.price,
        currency: activeOrderForModal.currency,
        usd_rate: activeOrderForModal.usd_rate,
        comment: `Создано автоматически как обратка к заказу №${activeOrderForModal.id}`,
        status: 'new',
        courier_id: username // Сразу закрепляем за этим же курьером
      }
    ]);

    if (error) {
      alert('Ошибка при создании обратки: ' + error.message);
    } else {
      // 2. Закрываем исходный заказ
      await finishOrderDelivery(activeOrderForModal.id);
      alert('Обратный заказ успешно создан и добавлен в ваш список!');
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

      {/* ШТОРКА ВЫБОРА ОБРАТКИ ДЛЯ МАРШРУТКИ */}
      {showMinibusModal && activeOrderForModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-6 space-y-4 shadow-xl text-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Завершение маршрутки</h3>
              <p className="text-xs text-gray-400 mt-1">Требуется ли оформить обратный забор?</p>
            </div>
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCreateReturnOrder}
                className="w-full bg-indigo-600 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                🔄 С обраткой (создать забор)
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
                className="w-full text-xs text-gray-400 py-2 active:scale-95 transition-all cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
