import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
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
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch customer', details: error.message }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer, { status: 200 });
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
    const result = updateCustomerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid customer data', 
        details: result.error.errors.map(e => e.message).join(', ') 
      }, { status: 400 });
    }

    const { name, mobile, address } = result.data;

    const { data: customer, error } = await supabase
      .from('customers')
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
      return NextResponse.json({ error: 'Failed to update customer', details: error.message }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer, { status: 200 });
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
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') { // Foreign key constraint violation code
        return NextResponse.json({ 
          error: 'Cannot delete customer because they have linked sales transaction records.' 
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to delete customer', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Customer deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error occurred', details: error.message }, { status: 500 });
  }
}
