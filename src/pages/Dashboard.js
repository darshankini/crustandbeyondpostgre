import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { money } from '../components/Layout';
import ProductsAdmin from './dashboard/ProductsAdmin';
import CategoriesAdmin from './dashboard/CategoriesAdmin';
import OrderAdmin from './dashboard/OrderAdmin';
import OrderPreview from './dashboard/OrderPreview';
import CustomersAdmin from './dashboard/CustomersAdmin';
import MonthlySalesChart from '../components/MonthlySalesChart';


function PeriodCard({ label, p }) {
  const row = (name, value) => (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{name}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{p ? money(p.sales) : '…'}</div>
      <div className="mt-3 space-y-1 border-t pt-3">
        {row('Orders', p ? p.orders : '…')}
        {row('Cash', p ? money(p.cash) : '…')}
        {row('Online', p ? money(p.online) : '…')}
        {row('Avg / order', p ? money(p.orders ? p.sales / p.orders : 0) : '…')}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [isPreview,setIsPreview] = useState(null);
  const [orderDetails,setOrderDetails] = useState(null);

  const loadStats = useCallback(() => {
    api.get('/dashboard').then(setStats).catch((e) => console.error(e));
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  const onClose = () => {
    setIsPreview(false);
  }

  const isOrderPreview = async (id) => {
  
    try{
      const orderDetails = await api.get(`/orders/getOrderDetails/${id}`);
      setOrderDetails(orderDetails);
      setIsPreview(true);
    }catch(error){
      console.error('error',error);
    }
  }

  // Returns true when the order was deleted, so OrderAdmin can reload its list.
  const deleteOrder = async (id) => {
    if (!window.confirm(`Delete order #${id}? Its items and payment are removed too. This cannot be undone.`)) return false;
    try{
      await api.del(`/orders/${id}?force=1`);
      toast.success(`Order #${id} deleted`);
      loadStats();
      return true;
    }catch(error){
      toast.error(`Could not delete order #${id}: ${error.message}`);
      return false;
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-100 p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      {/* Sales by period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PeriodCard label="Today" p={stats?.periods?.today} />
        <PeriodCard label="This week (Mon–today)" p={stats?.periods?.week} />
        <PeriodCard label="This month" p={stats?.periods?.month} />
      </div>
      {stats?.monthly && <MonthlySalesChart data={stats.monthly} />}

      {/* CRUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          <OrderAdmin
          isOrderPreview={isOrderPreview}
          deleteOrder={deleteOrder}/>
        </div>
        <div>
          <CategoriesAdmin />
        </div>
        <div className="lg:col-span-2">
          <ProductsAdmin />
        </div>
        <div>
          <CustomersAdmin />
        </div>
      </div>

      {isPreview && (
        <OrderPreview
        orderDetails={orderDetails}
        onClose={onClose}/>
      )}
    </div>
  );
}
