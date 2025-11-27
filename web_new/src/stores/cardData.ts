import { writable } from 'svelte/store';
import type { ApiResponseItem, CardData } from '../types/card';
import { parseApiResponse } from '../utils/groupParser';

function createCardDataStore() {
  const { subscribe, set, update } = writable<{
    cards: CardData[];
    loading: boolean;
    error: string | null;
  }>({ cards: [], loading: true, error: null });

  const fetchCardData = async (): Promise<void> => {
    try {
      update(state => ({ ...state, loading: true, error: null }));

      const response = await fetch('cards/');
      if (!response.ok) {
        throw new Error(`Failed to fetch cards: ${response.status}`);
      }

      const data: ApiResponseItem[] = await response.json();
      const parsedCards = parseApiResponse(data);
      set({ cards: parsedCards, loading: false, error: null });
    } catch (err) {
      update(state => ({
        ...state,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        loading: false,
      }));
    }
  };

  // Initialize
  fetchCardData();

  return { subscribe, refetch: fetchCardData };
}

export const cardDataStore = createCardDataStore();
