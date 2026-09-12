import { query } from './db.js';

export async function initDatabase() {
  await query.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      contact_email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ventures (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      maintenance_rate REAL DEFAULT 3.50,
      settings TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      total_floors INTEGER DEFAULT 1,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE,
      UNIQUE (venture_id, code)
    );

    CREATE TABLE IF NOT EXISTS floors (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      floor_number INTEGER NOT NULL,
      floor_name TEXT NOT NULL,
      total_flats INTEGER DEFAULT 4,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
      UNIQUE (block_id, floor_number)
    );

    CREATE TABLE IF NOT EXISTS flats (
      id TEXT PRIMARY KEY,
      floor_id TEXT NOT NULL,
      flat_number TEXT NOT NULL,
      flat_type TEXT DEFAULT '2BHK',
      built_up_area_sqft REAL NOT NULL,
      carpet_area_sqft REAL NOT NULL,
      occupancy_status TEXT DEFAULT 'VACANT',
      parking_slot_numbers TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
      UNIQUE (floor_id, flat_number)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS user_role_assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      venture_id TEXT,
      block_id TEXT,
      floor_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE,
      FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS owners (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      national_id_type TEXT,
      national_id_number TEXT,
      emergency_contact TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS flat_ownerships (
      id TEXT PRIMARY KEY,
      flat_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      ownership_percentage REAL DEFAULT 100.0,
      deed_reference_number TEXT,
      is_primary_owner INTEGER DEFAULT 1,
      purchase_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
      UNIQUE (flat_id, owner_id)
    );

    CREATE TABLE IF NOT EXISTS residents (
      id TEXT PRIMARY KEY,
      flat_id TEXT NOT NULL,
      user_id TEXT UNIQUE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      resident_type TEXT DEFAULT 'PRIMARY_TENANT',
      lease_start_date TEXT,
      lease_end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS amenity_catalog (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS venture_amenities (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL,
      amenity_catalog_id TEXT NOT NULL,
      custom_name TEXT,
      max_capacity_per_slot INTEGER DEFAULT 20,
      slot_duration_minutes INTEGER DEFAULT 60,
      opening_time TEXT DEFAULT '06:00',
      closing_time TEXT DEFAULT '22:00',
      booking_fee REAL DEFAULT 0.0,
      requires_approval INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE,
      FOREIGN KEY (amenity_catalog_id) REFERENCES amenity_catalog(id) ON DELETE CASCADE,
      UNIQUE (venture_id, amenity_catalog_id)
    );

    CREATE TABLE IF NOT EXISTS amenity_bookings (
      id TEXT PRIMARY KEY,
      venture_amenity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      flat_id TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      attendee_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'CONFIRMED',
      qr_pass_code TEXT UNIQUE NOT NULL,
      amount_paid REAL DEFAULT 0.0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venture_amenity_id) REFERENCES venture_amenities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_invoices (
      id TEXT PRIMARY KEY,
      flat_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      billing_month TEXT NOT NULL,
      base_amount REAL NOT NULL,
      amenity_charges REAL DEFAULT 0.0,
      penalty_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'PENDING',
      due_date TEXT NOT NULL,
      paid_date TEXT,
      payment_method TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS helpdesk_tickets (
      id TEXT PRIMARY KEY,
      flat_id TEXT NOT NULL,
      floor_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'OPEN',
      assigned_to_role TEXT,
      sla_hours INTEGER DEFAULT 24,
      sla_deadline TIMESTAMP,
      escalation_level INTEGER DEFAULT 0,
      is_escalated INTEGER DEFAULT 0,
      resolution_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      flat_id TEXT NOT NULL,
      venture_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      visitor_name TEXT NOT NULL,
      visitor_phone TEXT NOT NULL,
      visitor_type TEXT DEFAULT 'GUEST',
      vehicle_number TEXT,
      pass_code TEXT UNIQUE NOT NULL,
      valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      valid_until TIMESTAMP NOT NULL,
      status TEXT DEFAULT 'APPROVED',
      check_in_time TIMESTAMP,
      check_out_time TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
      FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS smart_meters (
      id TEXT PRIMARY KEY,
      flat_id TEXT NOT NULL,
      meter_type TEXT NOT NULL,
      meter_serial TEXT UNIQUE NOT NULL,
      current_reading REAL DEFAULT 0.0,
      unit_type TEXT NOT NULL,
      rate_per_unit REAL NOT NULL,
      status TEXT DEFAULT 'ONLINE',
      last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS utility_readings (
      id TEXT PRIMARY KEY,
      meter_id TEXT NOT NULL,
      flat_id TEXT NOT NULL,
      billing_month TEXT NOT NULL,
      units_consumed REAL NOT NULL,
      unit_type TEXT NOT NULL,
      rate_per_unit REAL NOT NULL,
      total_charge REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meter_id) REFERENCES smart_meters(id) ON DELETE CASCADE,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS iot_sensors (
      id TEXT PRIMARY KEY,
      venture_id TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      sensor_name TEXT NOT NULL,
      location TEXT NOT NULL,
      current_value REAL NOT NULL,
      unit TEXT NOT NULL,
      min_threshold REAL NOT NULL,
      max_threshold REAL NOT NULL,
      status TEXT DEFAULT 'NORMAL',
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      venture_id TEXT,
      user_id TEXT,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate any missing columns if tables existed prior
  try {
    await query.run("ALTER TABLE helpdesk_tickets ADD COLUMN sla_hours INTEGER DEFAULT 24;");
  } catch (e) {}
  try {
    await query.run("ALTER TABLE helpdesk_tickets ADD COLUMN sla_deadline TIMESTAMP;");
  } catch (e) {}
  try {
    await query.run("ALTER TABLE helpdesk_tickets ADD COLUMN escalation_level INTEGER DEFAULT 0;");
  } catch (e) {}
  try {
    await query.run("ALTER TABLE helpdesk_tickets ADD COLUMN is_escalated INTEGER DEFAULT 0;");
  } catch (e) {}
}
