import { useList } from '../../shared/hooks';
import { listRawProducts } from '../services/rawProductService';

// Raw products with their current stock (product_qty / product_unit, null if never stocked).
export const useRawProducts = () => useList(listRawProducts);
