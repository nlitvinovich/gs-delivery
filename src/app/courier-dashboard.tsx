'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CourierDashboard({ username }: { username: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [showMinibusModal, setShowMinibusModal] = useState(false);
  const [activeOrderForModal, setActiveOrderForModal] = useState<any | null>(null);
  const [returnAddress, setReturnAddress] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T'));
  const [returnCourier, setReturnCourier] = useState(username);
  const [returnComment, setReturnComment] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const cleanUsername = username.trim().toLowerCase();

  const fetchData = async () => {
    if (!cleanUsername) return;
    const { data: o } = await supabase.from('orders').select('*').eq('courier_id', cleanUsername).order('created_at', { ascending: false });
    if (o) setOrders(o);
    const { data: c } = await supabase.from('app_users').select('username, full_name').eq('role', 'courier').order('id', { ascending: true });
    if (c) setCouriers(c);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => { fetchData(); }, 3000);
    return () => clearInterval(interval);
  }, [cleanUsername]);

  const handleStatusChange = async (order: any, newStatus: string) => {
    if (newStatus === 'delivered' && order.type === 'minibus_send') {
      setActiveOrderForModal(order); setReturnAddress(order.address || ''); setReturnTime(order.delivery_time || '');
      setReturnDate(new Date().toISOString().split('T')); setReturnCourier(cleanUsername); setReturnComment('');
      setIsFormOpen(false); setShowMinibusModal(true);
    } else {
      await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      fetchData();
    }
  };

  const handleCreateReturnOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderForModal) return;
    await supabase.from('orders').insert([{
      type: 'minibus_pickup', address: returnAddress, delivery_time: returnTime,
      phone: activeOrderForModal.phone, items: `${activeOrderForModal.items} (Обратка)`,
      price: activeOrderForModal.price, currency: 'MULTI',
      comment: returnComment ? `Внесено курьером: ${returnComment}` : `Обратка к заказу №${activeOrderForModal.id}`,
      status: 'new', courier_id: returnCourier || null, created_at: `${returnDate}T12:00:00.000Z`
    }]);
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', activeOrderForModal.id);
    setShowMinibusModal(false); setActiveOrderForModal(null); setIsFormOpen(false); fetchData();
    alert('Обратный заказ создан!');
  };

  // Вытаскиваем только активные заказы курьера для распределения по 4 приоритетным группам
  const active = orders.filter(o => o.status === 'new' || o.status === 'in_transit');

  // 1. Заборы маршруток
  const minibusPickups = active.filter(o => o.type === 'minibus_pickup');
  
  // 2. Активные задачи (По городу, Самовывоз, Отправка маршрутки)
  const mainActiveTasks = active.filter(o => o.type === 'city_delivery' || o.type === 'pickup' || o.type === 'minibus_send');
  
  // 3. Поручения
  const errands = active.filter(o => o.type === 'errand');
  
  // 4. Курьерская доставка
  const courierDeliveries = active.filter(o => o.type === 'courier_service');

  // 5. Завершенные и отказы (Архив)
  const inactiveOrders = orders.filter(o => o.status === 'delivered' || o.status === 'canceled');

  const getTypeName = (t: string) => {
    const names: Record<string, string> = { city_delivery: '🏙️ Город', minibus_send: '🚌 Маршр.', courier_service: '📦 Служба', pickup: '🏪 Самовыв.', minibus_pickup: '📥 Забор', errand: '🏃 Поруч.' };
    return names[t] || t;
  };
