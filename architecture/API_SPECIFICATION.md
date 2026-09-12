# Urban Nest: REST API Specification (v1)

Base URL: `http://localhost:5000/api/v1`

---

## 1. Authentication & Session Endpoints (`/auth`)

### 1.1 `POST /auth/register`
Registers a new user account, assigns hierarchical roles, creates owner profile if applicable, and returns an active JWT session token.
- **Request Body**:
```json
{
  "email": "resident.user@urbannest.com",
  "password": "Password@123",
  "full_name": "Kavita Ramachandran",
  "phone": "+91 98765 11223",
  "role": "OWNER",
  "venture_id": "ven-dharshini-a"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr-8a9b2c3d",
    "email": "resident.user@urbannest.com",
    "full_name": "Kavita Ramachandran",
    "phone": "+91 98765 11223",
    "activeRole": "OWNER",
    "activeVentureId": "ven-dharshini-a",
    "activeVentureName": "Dharshini A - Luxury Enclave",
    "availableRoles": [
      {
        "assignment_id": "asgn-12345678",
        "role_name": "OWNER",
        "venture_id": "ven-dharshini-a"
      }
    ]
  }
}
```

### 1.2 `POST /auth/login`
Authenticates a user and returns a JWT along with their assigned roles and accessible ventures.
- **Request Body**:
```json
{
  "email": "admin@urbannest.com",
  "password": "Password@123"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-uuid-001",
      "email": "admin@urbannest.com",
      "fullName": "Executive Super Admin",
      "activeRole": "SUPER_ADMIN",
      "availableRoles": [
        {
          "role": "SUPER_ADMIN",
          "ventureId": null,
          "ventureName": "All Ventures (Dharshini A & B)"
        }
      ]
    }
  }
}
```

### 1.2 `POST /auth/switch-context`
Switches active role or venture scope without re-login.
- **Request Body**:
```json
{
  "role": "VENTURE_ADMIN",
  "ventureId": "ven-dharshini-a"
}
```

---

## 2. Ventures & Communities (`/ventures`)

### 2.1 `GET /ventures`
Lists all ventures (filtered according to caller's RBAC scope).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ven-dharshini-a",
      "name": "Dharshini A - Luxury Enclave",
      "code": "DHAR-A",
      "city": "Hyderabad",
      "totalBlocks": 4,
      "totalFlats": 64,
      "amenityCount": 8,
      "status": "ACTIVE"
    },
    {
      "id": "ven-dharshini-b",
      "name": "Dharshini B - Garden View",
      "code": "DHAR-B",
      "city": "Hyderabad",
      "totalBlocks": 2,
      "totalFlats": 16,
      "amenityCount": 1,
      "status": "ACTIVE"
    }
  ]
}
```

### 2.2 `POST /ventures`
Creates a new venture (Super Admin only).

### 2.3 `GET /ventures/:id/hierarchy`
Returns full drill-down tree: Venture ➔ Blocks ➔ Floors ➔ Flats with ownership summary.

---

## 3. Structural Segregation (`/blocks`, `/floors`, `/flats`)

### 3.1 Blocks
- `GET /blocks?ventureId=ven-dharshini-a` ➔ List blocks in a venture.
- `POST /blocks` ➔ Create a new block with total floors.
- `GET /blocks/:id` ➔ Get block details, floor list, and assigned Block Manager.
- `PUT /blocks/:id/assign-manager` ➔ Assign user as Block Manager.

### 3.2 Floors
- `GET /floors?blockId=blk-tower-1` ➔ List floors in a block.
- `POST /floors` ➔ Add floor.
- `PUT /floors/:id/assign-manager` ➔ Assign Floor Manager.

### 3.3 Flats
- `GET /flats?ventureId=...&blockId=...&floorId=...` ➔ List flats with occupancy & owner data.
- `POST /flats` ➔ Create flat (flatNumber, flatType, builtUpAreaSqft, carpetAreaSqft, parkingSlots).
- `PUT /flats/:id/ownership` ➔ Assign/transfer flat ownership to an owner.
- `PUT /flats/:id/status` ➔ Update occupancy status (`VACANT`, `OWNER_OCCUPIED`, `TENANT_OCCUPIED`).

---

## 4. Owners & Residents (`/owners`, `/residents`)

### 4.1 `GET /owners`
List unique owners, their total flat portfolio across ventures, and KYC status.

### 4.2 `POST /owners`
Registers a unique owner profile.
- **Request Body**:
```json
{
  "fullName": "Rajesh Kumar",
  "email": "rajesh.k@example.com",
  "phone": "+91 98765 43210",
  "nationalIdType": "AADHAAR",
  "nationalIdNumber": "XXXX-XXXX-1234",
  "emergencyContact": "+91 98765 00000"
}
```

### 4.3 `GET /owners/:id/portfolio`
Returns all flats owned by this person across multiple ventures (e.g. Flat 101 in Dharshini A and Flat 101 in Dharshini B).

---

## 5. Amenities & Booking Engine (`/amenities`, `/bookings`)

### 5.1 `GET /amenities/catalog`
List all master catalog amenities (Pool, Gym, Clubhouse, Tennis, EV Charging, Banquet Hall, Spa).

### 5.2 `GET /ventures/:ventureId/amenities`
Get activated amenities for a specific venture (e.g. Dharshini A returns 8 amenities; Dharshini B returns only Pool).

### 5.3 `POST /ventures/:ventureId/amenities`
Enable/configure an amenity for a venture.
- **Request Body**:
```json
{
  "amenityCatalogId": "cat-swimming-pool",
  "customName": "Dharshini Olympic Pool",
  "maxCapacityPerSlot": 15,
  "slotDurationMinutes": 60,
  "openingTime": "06:00",
  "closingTime": "21:00",
  "bookingFee": 0,
  "requiresApproval": false
}
```

### 5.4 `POST /bookings`
Resident books an amenity slot.
- **Request Body**:
```json
{
  "ventureAmenityId": "vam-dharshini-pool",
  "flatId": "flat-101",
  "bookingDate": "2026-09-15",
  "startTime": "07:00",
  "endTime": "08:00",
  "attendeeCount": 2
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "bookingId": "bk-9941",
    "status": "CONFIRMED",
    "qrPassCode": "QR-PASS-9941-XYZ",
    "venture": "Dharshini A",
    "amenity": "Dharshini Olympic Pool",
    "slot": "2026-09-15 07:00 - 08:00",
    "attendees": 2
  }
}
```

---

## 6. Maintenance & Billing (`/maintenance`)

- `POST /maintenance/generate-monthly-invoices` ➔ Auto-generates bills for all flats in a venture based on sq ft rate.
- `GET /maintenance/invoices?flatId=...` ➔ List invoices for a flat.
- `POST /maintenance/invoices/:id/pay` ➔ Simulate payment and update status to `PAID`.

---

## 7. Helpdesk & Floor Issue Escalation (`/tickets`)

- `GET /tickets` ➔ List tickets filtered by Floor Manager / Block Manager / Venture Admin scope.
- `POST /tickets` ➔ Resident raises issue (Plumbing, Electrical, Elevator, Cleanliness).
- `PUT /tickets/:id/resolve` ➔ Floor/Block manager resolves ticket with resolution notes.
