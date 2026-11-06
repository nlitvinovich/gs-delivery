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
  
  // У каждого товара теперь своя валюта (по умолчанию BYN)
  const [itemsList, setItemsList] = useState<OrderItem[]>([{ name: '', price: '', currency: 'BYN' }]);
  
  const [finalCurrency, setFinalCurrency] = useState('BYN'); // Валюта итога заказа
  const [totalPrice, setTotalPrice] = useState(0);
  const [usdRate, setUsdRate] = useState('3.30'); // Курс $ к BYN
  const [rubRate, setRubRate] = useState('3.45'); // Курс 100 RUB к BYN
  const [comment, setComment] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [loading, setLoading] = useState(false);

  // Функция перевода любой суммы в BYN (базовую валюту для расчетов)
  const convertToByn = (amount: number, fromCurrency: string) => {
    const usd = parseFloat(usdRate) || 3.3;
    const rub = (parseFloat(rubRate) || 3.45) / 100; // курс за 1 рубль

    if (fromCurrency === 'BYN') return amount;
    if (fromCurrency === 'USD') return amount * usd;
    if (fromCurrency === 'RUB') return amount * rub;
    return amount;
  };

  // Функция перевода из BYN в целевую валюту итога
  const convertFromByn = (amountInByn: number, toCurrency: string) => {
    const usd = parseFloat(usdRate) || 3.3;
    const rub = (parseFloat(rubRate) || 3.45) / 100;

    if (toCurrency === 'BYN') return amountInByn;
    if (toCurrency === 'USD') return amountInByn / usd;
    if (toCurrency === 'RUB') return amountInByn / rub;
    return amountInByn;
  };

  // Динамический пересчет общего итога
  useEffect(() => {
    let totalInByn = 0;

    itemsList.forEach((item) => {
      const itemPrice = parseFloat(item.price);
      if (!isNaN(itemPrice)) {
        totalInByn += convertToByn(itemPrice, item.currency);
      }
    });

    const finalSum = convertFromByn(totalInByn, finalCurrency);
    setTotalPrice(isNaN(finalSum) ? 0 : finalSum);
  }, [itemsList, finalCurrency, usdRate, rubRate]);

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

    // Текст для курьера: "Товар 1 (100 USD), Товар 2 (50 RUB)"
    const finalItemsText = itemsList
      .filter(item => item.name.trim().length > 0)
      .map(item => `${item.name.trim()} (${item.price || 0} ${item.currency})`)
      .join(', ');

    if (!finalItemsText) {
      alert('Добавьте товар');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('orders').insert([{
      type, address, delivery_time: time, phone, items: finalItemsText,
      price: parseFloat(totalPrice.toFixed(2)), currency: finalCurrency, 
      usd_rate: parseFloat(usdRate), comment, status: 'new', courier_id: selectedCourier || null
    }]);
    
    setLoading(false);
    if (error) alert('Ошибка: ' + error.message);
    else {
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
          <label className="block text-xs font-bold text-gray-500 mb-1">Наименование товаров, цены и валюта закупа</label>
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

        {/* БЛОК КУРСОВ И ИТОГОВОГО РАСЧЕТА */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Курс $ (к BYN)</label>
              <input type="number" step="0.01" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} className="w-full p-2 bg-white rounded-xl text-xs border border-gray-100 text-gray-800 font-semibold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Курс 100 RUB (к BYN)</label>
              <input type="number" step="0.01" value={rubRate} onChange={(e) => setRubRate(e.target.value)} className="w-full p-2 bg-white rounded-xl text-xs border border-gray-100 text-gray-800 font-semibold" />
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500">Валюта расчета (Итог):</span>
              <select value={finalCurrency} onChange={(e) => setFinalCurrency(e.target.value)} className="mt-1 p-1.5 bg-white rounded-lg text-xs font-bold border border-gray-100 text-gray-800 shadow-xs">
                <option value="BYN">BYN</option>
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Итого к оплате</span>
              <span className="text-lg font-black text-slate-900 bg-white px-3 py-1 rounded-xl shadow-xs border border-slate-100 inline-block mt-0.5">
                {totalPrice.toFixed(2)} {finalCurrency}
              </span>
            </div>
          </div>
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
