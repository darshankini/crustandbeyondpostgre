import { useList } from '../../shared/hooks';
import { listInventory } from '../services/inventoryService';

export const useInventory = () => useList(listInventory);
