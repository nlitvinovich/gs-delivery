'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerDashboard() {
  // Три вкладки: orders (создание), couriers (курьеры), all_orders (журнал)
  const [activeTab, setActiveTab] = useState<'orders' | 'couriers' | 'all_orders'>('orders');

  // Состояния для формы ЗАКАЗА
  const [type, setType] = useState('city_delivery');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('BYN');
  const [usdRate, setUsdRate] = useState('3.30');
  const [comment, setComment] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Состояния для вкладки КУРЬЕРОВ
  const [couriers, setCouriers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [loadingCourier, setLoadingCourier] = useState(false);

  // Состояния для вкладки ВСЕХ ЗАКАЗОВ (Новое!)
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Формат YYYY-MM-DD
  });

  const fetchCouriers = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('role', 'courier')
      .order('id', { ascending: true });
    if (data) setCouriers(data);
  };

  // Загрузка всех заказов на выбранную дату
  const fetchAllOrders = async () => {
    const startOfDay = `${selectedDate}T00:00:00.000Z`;
    const endOfDay = `${selectedDate}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (!error && data) setAllOrders(data);
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  // Автоматически обновляем список заказов при смене даты или переходе на вкладку
  useEffect(() => {
    if (activeTab === 'all_orders') {
      fetchAllOrders();
    }
  }, [selectedDate, activeTab]);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingOrder(true);
    const { error } = await supabase.from('orders').insert([{
      type, address, delivery_time: time, phone, items,
      price: parseFloat(price), currency, usd_rate: parseFloat(usdRate),
      comment, status: 'new', courier_id: selectedCourier || null
    }]);
    setLoadingOrder(false);
    if (error) { alert('Ошибка: ' + error.message); } 
    else {
      alert('Заказ создан!');
      setAddress(''); setTime(''); setPhone(''); setItems(''); setPrice(''); setComment(''); setSelectedCourier('');
      fetchAllOrders();
    }
  };

  const handleCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCourier(true);
    const { error } = await supabase.from('app_users').insert([{
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim(),
      full_name: newFullName.trim(),
      role: 'courier'
    }]);
    setLoadingCourier(false);
    if (error) { alert('Логин уже занят'); } 
    else {
      alert('Курьер добавлен!');
      setNewUsername(''); setNewPassword(''); setNewFullName('');
      fetchCouriers();
    }
  };

  const handleDeleteCourier = async (username: string, fullName: string) => {
    if (window.confirm(`Удалить курьера ${fullName}?`)) {
      await supabase.from('app_users').delete().eq('username', username);
      fetchCouriers();
    }
  };

  const getTypeName = (t: string) => {
    const names: Record<string, string> = {
      city_delivery: '🏙️ По городу', minibus_send: '🚌 Маршрутка (отпр)',
      courier_service: '📦 Курьерская сл.', pickup: '🏪 Самовывоз',
      minibus_pickup: '📥 Маршрутка (забор)', errand: '🏃 Поручение'
    };
    return names[t] || t;
  };
  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Переключатель трех вкладок */}
      <div className="flex bg-gray-200 p-1 rounded-2xl overflow-x-auto">
        <button type="button" onClick={() => setActiveTab('orders')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-2 ${activeTab === 'orders' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
          📝 Новый заказ
        </button>
        <button type="button" onClick={() => setActiveTab('all_orders')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-2 ${activeTab === 'all_orders' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
          📋 Все заказы
        </button>
        <button type="button" onClick={() => setActiveTab('couriers')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-2 ${activeTab === 'couriers' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
          👥 Курьеры
        </button>
      </div>

      {/* ВКЛАДКА 1: СОЗДАНИЕ ЗАКАЗА */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Тип заказа</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800">
                <option value="city_delivery">Доставка по городу</option>
                <option value="minibus_send">Отправка маршруткой</option>
                <option value="courier_service">Доставка курьерской службой</option>
                <option value="pickup">Самовывоз</option>
                <option value="minibus_pickup">Забор маршрутки</option>
                <option value="errand">Поручение</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Назначить курьера</label>
              <select value={selectedCourier} onChange={(e) => setSelectedCourier(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800">
                <option value="">-- Общий пул --</option>
                {couriers.map((c) => <option key={c.username} value={c.username}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Адрес</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Время</label>
                <input type="text" value={time} onChange={(e) => setTime(e.target.value)} placeholder="до 18:00" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Телефон</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+375..." className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Товары</label>
              <textarea value={items} onChange={(e) => setItems(e.target.value)} required rows={2} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Цена</label>
                <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Валюта</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800">
                  <option value="BYN">BYN</option><option value="USD">USD</option><option value="RUB">RUB</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Курс $</label>
                <input type="number" step="0.0001" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Комментарий</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
            </div>
            <button type="submit" disabled={loadingOrder} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50">
              {loadingOrder ? 'Создание...' : 'Создать заказ'}
            </button>
          </form>
        </div>
      )}

      {/* ВКЛАДКА 2: ЖУРНАЛ ВСЕХ ЗАКАЗОВ НА ДАТУ */}
      {activeTab === 'all_orders' && (
        <div className="space-y-4">
          {/* Выбор даты */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Просмотр на дату:</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 bg-gray-50 rounded-xl text-sm font-semibold border-0 text-gray-800 focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Список заказов */}
          <div className="space-y-3">
            {allOrders.length === 0 ? (
              <p className="text-gray-400 text-center py-8 bg-white rounded-3xl border border-dashed">На эту дату заказов не найдено</p>
            ) : (
              allOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">{getTypeName(order.type)}</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${order.status === 'new' ? 'bg-blue-50 text-blue-600' : order.status === 'in_transit' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {order.status === 'new' ? 'Новый' : order.status === 'in_transit' ? 'В пути' : 'Доставлен'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{order.address}</p>
                  <p className="text-xs text-gray-500">🛍️ {order.items}</p>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-50 text-gray-400">
                    <span>Курьер: <strong className="text-gray-700">{order.courier_id || 'Не назначен'}</strong></span>
                    <span className="font-black text-gray-800 text-sm">{order.price} {order.currency}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ВКЛАДКА 3: КУРЬЕРЫ */}
      {activeTab === 'couriers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-3">Регистрация курьера</h3>
            <form onSubmit={handleCourierSubmit} className="space-y-3">
              <input type="text" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required placeholder="ФИО курьера" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required placeholder="Логин (en)" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Пароль" className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
              <button type="submit" disabled={loadingCourier} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold text-sm disabled:opacity-50">Добавить курьера</button>
            </form>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
            <div className="divide-y divide-gray-100">
              {couriers.map((courier) => (
                <div key={courier.id} className="flex justify-between items-center py-2 text-sm">
                  <div>
                    <p className="font-bold text-gray-800">{courier.full_name}</p>
                    <p className="text-xs text-gray-400">Логин: {courier.username} | Пасс: {courier.password}</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteCourier(courier.username, courier.full_name)} className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-xl font-bold">Удалить</button>
                </div>
              ))}
)}

);
}
