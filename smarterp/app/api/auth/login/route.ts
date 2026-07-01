import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { comparePasswords, signToken } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: result.error.issues.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { email, password } = result.data;

    // Fetch user from DB
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'Database query failed', details: fetchError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isPasswordMatch = await comparePasswords(password, user.password_hash);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Generate JWT token
    const token = signToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
