import { FareEstimateResult, FareSettings } from '../types';
import { calculateDistanceKm } from './distance';
import { DEFAULT_FARE_SETTINGS } from './constants';

export function calculateFareEstimateClient(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  passengerCount: number = 1,
  settings?: Partial<FareSettings>
): FareEstimateResult {
  const config = {
    base_fare: settings?.base_fare ?? DEFAULT_FARE_SETTINGS.base_fare,
    base_distance_km: settings?.base_distance_km ?? DEFAULT_FARE_SETTINGS.base_distance_km,
    rate_per_km: settings?.rate_per_km ?? DEFAULT_FARE_SETTINGS.rate_per_km,
    rate_per_extra_passenger:
      settings?.rate_per_extra_passenger ?? DEFAULT_FARE_SETTINGS.rate_per_extra_passenger,
  };

  const distanceKm = calculateDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const extraKm = Math.max(0, distanceKm - config.base_distance_km);

  const singleBaseFare = config.base_fare;
  const singleDistanceFare = Math.round(extraKm * config.rate_per_km * 100) / 100;
  const singlePassengerFare = singleBaseFare + singleDistanceFare;

  // Multiply entire fare per passenger
  const totalFare = Math.round(singlePassengerFare * passengerCount * 100) / 100;

  return {
    distance_km: distanceKm,
    base_fare: singleBaseFare,
    distance_fare: singleDistanceFare,
    extra_passenger_fare: 0,
    total_fare: totalFare,
    passenger_count: passengerCount,
  };
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}
