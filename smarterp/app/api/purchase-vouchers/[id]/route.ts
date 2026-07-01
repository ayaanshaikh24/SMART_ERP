import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

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

    // Fetch the purchase voucher and supplier details
    const { data: voucher, error: voucherError } = await supabase
      .from('purchase_vouchers')
      .select('*, suppliers(*)')
      .eq('id', id)
      .maybeSingle();

    if (voucherError) {
      return NextResponse.json({ error: 'Database query failed', details: voucherError.message }, { status: 500 });
    }

    if (!voucher) {
      return NextResponse.json({ error: 'Purchase voucher not found' }, { status: 404 });
    }

    // Fetch the line items including stock item names and SKUs
    const { data: items, error: itemsError } = await supabase
      .from('purchase_voucher_items')
      .select('*, stock_items(name, sku, unit)')
      .eq('purchase_voucher_id', id);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch purchase voucher items', details: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      ...voucher,
      items: items || []
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
