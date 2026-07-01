import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const updateStockItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().min(1, 'SKU is required'),
  unit: z.enum(['PCS', 'KG', 'BOX', 'LTR']),
  purchase_price: z.number().min(0, 'Purchase price must be positive'),
  selling_price: z.number().min(0, 'Selling price must be positive'),
  gst_percent: z.number().min(0, 'GST percent must be positive').max(100, 'GST percent cannot exceed 100'),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { data: item, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock item', details: error.message }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json({ error: 'Stock item not found' }, { status: 404 });
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const result = updateStockItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid stock item data', 
        details: result.error.issues.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { name, sku, unit, purchase_price, selling_price, gst_percent } = result.data;

    // Check SKU uniqueness excluding current item
    const { data: existingItem, error: checkError } = await supabase
      .from('stock_items')
      .select('id')
      .eq('sku', sku.toUpperCase().trim())
      .neq('id', id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: 'Database check failed', details: checkError.message }, { status: 500 });
    }

    if (existingItem) {
      return NextResponse.json({ error: 'Stock item with this SKU already exists' }, { status: 409 });
    }

    const { data: item, error } = await supabase
      .from('stock_items')
      .update({
        name: name.trim(),
        sku: sku.toUpperCase().trim(),
        unit,
        purchase_price,
        selling_price,
        gst_percent,
        // quantity is explicitly not modified here
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to update stock item', details: error.message }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json({ error: 'Stock item not found' }, { status: 404 });
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const { error } = await supabase
      .from('stock_items')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        return NextResponse.json({ 
          error: 'Cannot delete stock item because it is referenced in past sales/purchase vouchers.' 
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to delete stock item', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Stock item deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
