import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { DriverProfile, PassengerProfile, UserProfile, UserRole } from '../types';

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

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = (
    typeof err === 'string'
      ? err
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : ''
  ).toLowerCase();

  const details = (
    typeof err === 'object' && err !== null && 'details' in err
      ? String((err as { details: unknown }).details)
      : ''
  ).toLowerCase();

  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? (err as { status: unknown }).status
      : undefined;

  return (
    msg.includes('fetch failed') ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('enotfound') ||
    msg.includes('networkerror') ||
    details.includes('enotfound') ||
    status === 0
  );
}

export async function checkEmailAvailable(
  email: string
): Promise<{ available: boolean; existingRole?: UserRole }> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: existingUser, error } = await supabase
    .from('users')
    .select('user_id, role')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    if (isNetworkError(error)) {
      throw new Error(
        'Cannot connect to the server. Please check your internet connection or Supabase backend status.'
      );
    }
  }

  if (existingUser) {
    return { available: false, existingRole: existingUser.role as UserRole };
  }
  return { available: true };
}

export async function signInWithEmail(email: string, password?: string): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();

  let authUserId: string | null = null;

  // 1. If password is provided, authenticate via Supabase Auth
  if (password) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      if (isNetworkError(authError)) {
        throw new Error(
          'Cannot connect to the server. Please check your internet connection or verify your Supabase project status.'
        );
      }

      const msg = authError.message.toLowerCase();
      // If error is not generic invalid credentials (e.g. rate limit, unconfirmed email, banned)
      if (!msg.includes('invalid login credentials')) {
        throw new Error(authError.message);
      }
    } else if (authData?.user) {
      authUserId = authData.user.id;
    }
  }

  // 2. Query user profile from public.users
  const query = supabase.from('users').select('*');
  const { data: user, error } = authUserId
    ? await query.eq('user_id', authUserId).maybeSingle()
    : await query.ilike('email', normalizedEmail).maybeSingle();

  if (error) {
    if (isNetworkError(error)) {
      throw new Error(
        'Cannot connect to the server. Please check your internet connection or verify your Supabase project status.'
      );
    }
    throw new Error(error.message || 'Database error occurred during login.');
  }

  if (!user) {
    if (password && !authUserId) {
      throw new Error('Invalid email or password. Please verify your credentials or register an account.');
    }
    throw new Error('User not found. Please check your email or register an account.');
  }

  // If password was provided but Supabase Auth did not authenticate it, either
  // the password is wrong or this profile has no auth account at all (e.g. an
  // admin created before sign-in accounts were provisioned). Both cases must
  // give the same message — never claim the password itself is incorrect.
  if (password && !authUserId) {
    throw new Error('Invalid email or password. Please verify your credentials.');
  }

  if (user.status === 'suspended') {
    throw new Error('This account has been suspended. Please contact administrator.');
  }

  // Persist logged-in session locally
  await AsyncStorage.setItem(SESSION_KEY, user.user_id);
  return user;
}

/**
 * Creates the Supabase Auth account behind a new profile.
 *
 * Registration is verified by the EmailJS OTP, so the account must be usable
 * immediately — a profile without a matching auth user has no password and can
 * never sign in again. Failures are surfaced instead of silently creating a
 * profile with a random UUID.
 */
async function createAuthAccount(
  email: string,
  password: string | undefined,
  metadata: { name: string; phone: string; role: 'passenger' | 'driver' },
): Promise<string> {
  let userId = '';
  let failureMessage = '';

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password || 'para123456',
      options: { data: metadata },
    });

    if (error) {
      failureMessage = error.message;
    } else if (!data?.user) {
      failureMessage = 'Sign-up did not return an account.';
    } else if (data.user.identities && data.user.identities.length === 0) {
      // Supabase hides duplicate registrations this way instead of erroring.
      failureMessage = 'An account with this email address already exists.';
    } else {
      userId = data.user.id;
      if (data.session) {
        await supabase.auth.setSession(data.session);
      } else {
        // "Confirm email" may still be enabled in the Supabase project, in which
        // case sign-up withholds the session. EmailJS already verified the
        // address and migration 12 auto-confirms auth users, so fetch the
        // session directly. Failure here is not fatal: the caller still signs in
        // locally and can log in with the password afterwards.
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'para123456',
        });
        if (signInData?.session) {
          await supabase.auth.setSession(signInData.session);
        }
      }
    }
  } catch (err) {
    failureMessage = err instanceof Error ? err.message : 'Sign-up failed.';
  }

  if (!userId) {
    const msg = failureMessage.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      throw new Error('Too many registration attempts. Please wait a minute and try again.');
    }
    throw new Error(
      failureMessage || 'Could not create your sign-in credentials. Please try again.'
    );
  }

  return userId;
}

export async function signUpPassenger(payload: SignUpPassengerData): Promise<{ user: UserProfile; passenger: PassengerProfile }> {
  const { name, email, phone, password } = payload;
  const normalizedEmail = email.trim().toLowerCase();

  // The account must exist in Supabase Auth so it can sign in after the
  // EmailJS verification step.
  const userId = await createAuthAccount(normalizedEmail, password, {
    name: name.trim(),
    phone: phone.trim(),
    role: 'passenger',
  });

  // Explicitly upsert user profile into public.users with passenger role
  const { data: upsertedUser, error: userError } = await supabase
    .from('users')
    .upsert({
      user_id: userId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      role: 'passenger',
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (userError || !upsertedUser) {
    throw new Error(userError?.message || 'Failed to create user profile');
  }

  // Ensure passenger profile exists
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

  return { user: upsertedUser, passenger: passengerData };
}

export async function signUpDriver(payload: SignUpDriverData): Promise<{ user: UserProfile; driver: DriverProfile }> {
  const { name, email, phone, password, license_number, vehicle_number, seat_capacity } = payload;
  const normalizedEmail = email.trim().toLowerCase();

  // The account must exist in Supabase Auth so it can sign in after the
  // EmailJS verification step.
  const userId = await createAuthAccount(normalizedEmail, password, {
    name: name.trim(),
    phone: phone.trim(),
    role: 'driver',
  });

  // Enforce role: 'driver' on public.users, overriding any trigger default or passenger state
  const { data: upsertedUser, error: userError } = await supabase
    .from('users')
    .upsert({
      user_id: userId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      role: 'driver',
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (userError || !upsertedUser) {
    throw new Error(userError?.message || 'Failed to create driver account');
  }

  // Ensure driver profile is created / upserted with tricycle details
  const { data: upsertedDriver, error: driverError } = await supabase
    .from('drivers')
    .upsert({
      user_id: userId,
      license_number: license_number.trim(),
      vehicle_number: vehicle_number.trim(),
      seat_capacity: Number(seat_capacity) || 6,
      status: 'offline',
      is_verified: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (driverError || !upsertedDriver) {
    throw new Error(driverError?.message || 'Failed to create driver profile');
  }

  // Save session locally so user is immediately logged in
  await AsyncStorage.setItem(SESSION_KEY, userId);

  return { user: upsertedUser, driver: upsertedDriver };
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

  // Check if driver profile exists in database
  const { data: dData } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (user.role === 'driver' || dData) {
    // If a driver profile exists or user is a driver, ensure role is 'driver'
    if (user.role !== 'driver') {
      await supabase
        .from('users')
        .update({ role: 'driver', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      user.role = 'driver';
    }

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
  } else if (user.role === 'passenger') {
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
