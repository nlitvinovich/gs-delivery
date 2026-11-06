'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Описываем структуру объекта товара с ценой
interface OrderItem {
  name: string;
  price: string;
}

export default function ManagerOrders({ couriers, onCreated }: { couriers: any[], onCreated: () => void }) {
  const [type, setType] = useState('city_delivery');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  
  // Массив товаров теперь хранит объекты { name, price }
  const [itemsList, setItemsList] = useState<OrderItem[]>([{ name: '', price: '' }]);
  
  const [totalPrice, setTotalPrice] = useState(0); // Автоматическая общая сумма
  const [currency, setCurrency] = useState('BYN');
  const [usdRate, setUsdRate] = useState('3.30');
  const [comment, setComment] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [loading, setLoading] = useState(false);

  // Пересчитываем общую сумму каждый раз, когда меняются товары или их цены
  useEffect(() => {
    const sum = itemsList.reduce((acc, item) => {
      const parsedPrice = parseFloat(item.price);
      return acc + (isNaN(parsedPrice) ? 0 : parsedPrice);
    }, 0);
    setTotalPrice(sum);
  }, [itemsList]);

  const handleAddItemField = () => {
    setItemsList([...itemsList, { name: '', price: '' }]);
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    const updatedList = [...itemsList];
    updatedList[index][field] = value;
    setItemsList(updatedList);
  };

  const handleRemoveItemField = (index: number) => {
    if (itemsList.length > 1) {
      setItemsList(itemsList.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Формируем детальный текст товаров для курьера: "Кроссовки (150 BYN), Носки (10 BYN)"
    const finalItemsText = itemsList
      .filter(item => item.name.trim().length > 0)
      .map(item => `${item.name.trim()} (${item.price || 0} ${currency})`)
      .join(', ');

    if (!finalItemsText) {
      alert('Добавьте хотя бы один товар');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('orders').insert([{
      type, address, delivery_time: time, phone, items: finalItemsText,
      price: totalPrice, currency, usd_rate: parseFloat(usdRate),
      comment, status: 'new', courier_id: selectedCourier || null
    }]);
    
    setLoading(false);
    if (error) alert('Ошибка: ' + error.message);
    else {
      alert('Заказ создан!');
      setAddress(''); setTime(''); setPhone(''); setItemsList([{ name: '', price: '' }]); setComment(''); setSelectedCourier('');
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

        {/* СПИСОК ТОВАРОВ С ОТДЕЛЬНЫМИ ЦЕНАМИ */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 mb-1">Наименование товаров и цены</label>
          {itemsList.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                required
                placeholder={`Товар №${index + 1}`}
                className="flex-2 p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800"
              />
              <input
                type="number"
                step="0.01"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                required
                placeholder="Цена"
                className="w-24 p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800 text-center"
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

        {/* БЛОК НАСТРОЕК ВАЛЮТЫ И АВТОМАТИЧЕСКИЙ РАСЧЕТ ИТОГА */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Валюта</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-sm border border-gray-100 text-gray-800 font-semibold shadow-xs">
              <option value="BYN">BYN</option>
              <option value="USD">USD</option>
              <option value="RUB">RUB</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Курс $</label>
            <input type="number" step="0.0001" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-sm border border-gray-100 text-gray-800 font-semibold shadow-xs" />
          </div>
          <div className="col-span-2 pt-2 flex justify-between items-center border-t border-slate-200/60 mt-1">
            <span className="text-sm font-bold text-slate-500">Общая сумма заказа:</span>
            <span className="text-xl font-black text-slate-900 bg-white px-3 py-1 rounded-xl shadow-xs border border-slate-100">
              {totalPrice.toFixed(2)} {currency}
            </span>
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
