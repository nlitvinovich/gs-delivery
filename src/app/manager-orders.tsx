'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ManagerOrders({ couriers, onCreated }: { couriers: any[], onCreated: () => void }) {
  const [type, setType] = useState('city_delivery');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  
  // Массив для хранения нескольких товаров (по умолчанию пустая строка)
  const [itemsList, setItemsList] = useState<string[]>(['']);
  
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('BYN');
  const [usdRate, setUsdRate] = useState('3.30');
  const [comment, setComment] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [loading, setLoading] = useState(false);

  // Добавление новой строки товара
  const handleAddItemField = () => {
    setItemsList([...itemsList, '']);
  };

  // Изменение конкретного товара по индексу
  const handleItemChange = (index: number, value: string) => {
    const updatedList = [...itemsList];
    updatedList[index] = value;
    setItemsList(updatedList);
  };

  // Удаление строки товара
  const handleRemoveItemField = (index: number) => {
    if (itemsList.length > 1) {
      const updatedList = itemsList.filter((_, i) => i !== index);
      setItemsList(updatedList);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Фильтруем пустые строки и соединяем товары через запятую
    const finalItemsText = itemsList
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .join(', ');

    if (!finalItemsText) {
      alert('Добавьте хотя бы один товар');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('orders').insert([{
      type, address, delivery_time: time, phone, items: finalItemsText,
      price: parseFloat(price), currency, usd_rate: parseFloat(usdRate),
      comment, status: 'new', courier_id: selectedCourier || null
    }]);
    
    setLoading(false);
    if (error) alert('Ошибка: ' + error.message);
    else {
      alert('Заказ создан!');
      setAddress(''); setTime(''); setPhone(''); setItemsList(['']); setPrice(''); setComment(''); setSelectedCourier('');
      onCreated();
    }
  };
  return (
    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* ДИНАМИЧЕСКИЙ СПИСОК ТОВАРОВ */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 mb-1">Наименование товаров</label>
          {itemsList.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                required
                placeholder={`Товар №${index + 1}`}
                className="flex-1 p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800"
              />
              {itemsList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItemField(index)}
                  className="p-3 text-red-500 bg-red-50 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddItemField}
            className="mt-1 inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl active:scale-95 transition-all"
          >
            + Добавить товар
          </button>
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
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
          {loading ? 'Создание...' : 'Создать заказ'}
        </button>
      </form>
    </div>
  );
}
