'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerDashboard() {
  const [type, setType] = useState('city_delivery');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('BYN');
  const [usdRate, setUsdRate] = useState('3.30');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('orders').insert([
      {
        type,
        address,
        delivery_time: time,
        phone,
        items,
        price: parseFloat(price),
        currency,
        usd_rate: parseFloat(usdRate),
        comment,
        status: 'new'
      }
    ]);

    setLoading(false);
    if (error) {
      alert('Ошибка добавления: ' + error.message);
    } else {
      alert('Заказ успешно создан!');
      setAddress(''); setTime(''); setPhone(''); setItems(''); setPrice(''); setComment('');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl p-6 shadow-md border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Новый заказ</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Тип заказа</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500">
            <option value="city_delivery">Доставка по городу</option>
            <option value="minibus_send">Отправка маршруткой</option>
            <option value="courier_service">Доставка курьерской службой</option>
            <option value="pickup">Самовывоз</option>
            <option value="minibus_pickup">Забор маршрутки</option>
            <option value="errand">Поручение</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Адрес</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Время</label>
            <input type="text" value={time} onChange={(e) => setTime(e.target.value)} placeholder="до 18:00" className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Телефон</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+375..." className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Наименование товаров</label>
          <textarea value={items} onChange={(e) => setItems(e.target.value)} required rows={2} className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Цена</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Валюта</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800">
              <option value="BYN">BYN</option>
              <option value="USD">USD</option>
              <option value="RUB">RUB</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Курс $</label>
            <input type="number" step="0.0001" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Комментарий</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full p-3 bg-gray-50 rounded-xl border-0 text-sm text-gray-800" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-md active:scale-95 transition-transform disabled:opacity-50">
          {loading ? 'Создание...' : 'Создать заказ'}
        </button>
      </form>
    </div>
  );
}
