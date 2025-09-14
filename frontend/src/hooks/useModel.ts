import { useState, useEffect } from 'react';
import { getModel, ModelStatus } from '../lib/api';

export function useModel() {
  const [model, setModel] = useState<ModelStatus['ollama']>({
    reachable: false,
    configured: false,
    model: '',
    available: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getModel();
        setModel(response.ollama);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch model status');
        console.error('Failed to fetch model status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, []);

  return { model, loading, error };
}

