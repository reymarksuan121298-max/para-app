import { useEffect, useState } from 'react';
import { Ride } from '../types';
import { getRideDetails, subscribeToRideChanges } from '../api/rides';
import { useRideStore } from '../store/rideStore';

export function useRealtimeRide(rideId?: string | null) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const setActiveRide = useRideStore((s) => s.setActiveRide);

  useEffect(() => {
    if (!rideId) {
      setRide(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function initialFetch() {
      try {
        setLoading(true);
        const data = await getRideDetails(rideId!);
        if (isMounted) {
          setRide(data);
          setActiveRide(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    initialFetch();

    // Subscribe to live Postgres changes on this ride
    const channel = subscribeToRideChanges(rideId, (updatedRide) => {
      if (isMounted) {
        setRide(updatedRide);
        setActiveRide(updatedRide);
      }
    });

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [rideId, setActiveRide]);

  return { ride, loading, error };
}
