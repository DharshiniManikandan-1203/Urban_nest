import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { initDatabase } from './schema.js';

export async function seedDatabase() {
  await initDatabase();

  const existing = await query.get("SELECT COUNT(*) as count FROM ventures");
  if (existing && existing.count > 0) {
    // Check if new tables are seeded
    const meterCount = await query.get("SELECT COUNT(*) as count FROM smart_meters");
    if (meterCount && meterCount.count > 0) {
      console.log("Database already contains data and smart meters. Skipping seed.");
      return;
    }
    console.log("Existing database found, seeding Smart Meters, IoT Sensors, and Visitors...");
    await seedEnterpriseAdditions();
    return;
  }

  console.log("Seeding Node.js database with multi-venture hierarchical data...");
  const passwordHash = await bcrypt.hash("Password@123", 10);

  // 1. Organization
  const orgId = "org-urbannest-01";
  await query.run(`
    INSERT INTO organizations (id, name, code, contact_email)
    VALUES (?, ?, ?, ?)
  `, [orgId, "Urban Nest Real Estate Group", "UN-GROUP", "contact@urbannest.com"]);

  // 2. Roles
  const roles = [
    ["role-super-admin", "SUPER_ADMIN", "Global access across all ventures (Dharshini A & B)"],
    ["role-venture-admin", "VENTURE_ADMIN", "Full management scoped to a specific apartment community"],
    ["role-block-manager", "BLOCK_MANAGER", "Operational management scoped to assigned blocks"],
    ["role-floor-manager", "FLOOR_MANAGER", "Floor inspection and resident grievance handling"],
    ["role-owner", "OWNER", "Flat owner with asset deed and amenity booking rights"],
    ["role-resident", "RESIDENT", "Resident tenant with amenity access and maintenance visibility"],
    ["role-guard", "GUARD", "Gatekeeper and QR pass verification"]
  ];

  for (const [id, name, desc] of roles) {
    await query.run("INSERT INTO roles (id, name, description) VALUES (?, ?, ?)", [id, name, desc]);
  }

  // 3. Amenity Catalog
  const catalog = [
    ["cat-pool", "Swimming Pool", "SPORTS", "waves", "Temperature-controlled swimming pool with lap lanes and baby pool"],
    ["cat-gym", "Gymnasium & Fitness Club", "WELLNESS", "dumbbell", "State-of-the-art cardio and strength training equipment"],
    ["cat-badminton", "Badminton & Squash Arena", "SPORTS", "activity", "Synthetic wood indoor courts with LED lighting"],
    ["cat-banquet", "Grand Banquet & Party Hall", "SOCIAL", "glass-water", "Spacious air-conditioned banquet hall with pantry and audio setup"],
    ["cat-ev", "EV Fast Charging Hub", "UTILITY", "zap", "High-voltage 60kW DC fast chargers for electric vehicles"],
    ["cat-tennis", "Floodlit Tennis Court", "SPORTS", "trophy", "All-weather synthetic turf tennis court"],
    ["cat-lounge", "Rooftop Sky Lounge & BBQ", "SOCIAL", "sunset", "Panoramic sky terrace with private BBQ pits and chillout deck"],
    ["cat-sauna", "Steam, Sauna & Jacuzzi", "WELLNESS", "flame", "Therapeutic steam rooms, dry cedar sauna, and hydrotherapy pool"]
  ];

  for (const [id, name, category, icon, desc] of catalog) {
    await query.run("INSERT INTO amenity_catalog (id, name, category, icon_name, description) VALUES (?, ?, ?, ?, ?)", [id, name, category, icon, desc]);
  }

  // 4. Venture 1: Dharshini A - Luxury Enclave (All Amenities)
  const venAId = "ven-dharshini-a";
  await query.run(`
    INSERT INTO ventures (id, org_id, name, code, address, city, state, pincode, status, maintenance_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 4.00)
  `, [venAId, orgId, "Dharshini A - Luxury Enclave", "DHAR-A", "Survey 45, Financial District, Gachibowli", "Hyderabad", "Telangana", "500032"]);

  for (const [catId, name, cat, icon, desc] of catalog) {
    const vaId = `va-dhara-${catId.slice(4)}`;
    const fee = catId.includes("banquet") ? 50.0 : (catId.includes("lounge") ? 20.0 : (catId.includes("ev") ? 5.0 : 0.0));
    const duration = catId.includes("banquet") ? 240 : (catId.includes("lounge") ? 180 : (catId.includes("ev") ? 120 : 60));
    await query.run(`
      INSERT INTO venture_amenities (id, venture_id, amenity_catalog_id, custom_name, max_capacity_per_slot, slot_duration_minutes, opening_time, closing_time, booking_fee)
      VALUES (?, ?, ?, ?, ?, ?, '06:00', '22:00', ?)
    `, [vaId, venAId, catId, `Dharshini A ${name}`, 20, duration, fee]);
  }

  // 5. Venture 2: Dharshini B - Garden View (POOL ONLY)
  const venBId = "ven-dharshini-b";
  await query.run(`
    INSERT INTO ventures (id, org_id, name, code, address, city, state, pincode, status, maintenance_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 3.00)
  `, [venBId, orgId, "Dharshini B - Garden View", "DHAR-B", "Plot 12, Nanakramguda Lake Road", "Hyderabad", "Telangana", "500008"]);

  await query.run(`
    INSERT INTO venture_amenities (id, venture_id, amenity_catalog_id, custom_name, max_capacity_per_slot, slot_duration_minutes, opening_time, closing_time, booking_fee)
    VALUES (?, ?, 'cat-pool', 'Dharshini B Splash Pool', 15, 60, '06:00', '20:00', 0.0)
  `, ["va-dharb-pool", venBId]);

  // 6. Seed Blocks, Floors, Flats for Dharshini A
  const blocksA = [
    ["blk-dhara-a", "Block A (Tower 1)", "BLK-A", 4],
    ["blk-dhara-b", "Block B (Tower 2)", "BLK-B", 4],
    ["blk-dhara-c", "Block C (Tower 3)", "BLK-C", 4],
    ["blk-dhara-d", "Block D (Penthouse & Villa)", "BLK-D", 4]
  ];

  let flatCounterA = 0;
  for (const [bId, bName, bCode, floorsCount] of blocksA) {
    await query.run("INSERT INTO blocks (id, venture_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)", [bId, venAId, bName, bCode, floorsCount]);

    for (let flNum = 1; flNum <= floorsCount; flNum++) {
      const flId = `fl-${bId}-${flNum}`;
      await query.run("INSERT INTO floors (id, block_id, floor_number, floor_name, total_flats) VALUES (?, ?, ?, ?, 4)", [flId, bId, flNum, `Floor ${flNum}`]);

      for (let unit = 1; unit <= 4; unit++) {
        flatCounterA++;
        const flatId = `flat-dhara-${bCode}-${flNum}0${unit}`;
        const flatNum = `${flNum}0${unit}`;
        const fType = flNum === 4 && bCode === "BLK-D" ? "Penthouse" : (unit <= 2 ? "3BHK" : "2BHK");
        const sqft = fType === "Penthouse" ? 2400.0 : (fType === "3BHK" ? 1850.0 : 1420.0);
        const carpet = sqft * 0.78;
        const status = flatCounterA <= 10 ? "OWNER_OCCUPIED" : (flatCounterA <= 18 ? "TENANT_OCCUPIED" : "VACANT");
        const parking = `P1-${bCode.slice(-1)}${flNum}0${unit}`;

        await query.run(`
          INSERT INTO flats (id, floor_id, flat_number, flat_type, built_up_area_sqft, carpet_area_sqft, occupancy_status, parking_slot_numbers)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [flatId, flId, flatNum, fType, sqft, carpet, status, parking]);
      }
    }
  }

  // 7. Seed Blocks, Floors, Flats for Dharshini B
  const blocksB = [
    ["blk-dharb-1", "Block Alpha", "BLK-1", 2],
    ["blk-dharb-2", "Block Beta", "BLK-2", 2]
  ];

  for (const [bId, bName, bCode, floorsCount] of blocksB) {
    await query.run("INSERT INTO blocks (id, venture_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)", [bId, venBId, bName, bCode, floorsCount]);

    for (let flNum = 1; flNum <= floorsCount; flNum++) {
      const flId = `fl-${bId}-${flNum}`;
      await query.run("INSERT INTO floors (id, block_id, floor_number, floor_name, total_flats) VALUES (?, ?, ?, ?, 4)", [flId, bId, flNum, `Floor ${flNum}`]);

      for (let unit = 1; unit <= 4; unit++) {
        const flatId = `flat-dharb-${bCode}-${flNum}0${unit}`;
        const flatNum = `${flNum}0${unit}`;
        const fType = unit <= 2 ? "2BHK" : "1BHK";
        const sqft = fType === "2BHK" ? 1250.0 : 850.0;
        const carpet = sqft * 0.75;
        const status = unit === 1 ? "OWNER_OCCUPIED" : "VACANT";
        const parking = `PB-${bCode.slice(-1)}${flNum}0${unit}`;

        await query.run(`
          INSERT INTO flats (id, floor_id, flat_number, flat_type, built_up_area_sqft, carpet_area_sqft, occupancy_status, parking_slot_numbers)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [flatId, flId, flatNum, fType, sqft, carpet, status, parking]);
      }
    }
  }

  // 8. Seed Users
  const users = [
    ["usr-super-admin", "superadmin@urbannest.com", "Dharshini Manikandan (Super Admin)", "+91 99000 00001"],
    ["usr-admin-a", "admin.a@urbannest.com", "Sunita Reddy (Venture Admin A)", "+91 99000 00002"],
    ["usr-admin-b", "admin.b@urbannest.com", "Kiran Verma (Venture Admin B)", "+91 99000 00003"],
    ["usr-block-mgr", "blockmgr.a@urbannest.com", "Suresh Nair (Block Mgr Tower 1)", "+91 99000 00004"],
    ["usr-floor-mgr", "floormgr.a1@urbannest.com", "Ramesh Joshi (Floor Mgr 1st Floor)", "+91 99000 00005"],
    ["usr-owner-rajesh", "owner.rajesh@urbannest.com", "Rajesh Kumar (Multi-Property Owner)", "+91 98765 43210"],
    ["usr-owner-priya", "owner.priya@urbannest.com", "Priya Sharma (Owner Flat 102)", "+91 98765 43211"],
    ["usr-owner-amit", "owner.amit@urbannest.com", "Amit Patel (Owner Dharshini B)", "+91 98765 43212"]
  ];

  for (const [uId, email, name, phone] of users) {
    await query.run("INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?)", [uId, email, passwordHash, name, phone]);
  }

  // 9. Role Assignments
  const assignments = [
    ["asgn-1", "usr-super-admin", "role-super-admin", null, null, null],
    ["asgn-2", "usr-admin-a", "role-venture-admin", venAId, null, null],
    ["asgn-3", "usr-admin-b", "role-venture-admin", venBId, null, null],
    ["asgn-4", "usr-block-mgr", "role-block-manager", venAId, "blk-dhara-a", null],
    ["asgn-5", "usr-floor-mgr", "role-floor-manager", venAId, "blk-dhara-a", "fl-blk-dhara-a-1"],
    ["asgn-6", "usr-owner-rajesh", "role-owner", venAId, null, null],
    ["asgn-7", "usr-owner-priya", "role-owner", venAId, null, null],
    ["asgn-8", "usr-owner-amit", "role-owner", venBId, null, null]
  ];

  for (const [id, uId, rId, vId, bId, fId] of assignments) {
    await query.run("INSERT INTO user_role_assignments (id, user_id, role_id, venture_id, block_id, floor_id) VALUES (?, ?, ?, ?, ?, ?)", [id, uId, rId, vId, bId, fId]);
  }

  // 10. Seed Unique Owners
  const owners = [
    ["own-rajesh", "usr-owner-rajesh", "Rajesh Kumar", "rajesh.k@example.com", "+91 98765 43210", "AADHAAR", "XXXX-XXXX-1234"],
    ["own-priya", "usr-owner-priya", "Priya Sharma", "priya.s@example.com", "+91 98765 43211", "PAN", "ABCDE1234F"],
    ["own-amit", "usr-owner-amit", "Amit Patel", "amit.p@example.com", "+91 98765 43212", "AADHAAR", "XXXX-XXXX-5678"],
    ["own-sneha", null, "Sneha Reddy", "sneha.r@example.com", "+91 98765 43213", "PASSPORT", "Z1234567"],
    ["own-vikram", null, "Vikram Malhotra", "vikram.m@example.com", "+91 98765 43214", "AADHAAR", "XXXX-XXXX-9999"]
  ];

  for (const [oId, uId, name, email, phone, idType, idNum] of owners) {
    await query.run("INSERT INTO owners (id, user_id, full_name, email, phone, national_id_type, national_id_number) VALUES (?, ?, ?, ?, ?, ?, ?)", [oId, uId, name, email, phone, idType, idNum]);
  }

  // Ownership Mappings
  await query.run("INSERT INTO flat_ownerships (id, flat_id, owner_id, ownership_percentage, deed_reference_number, is_primary_owner) VALUES ('fo-1', 'flat-dhara-BLK-A-101', 'own-rajesh', 100.0, 'DEED-DHAR-A-101-2024', 1)");
  await query.run("INSERT INTO flat_ownerships (id, flat_id, owner_id, ownership_percentage, deed_reference_number, is_primary_owner) VALUES ('fo-2', 'flat-dharb-BLK-1-101', 'own-rajesh', 100.0, 'DEED-DHAR-B-101-2025', 1)");
  await query.run("INSERT INTO flat_ownerships (id, flat_id, owner_id, ownership_percentage, deed_reference_number, is_primary_owner) VALUES ('fo-3', 'flat-dhara-BLK-A-102', 'own-priya', 100.0, 'DEED-DHAR-A-102-2024', 1)");
  await query.run("INSERT INTO flat_ownerships (id, flat_id, owner_id, ownership_percentage, deed_reference_number, is_primary_owner) VALUES ('fo-4', 'flat-dharb-BLK-1-201', 'own-amit', 100.0, 'DEED-DHAR-B-201-2025', 1)");
  await query.run("INSERT INTO flat_ownerships (id, flat_id, owner_id, ownership_percentage, deed_reference_number, is_primary_owner) VALUES ('fo-5', 'flat-dhara-BLK-A-103', 'own-sneha', 100.0, 'DEED-DHAR-A-103-2024', 1)");

  // 11. Seed Amenity Bookings
  const todayStr = new Date().toISOString().split('T')[0];
  await query.run("INSERT INTO amenity_bookings (id, venture_amenity_id, user_id, flat_id, booking_date, start_time, end_time, attendee_count, status, qr_pass_code) VALUES ('bk-001', 'va-dhara-pool', 'usr-owner-rajesh', 'flat-dhara-BLK-A-101', ?, '07:00', '08:00', 2, 'CONFIRMED', 'PASS-DHAR-POOL-001')", [todayStr]);
  await query.run("INSERT INTO amenity_bookings (id, venture_amenity_id, user_id, flat_id, booking_date, start_time, end_time, attendee_count, status, qr_pass_code) VALUES ('bk-002', 'va-dhara-gym', 'usr-owner-priya', 'flat-dhara-BLK-A-102', ?, '18:00', '19:00', 1, 'CONFIRMED', 'PASS-DHAR-GYM-002')", [todayStr]);

  // 12. Seed Maintenance Invoices
  await query.run("INSERT INTO maintenance_invoices (id, flat_id, invoice_number, billing_month, base_amount, total_amount, status, due_date, paid_date, payment_method) VALUES ('inv-001', 'flat-dhara-BLK-A-101', 'INV-DHAR-A-101-202609', '2026-09', 7400.0, 7400.0, 'PAID', '2026-09-25', '2026-09-05', 'UPI')");
  await query.run("INSERT INTO maintenance_invoices (id, flat_id, invoice_number, billing_month, base_amount, total_amount, status, due_date) VALUES ('inv-002', 'flat-dhara-BLK-A-102', 'INV-DHAR-A-102-202609', '2026-09', 5680.0, 5680.0, 'PENDING', '2026-09-30')");
  await query.run("INSERT INTO maintenance_invoices (id, flat_id, invoice_number, billing_month, base_amount, total_amount, status, due_date) VALUES ('inv-003', 'flat-dharb-BLK-1-101', 'INV-DHAR-B-101-202609', '2026-09', 3750.0, 3750.0, 'PENDING', '2026-09-30')");

  // 13. Seed Helpdesk Tickets with SLA
  const now = new Date();
  const sla1 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const sla2 = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();

  await query.run(`
    INSERT INTO helpdesk_tickets (id, flat_id, floor_id, user_id, title, description, category, priority, status, assigned_to_role, sla_hours, sla_deadline, escalation_level, is_escalated)
    VALUES ('tkt-001', 'flat-dhara-BLK-A-101', 'fl-blk-dhara-a-1', 'usr-owner-rajesh', 'Elevator L-2 Door Sensor Glitch', 'The elevator door on 1st Floor pauses for 10 seconds before closing.', 'ELEVATOR', 'HIGH', 'IN_PROGRESS', 'FLOOR_MANAGER', 4, ?, 0, 0)
  `, [sla1]);

  await query.run(`
    INSERT INTO helpdesk_tickets (id, flat_id, floor_id, user_id, title, description, category, priority, status, assigned_to_role, sla_hours, sla_deadline, escalation_level, is_escalated)
    VALUES ('tkt-002', 'flat-dhara-BLK-A-102', 'fl-blk-dhara-a-1', 'usr-owner-priya', 'Corridor Lighting Flickering', 'LED light outside Flat 102 flickers in the evening.', 'ELECTRICAL', 'MEDIUM', 'OPEN', 'FLOOR_MANAGER', 12, ?, 0, 0)
  `, [sla2]);

  await seedEnterpriseAdditions();

  console.log("Database seeded successfully with Real-Time PropTech Enterprise Data!");
}

