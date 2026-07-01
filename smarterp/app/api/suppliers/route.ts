import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
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

    let query = supabase.from('suppliers').select('*').order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%`);
    }

    const { data: suppliers, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch suppliers', details: error.message }, { status: 500 });
    }

    return NextResponse.json(suppliers, { status: 200 });
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
    const result = supplierSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid supplier data', 
        details: result.error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { name, mobile, address } = result.data;

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name: name.trim(),
        mobile: mobile ? mobile.trim() : null,
        address: address ? address.trim() : null,
        outstanding_balance: 0.00 // Forced auto-calculated master balance
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create supplier', details: error.message }, { status: 500 });
    }

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
