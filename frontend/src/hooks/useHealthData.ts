import { useState, useEffect } from 'react';
import { 
  getHRLast7, 
  getHRIntraday, 
  getStepsLast7, 
  getCaloriesLast7, 
  getSleepDebug,
  HRDataPoint,
  HRIntradaySample,
  StepsDataPoint,
  CaloriesDataPoint,
  SleepStageData
} from '../lib/api';
import { processSleepData, calculateKPIs, calculateReadiness, prepareChartData } from '../lib/transform';

export function useHealthData() {
  const [hr7, setHr7] = useState<HRDataPoint[]>([]);
  const [hrIntra, setHrIntra] = useState<HRIntradaySample[]>([]);
  const [steps7, setSteps7] = useState<StepsDataPoint[]>([]);
  const [cal7, setCal7] = useState<CaloriesDataPoint[]>([]);
  const [sleepRows, setSleepRows] = useState<SleepStageData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [hr7Res, hrIntraRes, stepsRes, calRes, sleepRes] = await Promise.all([
        getHRLast7(),
        getHRIntraday(),
        getStepsLast7(),
        getCaloriesLast7(),
        getSleepDebug()
      ]);

      setHr7(hr7Res.data || []);
      setHrIntra(hrIntraRes.samples || []);
      setSteps7(stepsRes.data || []);
      setCal7(calRes.data || []);
      setSleepRows(sleepRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
      console.error('Failed to fetch health data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process the data
  const sleepData = processSleepData(sleepRows);
  const kpis = calculateKPIs(sleepData, hr7, steps7, cal7);
  const readiness = calculateReadiness(sleepData, hr7, steps7);
  const chartData = prepareChartData(hr7, steps7, cal7, hrIntra);

  return {
    // Raw data
    hr7,
    hrIntra,
    steps7,
    cal7,
    sleepRows,
    
    // Processed data
    sleepData,
    kpis,
    readiness,
    chartData,
    
    // State
    loading,
    error,
    refetch: fetchData
  };
}

