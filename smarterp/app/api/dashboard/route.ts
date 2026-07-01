import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch counts in parallel
    const [custRes, suppRes, stockRes] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('suppliers').select('*', { count: 'exact', head: true }),
      supabase.from('stock_items').select('*', { count: 'exact', head: true }),
    ]);

    // 2. Fetch recent 5 sales vouchers with customer names
    const { data: recentSales, error: salesError } = await supabase
      .from('sales_vouchers')
      .select('*, customers(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Fetch recent 5 purchase vouchers with supplier names
    const { data: recentPurchases, error: purchasesError } = await supabase
      .from('purchase_vouchers')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    // 4. Fetch low stock items (quantity < 10)
    const { data: lowStockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('*')
      .lt('quantity', 10.00)
      .order('quantity', { ascending: true });

    if (custRes.error || suppRes.error || stockRes.error || salesError || purchasesError || stockItemsError) {
      return NextResponse.json({ 
        error: 'Failed to retrieve dashboard details', 
        details: {
          customer: custRes.error?.message,
          supplier: suppRes.error?.message,
          stock: stockRes.error?.message,
          sales: salesError?.message,
          purchases: purchasesError?.message,
          lowStock: stockItemsError?.message
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      counts: {
        customers: custRes.count || 0,
        suppliers: suppRes.count || 0,
        stockItems: stockRes.count || 0
      },
      recentSales: recentSales || [],
      recentPurchases: recentPurchases || [],
      lowStockItems: lowStockItems || []
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