export async function seedEnterpriseAdditions() {
  const venA = await query.get("SELECT id FROM ventures WHERE code = 'DHAR-A'");
  const venB = await query.get("SELECT id FROM ventures WHERE code = 'DHAR-B'");
  const venAId = venA ? venA.id : 'ven-dharshini-a';
  const venBId = venB ? venB.id : 'ven-dharshini-b';
  const now = new Date();

  // 14. Seed Smart Sub-Meters
  const allFlats = await query.all("SELECT id, flat_number FROM flats");
  for (const flat of allFlats) {
    // Electricity meter
    await query.run(`
      INSERT OR IGNORE INTO smart_meters (id, flat_id, meter_type, meter_serial, current_reading, unit_type, rate_per_unit, status)
      VALUES (?, ?, 'ELECTRICITY', ?, ?, 'kWh', 7.50, 'ONLINE')
    `, [`sm-elec-${flat.id}`, flat.id, `EM-${flat.flat_number}-2026`, 340.5 + (Math.random() * 120)]);

    // Water meter
    await query.run(`
      INSERT OR IGNORE INTO smart_meters (id, flat_id, meter_type, meter_serial, current_reading, unit_type, rate_per_unit, status)
      VALUES (?, ?, 'WATER', ?, ?, 'Liters', 0.04, 'ONLINE')
    `, [`sm-water-${flat.id}`, flat.id, `WM-${flat.flat_number}-2026`, 12500 + (Math.random() * 4000)]);

    // DG Backup meter
    await query.run(`
      INSERT OR IGNORE INTO smart_meters (id, flat_id, meter_type, meter_serial, current_reading, unit_type, rate_per_unit, status)
      VALUES (?, ?, 'DG_BACKUP', ?, ?, 'kWh', 18.00, 'ONLINE')
    `, [`sm-dg-${flat.id}`, flat.id, `DG-${flat.flat_number}-2026`, 28.0 + (Math.random() * 15)]);
  }

  // 15. Seed IoT Infrastructure Sensors
  const sensors = [
    // Dharshini A
    ["iot-dhara-tank", venAId, "WATER_TANK_LEVEL", "Overhead Reservoir Tank Alpha", "Rooftop Tank Tower 1", 82.5, "%", 20.0, 95.0, "NORMAL"],
    ["iot-dhara-stp", venAId, "STP_FLOW", "STP Bio-Reactor Flow Velocity", "Basement Utility Yard", 38.4, "m³/h", 10.0, 60.0, "NORMAL"],
    ["iot-dhara-ev", venAId, "EV_LOAD_KW", "EV Fast Charging Station Grid Load", "Visitor Parking Bay A", 45.2, "kW", 0.0, 60.0, "NORMAL"],
    ["iot-dhara-elev", venAId, "ELEVATOR_HEALTH", "Tower 1 High-Speed Elevator Drive", "Machine Room Core A", 96.8, "% Health", 70.0, 100.0, "NORMAL"],
    ["iot-dhara-fire", venAId, "FIRE_PRESSURE", "Main Sprinkler Header Pressure", "Central Pump Room", 6.8, "bar", 5.0, 8.5, "NORMAL"],

    // Dharshini B
    ["iot-dharb-tank", venBId, "WATER_TANK_LEVEL", "Main Storage Sump Tank", "Ground Sump Garden Block", 68.0, "%", 20.0, 95.0, "NORMAL"],
    ["iot-dharb-solar", venBId, "SOLAR_GRID", "Rooftop Solar PV Generation", "Roof Deck Block Alpha", 22.4, "kW", 0.0, 35.0, "NORMAL"],
    ["iot-dharb-dg", venBId, "DG_BACKUP", "Cummins 250kVA Generator Telemetry", "Power House Yard", 100.0, "% Ready", 80.0, 100.0, "NORMAL"]
  ];

  for (const [sId, vId, type, name, loc, val, unit, minT, maxT, stat] of sensors) {
    await query.run(`
      INSERT OR IGNORE INTO iot_sensors (id, venture_id, sensor_type, sensor_name, location, current_value, unit, min_threshold, max_threshold, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [sId, vId, type, name, loc, val, unit, minT, maxT, stat]);
  }

  // 16. Seed Visitor Passes
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  await query.run(`
    INSERT OR IGNORE INTO visitors (id, flat_id, venture_id, created_by_user_id, visitor_name, visitor_phone, visitor_type, vehicle_number, pass_code, valid_until, status, check_in_time)
    VALUES ('vis-001', 'flat-dhara-BLK-A-101', 'ven-dharshini-a', 'usr-owner-rajesh', 'Sunil Mehta (Guest)', '+91 98111 22334', 'GUEST', 'TS-09-EA-4122', 'PASS-4192', ?, 'CHECKED_IN', ?)
  `, [tomorrow, now.toISOString()]);

  await query.run(`
    INSERT OR IGNORE INTO visitors (id, flat_id, venture_id, created_by_user_id, visitor_name, visitor_phone, visitor_type, vehicle_number, pass_code, valid_until, status)
    VALUES ('vis-002', 'flat-dhara-BLK-A-102', 'ven-dharshini-a', 'usr-owner-priya', 'Amazon Delivery Agent', '+91 98222 33445', 'DELIVERY', 'TS-07-DL-8890', 'PASS-8821', ?, 'APPROVED')
  `, [tomorrow]);

  await query.run(`
    INSERT OR IGNORE INTO visitors (id, flat_id, venture_id, created_by_user_id, visitor_name, visitor_phone, visitor_type, pass_code, valid_until, status, check_in_time, check_out_time)
    VALUES ('vis-003', 'flat-dhara-BLK-A-101', 'ven-dharshini-a', 'usr-owner-rajesh', 'UrbanClap Appliance Tech', '+91 98333 44556', 'SERVICE', 'PASS-1029', ?, 'CHECKED_OUT', ?, ?)
  `, [tomorrow, new Date(now.getTime() - 3600000).toISOString(), now.toISOString()]);

  // 17. Seed Initial Audit Logs
  await query.run(`
    INSERT OR IGNORE INTO audit_logs (id, venture_id, user_id, user_name, user_role, action, resource_type, resource_id, details)
    VALUES 
      ('aud-001', 'ven-dharshini-a', 'usr-super-admin', 'Super Admin', 'SUPER_ADMIN', 'VENTURE_INITIALIZED', 'VENTURE', 'ven-dharshini-a', 'Initialized Dharshini A with 4 blocks and 8 amenities'),
      ('aud-002', 'ven-dharshini-a', 'usr-owner-rajesh', 'Rajesh Kumar', 'OWNER', 'AMENITY_BOOKED', 'AMENITY_BOOKING', 'bk-001', 'Booked Swimming Pool morning slot for 2 attendees'),
      ('aud-003', 'ven-dharshini-a', 'usr-owner-rajesh', 'Rajesh Kumar', 'OWNER', 'VISITOR_PRE_APPROVED', 'VISITOR', 'vis-001', 'Pre-approved Guest pass for Sunil Mehta (PASS-4192)')
  `);
}
