import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerPassengerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerDriverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  license_number: z.string().min(4, 'License number is required'),
  vehicle_number: z.string().min(3, 'Vehicle / Plate number is required'),
  seat_capacity: z.coerce
    .number()
    .int()
    .min(5, 'Capacity must be at least 5')
    .max(7, 'Capacity cannot exceed 7 seats'),
});

export const bookingSchema = z.object({
  passenger_count: z.number().int().min(1).max(7),
  pickup_address: z.string().min(3, 'Pickup address is required'),
  dropoff_address: z.string().min(3, 'Destination address is required'),
});

export const fareSettingsSchema = z.object({
  base_fare: z.coerce.number().positive(),
  base_distance_km: z.coerce.number().positive(),
  rate_per_km: z.coerce.number().positive(),
  rate_per_extra_passenger: z.coerce.number().nonnegative(),
  match_radius_km: z.coerce.number().positive(),
  request_timeout_seconds: z.coerce.number().int().positive(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterPassengerFormData = z.infer<typeof registerPassengerSchema>;
export type RegisterDriverFormData = z.infer<typeof registerDriverSchema>;
export type FareSettingsFormData = z.infer<typeof fareSettingsSchema>;
