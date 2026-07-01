import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  mobile: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q');

    let query = supabase.from('customers').select('*').order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%`);
    }

    const { data: customers, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch customers', details: error.message }, { status: 500 });
    }

    return NextResponse.json(customers, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = customerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid customer data', 
        details: result.error.issues.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { name, mobile, address } = result.data;

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        mobile: mobile ? mobile.trim() : null,
        address: address ? address.trim() : null,
        outstanding_balance: 0.00 // Forced auto-calculated master balance
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create customer', details: error.message }, { status: 500 });
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
