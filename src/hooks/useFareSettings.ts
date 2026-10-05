import { useEffect, useState } from 'react';
import { FareSettings } from '../types';
import { getFareSettings } from '../api/admin';
import { DEFAULT_FARE_SETTINGS } from '../utils/constants';

export function useFareSettings() {
  const [settings, setSettings] = useState<FareSettings>({
    id: 1,
    base_fare: DEFAULT_FARE_SETTINGS.base_fare,
    base_distance_km: DEFAULT_FARE_SETTINGS.base_distance_km,
    rate_per_km: DEFAULT_FARE_SETTINGS.rate_per_km,
    rate_per_extra_passenger: DEFAULT_FARE_SETTINGS.rate_per_extra_passenger,
    match_radius_km: DEFAULT_FARE_SETTINGS.match_radius_km,
    request_timeout_seconds: DEFAULT_FARE_SETTINGS.request_timeout_seconds,
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getFareSettings();
        if (data) setSettings(data);
      } catch {
        // fallback to default constants
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { settings, loading };
}
