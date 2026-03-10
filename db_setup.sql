-- Supabase Database Setup Script for Hospital Duty Roster Management System

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create ENUM for Shift Types
CREATE TYPE shift_type AS ENUM ('M', 'A', 'N', 'O');

-- 3. Create Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- In a real app, use Supabase Auth or hash passwords. For this demo, plain text or simple hash.
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, name, role) VALUES ('admin', 'admin123', 'System Admin', 'admin');
INSERT INTO users (username, password, name, role) VALUES ('kik', 'kik123', 'Kik Admin', 'admin');
INSERT INTO users (username, password, name, role) VALUES ('user1', 'user123', 'General Staff 1', 'user');

-- 4. Create Staff Table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample staff
INSERT INTO staff (name, phone) VALUES ('Dr. Smith', '555-0101');
INSERT INTO staff (name, phone) VALUES ('Nurse Joy', '555-0102');
INSERT INTO staff (name, phone) VALUES ('Dr. House', '555-0103');
INSERT INTO staff (name, phone) VALUES ('Nurse Jackie', '555-0104');

-- 5. Create Shifts Table (Table-kik)
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type shift_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date) -- Conflict Prevention: A staff cannot have overlapping shifts on the same day
);

-- 6. Create Roster Status Table
CREATE TABLE roster_status (
    month_key TEXT PRIMARY KEY, -- Format: YYYY-MM
    is_published BOOLEAN DEFAULT FALSE,
    original_assignments JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Logs Table
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT NOT NULL,
    action_type TEXT NOT NULL
);

-- 8. Create Shift Swap Requests Table
CREATE TYPE shift_swap_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
    requester_shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
    requester_date DATE NOT NULL,
    requester_shift_type shift_type NOT NULL,
    target_staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
    target_shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
    target_date DATE NOT NULL,
    target_shift_type shift_type NOT NULL,
    status shift_swap_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Row Level Security (RLS) Policies
-- For simplicity in this demo, we can allow all access if authenticated via our custom logic, 
-- or set up basic policies.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (since we handle auth in app logic)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on staff" ON staff FOR ALL USING (true);
CREATE POLICY "Allow all on shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow all on roster_status" ON roster_status FOR ALL USING (true);
CREATE POLICY "Allow all on logs" ON logs FOR ALL USING (true);
CREATE POLICY "Allow all on shift_swap_requests" ON shift_swap_requests FOR ALL USING (true);
