import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const purchaseVoucherSchema = z.object({
  supplier_id: z.string().uuid('Invalid supplier ID'),
  items: z.array(z.object({
    stock_item_id: z.string().uuid('Invalid stock item ID'),
    quantity: z.number().gt(0, 'Quantity must be greater than zero'),
    rate: z.number().min(0, 'Rate must be positive or zero'),
  })).min(1, 'At least one item is required'),
});

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch purchase vouchers with supplier details
    let query = supabase
      .from('purchase_vouchers')
      .select('*, suppliers(name, mobile)')
      .order('created_at', { ascending: false });

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59Z`);
    }

    const { data: vouchers, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch purchase vouchers', details: error.message }, { status: 500 });
    }

    return NextResponse.json(vouchers, { status: 200 });
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
    const result = purchaseVoucherSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid voucher data', 
        details: result.error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { supplier_id, items } = result.data;

    // 1. Verify Supplier exists and get current balance
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplier_id)
      .maybeSingle();

    if (supplierError) {
      return NextResponse.json({ error: 'Database error fetching supplier', details: supplierError.message }, { status: 500 });
    }
    if (!supplier) {
      return NextResponse.json({ error: 'Selected supplier does not exist' }, { status: 400 });
    }

    // 2. Fetch stock item details
    const itemIds = items.map(i => i.stock_item_id);
    const { data: stockItems, error: itemsError } = await supabase
      .from('stock_items')
      .select('*')
      .in('id', itemIds);

    if (itemsError) {
      return NextResponse.json({ error: 'Database error fetching stock items', details: itemsError.message }, { status: 500 });
    }
    if (!stockItems || stockItems.length !== itemIds.length) {
      return NextResponse.json({ error: 'One or more selected stock items do not exist' }, { status: 400 });
    }

    // Map items for easy lookup
    const stockItemsMap = new Map(stockItems.map(item => [item.id, item]));

    // 3. Compute Totals (adding items increments stock, so no check for stock limit is needed)
    let totalAmount = 0;
    let totalGstAmount = 0;
    
    const computedItems = items.map(inputItem => {
      const stockItem = stockItemsMap.get(inputItem.stock_item_id)!;
      const lineTotal = inputItem.quantity * inputItem.rate;
      const lineGst = lineTotal * (stockItem.gst_percent / 100);
      
      totalAmount += lineTotal;
      totalGstAmount += lineGst;

      return {
        stock_item_id: inputItem.stock_item_id,
        quantity: inputItem.quantity,
        rate: inputItem.rate,
        line_total: lineTotal,
        new_quantity: stockItem.quantity + inputItem.quantity // Increments stock!
      };
    });

    const grandTotal = totalAmount + totalGstAmount;

    // 4. Perform insertions & updates sequentially
    
    // 4a. Create Purchase Voucher
    const { data: voucher, error: voucherInsertError } = await supabase
      .from('purchase_vouchers')
      .insert({
        supplier_id,
        total_amount: Number(totalAmount.toFixed(2)),
        gst_amount: Number(totalGstAmount.toFixed(2)),
        grand_total: Number(grandTotal.toFixed(2))
      })
      .select()
      .single();

    if (voucherInsertError || !voucher) {
      return NextResponse.json({ error: 'Failed to create purchase voucher', details: voucherInsertError?.message }, { status: 500 });
    }

    // 4b. Insert items
    const voucherItemsToInsert = computedItems.map(item => ({
      purchase_voucher_id: voucher.id,
      stock_item_id: item.stock_item_id,
      quantity: item.quantity,
      rate: item.rate,
      line_total: Number(item.line_total.toFixed(2))
    }));

    const { error: itemsInsertError } = await supabase
      .from('purchase_voucher_items')
      .insert(voucherItemsToInsert);

    if (itemsInsertError) {
      // rollback voucher
      await supabase.from('purchase_vouchers').delete().eq('id', voucher.id);
      return NextResponse.json({ error: 'Failed to save voucher line items', details: itemsInsertError.message }, { status: 500 });
    }

    // 4c. Update stock levels (increment)
    for (const item of computedItems) {
      const { error: stockUpdateError } = await supabase
        .from('stock_items')
        .update({ quantity: Number(item.new_quantity.toFixed(2)) })
        .eq('id', item.stock_item_id);

      if (stockUpdateError) {
        console.error(`Stock update failed for stock_item_id ${item.stock_item_id}: ${stockUpdateError.message}`);
      }
    }

    // 4d. Update supplier outstanding balance (increment balance since we owe them money now)
    const newSupplierBalance = Number((supplier.outstanding_balance + grandTotal).toFixed(2));
    const { error: supplierUpdateError } = await supabase
      .from('suppliers')
      .update({ outstanding_balance: newSupplierBalance })
      .eq('id', supplier_id);

    if (supplierUpdateError) {
      console.error(`Supplier balance update failed for supplier_id ${supplier_id}: ${supplierUpdateError.message}`);
    }

    return NextResponse.json(voucher, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error occurred' }, { status: 400 });
  }
}
