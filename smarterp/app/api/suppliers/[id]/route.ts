import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const updateSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  mobile: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
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
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch supplier', details: error.message }, { status: 500 });
    }

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier, { status: 200 });
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
    const result = updateSupplierSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid supplier data', 
        details: result.error.issues.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { name, mobile, address } = result.data;

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update({
        name: name.trim(),
        mobile: mobile ? mobile.trim() : null,
        address: address ? address.trim() : null,
        // outstanding_balance is explicitly not modified here
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to update supplier', details: error.message }, { status: 500 });
    }

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier, { status: 200 });
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
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        return NextResponse.json({ 
          error: 'Cannot delete supplier because they have linked purchase transaction records.' 
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to delete supplier', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Supplier deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
