-- SmartERP Database Schema

-- Enable UUID extension if not already enabled (gen_random_uuid() is standard in pg13+)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    outstanding_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    outstanding_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Stock Items Table
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('PCS', 'KG', 'BOX', 'LTR')),
    purchase_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Sales Vouchers Table
CREATE TABLE IF NOT EXISTS sales_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Sales Voucher Items Table
CREATE TABLE IF NOT EXISTS sales_voucher_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_voucher_id UUID NOT NULL REFERENCES sales_vouchers(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(12, 2) NOT NULL,
    rate DECIMAL(15, 2) NOT NULL,
    line_total DECIMAL(15, 2) NOT NULL
);

-- 7. Purchase Vouchers Table
CREATE TABLE IF NOT EXISTS purchase_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    gst_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 8. Purchase Voucher Items Table
CREATE TABLE IF NOT EXISTS purchase_voucher_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_voucher_id UUID NOT NULL REFERENCES purchase_vouchers(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(12, 2) NOT NULL,
    rate DECIMAL(15, 2) NOT NULL,
    line_total DECIMAL(15, 2) NOT NULL
);

-- Sequence and Trigger for Auto-Incrementing Invoice Numbers
CREATE SEQUENCE IF NOT EXISTS sales_invoice_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_invoice_number() 
RETURNS trigger AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV-' || LPAD(nextval('sales_invoice_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_generate_invoice_number
BEFORE INSERT ON sales_vouchers
FOR EACH ROW
EXECUTE FUNCTION generate_invoice_number();
