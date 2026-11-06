'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface OrderItem {
  name: string;
  price: string;
  currency: string;
}

export default function ManagerOrders({ couriers, onCreated }: { couriers: any[], onCreated: () => void }) {
  const [type, setType] = useState('city_delivery');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  
  // Массив товаров: у каждого свое название, цена и валюта
  const [itemsList, setItemsList] = useState<OrderItem[]>([{ name: '', price: '', currency: 'BYN' }]);
  
  // Строка с итоговым перечислением сумм (например: "150.00 USD + 20.00 BYN")
  const [totalPriceString, setTotalPriceString] = useState('0.00 BYN');
  const [comment, setComment] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [loading, setLoading] = useState(false);

  // Считаем итог: группируем одинаковые валюты и складываем их суммы
  useEffect(() => {
    const totals: Record<string, number> = {};

    itemsList.forEach((item) => {
      const itemPrice = parseFloat(item.price);
      if (!isNaN(itemPrice) && itemPrice > 0) {
        totals[item.currency] = (totals[item.currency] || 0) + itemPrice;
      }
    });

    // Собираем массив строк вида "100.00 USD"
    const parts = Object.entries(totals).map(
      ([curr, sum]) => `${sum.toFixed(2)} ${curr}`
    );

    // Соединяем их через плюс, либо пишем 0.00 BYN, если всё пусто
    setTotalPriceString(parts.length > 0 ? parts.join(' + ') : '0.00 BYN');
  }, [itemsList]);

  const handleAddItemField = () => {
    setItemsList([...itemsList, { name: '', price: '', currency: 'BYN' }]);
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

    // Текст для карточки курьера: "Товар 1 (100 USD), Товар 2 (50 RUB)"
    const finalItemsText = itemsList
      .filter(item => item.name.trim().length > 0)
      .map(item => `${item.name.trim()} (${item.price || 0} ${item.currency})`)
      .join(', ');

    if (!finalItemsText) {
      alert('Добавьте хотя бы один товар');
      setLoading(false);
      return;
    }

    // Сохраняем итоговую строку валют в текстовое поле цены.
    // Примечание: Убедитесь, что в Supabase тип колонки price изменен на TEXT, если ранее стоял NUMERIC.
    const { error } = await supabase.from('orders').insert([{
      type, address, delivery_time: time, phone, items: finalItemsText,
      price: totalPriceString, // Записываем строку "150 USD + 50 RUB"
      currency: 'MULTI', // Сигнальное значение мультивалютности
      comment, status: 'new', courier_id: selectedCourier || null
    }]);
    
    setLoading(false);
    if (error) {
      alert('Ошибка: ' + error.message + '. Если ошибка в типе price, измените его в Supabase на TEXT.');
    } else {
      alert('Заказ создан!');
      setAddress(''); setTime(''); setPhone(''); setItemsList([{ name: '', price: '', currency: 'BYN' }]); setComment(''); setSelectedCourier('');
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

        {/* СПИСОК ТОВАРОВ С СОБСТВЕННЫМИ ВАЛЮТАМИ */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 mb-1">Наименование товаров, цены и валюта</label>
          {itemsList.map((item, index) => (
            <div key={index} className="flex gap-1.5 items-center">
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                required
                placeholder={`Товар №${index + 1}`}
                className="flex-1 min-w-0 p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800"
              />
              <input
                type="number"
                step="0.01"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                required
                placeholder="Цена"
                className="w-18 p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800 text-center"
              />
              <select
                value={item.currency}
                onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                className="w-18 p-3 bg-gray-50 rounded-xl text-xs border-0 text-gray-800 text-center font-semibold"
              >
                <option value="BYN">BYN</option>
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
              </select>
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

        {/* ПЛАШКА ИТОГОВОГО РАЗДЕЛЬНОГО РАСЧЕТА */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-500">Итоговая сумма к оплате:</span>
          <span className="text-base font-black text-slate-900 bg-white px-3 py-2.5 rounded-xl shadow-xs border border-slate-100 block mt-1 text-center font-mono break-all">
            {totalPriceString}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Комментарий</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 text-gray-800" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer">
          {loading ? 'Создание...' : 'Создать заказ'}
        </button>
      </form>
    </div>
  );
}
