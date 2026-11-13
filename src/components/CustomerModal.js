import { useEffect, useRef, useState,useMemo } from 'react';
import { money } from './Layout';
import { debounce } from '../utils/debounce';
import { api } from '../api';

// Post-checkout dialog. The order is already saved; this only collects optional
// customer details. "Skip & Print" prints without details; "Save & Print" saves
// the details first; "Save Bill" saves them without printing.
// Responsive: centered card on desktop, bottom sheet on mobile.
export default function CustomerModal({ order, total, onSkip, onSubmit, onClose, saving }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMode,setPaymentMode] = useState('');
  const [cash,setCash] = useState('');
  const [online,setOnline] = useState('');
  const [error, setError] = useState('');
  const [loading,setLoading] = useState(false);
  const [suggestions,setSuggestions] = useState([]);

  const paymentModes = ['Cash','Online','Split'];

  const abortController = useRef(null);
  
  const searchCustomers = async (value) => {
    
    abortController.current?.abort();
    
    if(value.length < 3){
      setSuggestions([]);
      setLoading(false);
      return;
    }
    
    const controller = new AbortController();
    abortController.current = controller;

    try{
      setLoading(true);
      const data = await api.get(`/customers/search?mobile=${encodeURIComponent(value)}`,{signal: controller.signal});
      console.log(data);
      setSuggestions(data.flat());

    }catch(error){
      if(error.name != "AbortError"){
        console.error(error);
        setSuggestions([]);
      }
    }finally{
      if(abortController.current === controller){
        setLoading(false);
      }
    }
  }

  const debounceSearch = useMemo(() => debounce(searchCustomers,300),[]);
  
  useEffect(() => {
    
    if(mobile.length < 3){
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceSearch(mobile);
    
    return () => {
      debounceSearch.cancel();
      abortController.current?.abort();
    };
  },[mobile,debounceSearch]);


  const handleSelectCustomer = (customer) => {
    setMobile(customer.customer_mobile);
    setName(customer.customer_name);
    setEmail(customer.customer_email);

    setSuggestions([]);
  };

  // print: false for "Save Bill" (save only), true for "Save & Print" / Enter.
  const submit = (e, print = true) => {
    e.preventDefault();
    const digits = mobile.replace(/\D/g, '');
    if (digits && digits.length !== 10) return setError('Mobile must be 10 digits.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email.');
    setError('');
    onSubmit({ name: name.trim(), mobile: digits, email: email.trim(),cash:cash,online:online,order:order,total:total }, print);
  };

  const field =
    'mt-1 w-full rounded-md border px-3 py-2 outline-none focus:border-brand text-base';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <form
        onSubmit={submit}
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Customer details</h2>
            <p className="text-sm text-gray-500">
              Order #{order?.id} · {money(total)} — optional, you can skip.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            title="Close and go back to the cart"
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</div>
        )}

        <label className="block">
          <span className="text-sm text-gray-600">Mobile</span>
          <input
            value={mobile}
            onChange={(e) => {
                const value = e.target.value.replace(/\D/g,'').slice(0,10);
                setMobile(value)}
            }
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit number"
            className={field}
            autoFocus
          />
        </label>

        {loading && <p>Searching ...</p>}
        
        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded shadow">
            {suggestions.map((customer) => (
              <li
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="p-2 cursor-pointer hover:bg-gray-100"
              >
                <div>{customer.customer_mobile}</div>
              </li>
            ))}
          </ul>
        )}

        <label className="block">
          <span className="text-sm text-gray-600">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="string"
            placeholder="crustandbeyond@gmail.com"
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Payment Mode</span>
          <select onChange={(e) => setPaymentMode(e.target.value)} className={field} value={paymentMode}>
            <option value="">Please Select Payment Mode</option>
            {paymentModes.map((pm) => (
              <option value={pm} key={pm}>{pm}</option>
            ))}
          </select>
        </label>

        {paymentMode && (paymentMode.toLowerCase() === 'cash' || paymentMode.toLowerCase() === 'split') && (<label className="block">
          <span className="text-sm text-gray-600">Cash</span>
          <input
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            type="number"
            placeholder=""
            className={field}
          />
        </label>)}

        {paymentMode && (paymentMode.toLowerCase() === 'online' || paymentMode.toLowerCase() === 'split') && (<label className="block">
          <span className="text-sm text-gray-600">Online</span>
          <input
            value={online}
            onChange={(e) => setOnline(e.target.value)}
            type="number"
            inputMode="number"
            placeholder=""
            className={field}
          />
        </label>)}
        

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSkip({ cash, online, total })}
            disabled={saving}
            className="py-2.5 rounded-md bg-gray-200 hover:bg-gray-300 font-medium disabled:opacity-40"
          >
            Skip &amp; Print
          </button>
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 rounded-md bg-brand hover:bg-brand-dark text-white font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save & Print'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 pt-1">
        <button
            type="button"
            disabled={saving}
            onClick={(e) => submit(e, false)}
            className="py-2.5 rounded-md bg-brand hover:bg-brand-dark text-white font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Bill'}
          </button>
          </div>
      </form>
    </div>
  );
}
