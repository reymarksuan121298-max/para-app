import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { DriverProfile, PassengerProfile, UserProfile, UserRole } from '../types';
import { generateUUID } from '../utils/otp';

const SESSION_KEY = '@para_auth_user_id';

export interface SignUpPassengerData {
  name: string;
  email: string;
  phone: string;
  password?: string;
}

export interface SignUpDriverData {
  name: string;
  email: string;
  phone: string;
  password?: string;
  license_number: string;
  vehicle_number: string;
  seat_capacity: number;
}

export async function signInWithEmail(email: string, password?: string): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();

  // Query user directly from public.users
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalizedEmail)
    .single();

  if (error || !user) {
    throw new Error('User not found. Please check your email or register an account.');
  }

  if (user.status === 'suspended') {
    throw new Error('This account has been suspended. Please contact administrator.');
  }

  // Persist logged-in session locally
  await AsyncStorage.setItem(SESSION_KEY, user.user_id);
  return user;
}

export async function signUpPassenger(payload: SignUpPassengerData): Promise<{ user: UserProfile; passenger: PassengerProfile }> {
  const { name, email, phone, password } = payload;
  const normalizedEmail = email.trim().toLowerCase();

  let userId = '';

  // Attempt Supabase auth account creation without blocking on email limits
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password || 'para123456',
    });

    if (!authError && authData?.user) {
      userId = authData.user.id;
      if (authData.session) {
        await supabase.auth.setSession(authData.session);
      }
    }
  } catch {
    // Ignore rate-limit from Supabase since verification was already completed via EmailJS
  }

  if (!userId) {
    // Fallback: check if user already exists in public.users or generate new UUID
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    userId = existingUser?.user_id || generateUUID();
  }

  // Check if profile was already populated by a database trigger
  let { data: newUser } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // If not created by trigger, insert/upsert user profile into public.users
  if (!newUser) {
    const { data: insertedUser, error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        role: 'passenger',
        status: 'active',
      })
      .select()
      .single();

    if (userError || !insertedUser) {
      throw new Error(userError?.message || 'Failed to create user profile');
    }
    newUser = insertedUser;
  }

  // Check if passenger row was created by trigger
  let { data: passengerData } = await supabase
    .from('passengers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!passengerData) {
    const { data: insertedPassenger, error: passengerError } = await supabase
      .from('passengers')
      .upsert({
        user_id: userId,
      })
      .select()
      .single();

    if (passengerError || !insertedPassenger) {
      throw new Error(passengerError?.message || 'Failed to create passenger profile');
    }
    passengerData = insertedPassenger;
  }

  // Save session locally so user is immediately logged in
  await AsyncStorage.setItem(SESSION_KEY, userId);

  return { user: newUser, passenger: passengerData };
}

export async function signUpDriver(payload: SignUpDriverData): Promise<{ user: UserProfile; driver: DriverProfile }> {
  const { name, email, phone, password, license_number, vehicle_number, seat_capacity } = payload;
  const normalizedEmail = email.trim().toLowerCase();

  let userId = '';

  // Attempt Supabase auth account creation without blocking on email limits
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password || 'para123456',
    });

    if (!authError && authData?.user) {
      userId = authData.user.id;
      if (authData.session) {
        await supabase.auth.setSession(authData.session);
      }
    }
  } catch {
    // Ignore rate-limit from Supabase since verification was already completed via EmailJS
  }

  if (!userId) {
    // Fallback: check if user already exists in public.users or generate new UUID
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    userId = existingUser?.user_id || generateUUID();
  }

  // Check if user profile was already populated by a database trigger
  let { data: newUser } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // If not created by trigger, insert/upsert user profile into public.users
  if (!newUser) {
    const { data: insertedUser, error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        role: 'driver',
        status: 'active',
      })
      .select()
      .single();

    if (userError || !insertedUser) {
      throw new Error(userError?.message || 'Failed to create driver account');
    }
    newUser = insertedUser;
  }

  // Check if driver row was created by trigger
  let { data: driverData } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!driverData) {
    const { data: insertedDriver, error: driverError } = await supabase
      .from('drivers')
      .upsert({
        user_id: userId,
        license_number: license_number.trim(),
        vehicle_number: vehicle_number.trim(),
        seat_capacity: Number(seat_capacity),
        status: 'offline',
        is_verified: true,
      })
      .select()
      .single();

    if (driverError || !insertedDriver) {
      throw new Error(driverError?.message || 'Failed to create driver profile');
    }
    driverData = insertedDriver;
  }

  // Save session locally so user is immediately logged in
  await AsyncStorage.setItem(SESSION_KEY, userId);

  return { user: newUser, driver: driverData };
}

export async function getCurrentUserProfile(userId: string): Promise<{
  user: UserProfile;
  passenger?: PassengerProfile;
  driver?: DriverProfile;
}> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (userError || !user) throw new Error(userError?.message || 'User not found');

  let passenger: PassengerProfile | undefined;
  let driver: DriverProfile | undefined;

  if (user.role === 'passenger') {
    const { data: pData } = await supabase
      .from('passengers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (pData) {
      passenger = pData;
    } else {
      // Auto-create missing passenger record
      const { data: newP } = await supabase
        .from('passengers')
        .insert({ user_id: userId })
        .select()
        .single();
      if (newP) passenger = newP;
    }
  } else if (user.role === 'driver') {
    const { data: dData } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (dData) {
      driver = dData;
    } else {
      // Auto-create missing driver record with unique default tricycle credentials
      const shortSuffix = userId.substring(0, 4).toUpperCase();
      const { data: newD } = await supabase
        .from('drivers')
        .insert({
          user_id: userId,
          license_number: `LIC-${shortSuffix}`,
          vehicle_number: `TR-${shortSuffix}`,
          seat_capacity: 6,
          status: 'offline',
          is_verified: true,
        })
        .select()
        .single();
      if (newD) driver = newD;
    }
  }

  return { user, passenger, driver };
}

export async function getStoredSessionUserId(): Promise<string | null> {
  return await AsyncStorage.getItem(SESSION_KEY);
}

export async function signOut() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function updateUserProfileAvatar(userId: string, avatarUrl: string | null): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update profile avatar');
  }

  return data as UserProfile;
}
