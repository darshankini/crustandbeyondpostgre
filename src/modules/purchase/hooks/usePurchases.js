import { useList } from '../../shared/hooks';
import { listPurchases } from '../services/purchaseService';

export const usePurchases = () => useList(listPurchases);
