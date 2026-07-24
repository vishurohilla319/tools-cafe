const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hvkryizgnrtrunbwjved.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2a3J5aXpnbnJ0cnVuYndqdmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODU1MjQsImV4cCI6MjA5NzU2MTUyNH0.jkyN18zafF0eCD8Bwkrt-QfZ4R6_HSoey1-lS_EbO5k';

export interface SupabaseAuthResponse {
  data: any;
  error: string | null;
}

export const signUpWithEmail = async (email: string, password: string, name: string): Promise<SupabaseAuthResponse> => {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        data: { full_name: name },
      }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.msg || data.error_description || data.message || 'Failed to send confirmation email';
      return { data: null, error: errorMsg };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Signup failed' };
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<SupabaseAuthResponse> => {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      const errorDescription = data.error_description || data.msg || data.message || '';
      if (errorDescription.toLowerCase().includes('email not confirmed')) {
        return { data: null, error: 'Email not confirmed! Please check your email inbox and click the confirmation link.' };
      }
      return { data: null, error: errorDescription || 'Invalid email or password' };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Login failed' };
  }
};
