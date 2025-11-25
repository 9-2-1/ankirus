import { useState, useEffect } from 'react';
import { ApiResponseItem, CardData } from '../types/card';
import { parseApiResponse } from '../utils/groupParser';

/**
 * Hook to fetch and manage card data from the API
 */
export function useCardData() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCardData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/cards/');
        if (!response.ok) {
          throw new Error(`Failed to fetch cards: ${response.status}`);
        }

        const data: ApiResponseItem[] = await response.json();
        const parsedCards = parseApiResponse(data);
        setCards(parsedCards);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCardData();
  }, []);

  return { cards, loading, error };
}
