import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: result.error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { email, password } = result.data;

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: 'Database check failed', details: checkError.message }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    // Insert user into Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ 
        email: email.toLowerCase().trim(), 
        password_hash: hashedPassword 
      })
      .select('id, email')
      .single();

    if (insertError || !newUser) {
      return NextResponse.json({ error: 'Failed to create user', details: insertError?.message }, { status: 500 });
    }

    // Generate JWT token
    const token = signToken({ userId: newUser.id, email: newUser.email });

    return NextResponse.json({ 
      message: 'User created successfully', 
      token, 
      user: { id: newUser.id, email: newUser.email } 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
