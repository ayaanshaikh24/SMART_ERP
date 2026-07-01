import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const stockItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().min(1, 'SKU is required'),
  unit: z.enum(['PCS', 'KG', 'BOX', 'LTR'], {
    errorMap: () => ({ message: 'Unit must be PCS, KG, BOX, or LTR' })
  }),
  purchase_price: z.number().min(0, 'Purchase price must be positive'),
  selling_price: z.number().min(0, 'Selling price must be positive'),
  gst_percent: z.number().min(0, 'GST percent must be positive').max(100, 'GST percent cannot exceed 100'),
});

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q');

    let query = supabase.from('stock_items').select('*').order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock items', details: error.message }, { status: 500 });
    }

    return NextResponse.json(items, { status: 200 });
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
    const result = stockItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid stock item data', 
        details: result.error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { name, sku, unit, purchase_price, selling_price, gst_percent } = result.data;

    // Check SKU uniqueness
    const { data: existingItem, error: checkError } = await supabase
      .from('stock_items')
      .select('id')
      .eq('sku', sku.toUpperCase().trim())
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: 'Database check failed', details: checkError.message }, { status: 500 });
    }

    if (existingItem) {
      return NextResponse.json({ error: 'Stock item with this SKU already exists' }, { status: 409 });
    }

    const { data: item, error } = await supabase
      .from('stock_items')
      .insert({
        name: name.trim(),
        sku: sku.toUpperCase().trim(),
        unit,
        purchase_price,
        selling_price,
        gst_percent,
        quantity: 0.00 // Forced auto-calculated stock quantity
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create stock item', details: error.message }, { status: 500 });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
