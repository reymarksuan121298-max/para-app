import { z } from 'zod';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { TRICYCLE_SEAT_LIMITS } from './constants';

/**
 * Bridges a zod schema to react-hook-form's `Resolver` contract.
 *
 * `@hookform/resolvers` is not a project dependency, so the adapter lives here
 * instead of pulling in a package for the handful of lines below.
 *
 * `TValues` is what the fields hold while editing (React Native's keyboard only
 * produces text, so numeric inputs hold strings) and `TTransformed` is what
 * `handleSubmit` receives once zod has parsed and converted it.
 *
 * Note: React Native's `TextInput` reports text through `onChangeText`, so the
 * form fields are connected via `components/common/FormInput` (Controller),
 * not by spreading `register()` onto the input.
 */
export const zodResolver =
  <TValues extends FieldValues, TTransformed = TValues>(
    schema: z.ZodType<TTransformed, z.ZodTypeDef, TValues>,
  ): Resolver<TValues, unknown, TTransformed> =>
  async (values) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    // One error per field (zod reports one issue per refinement; the first one
    // is the message the user should see).
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'root';
      if (!errors[key]) {
        errors[key] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors: errors as FieldErrors<TValues> };
  };

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerPassengerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerDriverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  license_number: z.string().min(4, 'License number is required'),
  vehicle_number: z.string().min(3, 'Vehicle / Plate number is required'),
  seat_capacity: z.coerce
    .number({ invalid_type_error: 'Select a seat capacity' })
    .int()
    .min(5, 'Capacity must be at least 5')
    .max(7, 'Capacity cannot exceed 7 seats'),
});

export const bookingSchema = z.object({
  passenger_count: z.number().int().min(1).max(7),
  pickup_address: z.string().min(3, 'Pickup address is required'),
  dropoff_address: z.string().min(3, 'Destination address is required'),
});

/**
 * Numeric form field: the keyboard only produces text, so the field holds a
 * string while editing and zod converts it to a number on submit. Anything
 * that is not a plain number is rejected before it can reach the API (the old
 * `parseFloat` calls happily sent `NaN`).
 */
const numericField = (
  label: string,
  options: { allowNegative?: boolean } = {},
) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .regex(
      options.allowNegative ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/,
      `${label} must be a number`,
    )
    .transform(Number);

export const fareSettingsSchema = z.object({
  base_fare: numericField('Base fare').refine((n) => n > 0, 'Base fare must be greater than 0'),
  base_distance_km: numericField('Base distance').refine(
    (n) => n > 0,
    'Base distance must be greater than 0',
  ),
  rate_per_km: numericField('Rate per km').refine(
    (n) => n > 0,
    'Rate per km must be greater than 0',
  ),
  rate_per_extra_passenger: numericField('Extra passenger rate').refine(
    (n) => n >= 0,
    'Extra passenger rate cannot be negative',
  ),
  match_radius_km: numericField('Matching radius').refine(
    (n) => n > 0,
    'Matching radius must be greater than 0',
  ),
  request_timeout_seconds: numericField('Request timeout')
    .refine(Number.isInteger, 'Request timeout must be a whole number of seconds')
    .refine((n) => n > 0, 'Request timeout must be at least 1 second'),
});

export const locationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Landmark name is required'),
  address: z
    .string()
    .trim()
    .min(1, 'Address is required'),
  latitude: numericField('Latitude', { allowNegative: true }).refine(
    (n) => n >= -90 && n <= 90,
    'Latitude must be between -90 and 90',
  ),
  longitude: numericField('Longitude', { allowNegative: true }).refine(
    (n) => n >= -180 && n <= 180,
    'Longitude must be between -180 and 180',
  ),
});

export const vehicleInfoSchema = z.object({
  vehicle_number: z
    .string()
    .trim()
    .min(1, 'Tricycle plate or body number is required'),
  license_number: z
    .string()
    .trim()
    .min(1, 'Driver license number is required'),
  seat_capacity: numericField('Seat capacity')
    .refine(Number.isInteger, 'Seat capacity must be a whole number')
    .refine(
      (n) => n >= TRICYCLE_SEAT_LIMITS.min && n <= TRICYCLE_SEAT_LIMITS.max,
      `Seat capacity must be between ${TRICYCLE_SEAT_LIMITS.min} and ${TRICYCLE_SEAT_LIMITS.max}`,
    ),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterPassengerFormData = z.infer<typeof registerPassengerSchema>;
export type RegisterDriverFormData = z.infer<typeof registerDriverSchema>;
export type FareSettingsFormData = z.infer<typeof fareSettingsSchema>;
/** Fare settings as the inputs hold them while editing (text). */
export type FareSettingsFormValues = z.input<typeof fareSettingsSchema>;

export type LocationFormData = z.infer<typeof locationSchema>;
/** Location form as the inputs hold them while editing (text). */
export type LocationFormValues = z.input<typeof locationSchema>;

export type VehicleInfoFormData = z.infer<typeof vehicleInfoSchema>;
/** Vehicle edit form as the inputs hold it while editing (text). */
export type VehicleInfoFormValues = z.input<typeof vehicleInfoSchema>;

/**
 * The registration form always collects personal details; the driver-only
 * fields are present only while the "Driver" segment is selected.
 */
export type RegisterFormData = RegisterPassengerFormData & Partial<RegisterDriverFormData>;

/**
 * Role-aware resolver: driver accounts must also provide license, vehicle and
 * seat capacity, passenger accounts must not be asked for them.
 *
 * The resolver is read from the form options on every validation run, so it is
 * safe to rebuild it when the selected role changes.
 */
export const registerResolver = (role: 'passenger' | 'driver'): Resolver<RegisterFormData> => {
  const schema: z.ZodType<RegisterFormData> =
    role === 'driver' ? registerDriverSchema : registerPassengerSchema;
  return zodResolver(schema);
};

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid mobile number'),
  role: z.enum(['passenger', 'driver', 'admin']),
  license_number: z.string().optional(),
  vehicle_number: z.string().optional(),
  seat_capacity: z.coerce.number().int().min(5).max(7).optional(),
});

export type AdminCreateUserFormData = z.infer<typeof adminCreateUserSchema>;
