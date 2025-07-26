# Geofence Assignment and Tracking Flow Documentation

## Overview
This document explains the complete flow from assigning employees to geofences to tracking their location during clock-in/out.

## 1. Geofence Assignment Flow

### Frontend: Inline Employee Assignment
- **Location**: `/src/app/Settings/components/sections/GeofencingSettingsSimple.js`
- **Component**: `InlineEmployeeAssignment`
- **Features**:
  - Inline expandable interface (no popup modal)
  - Shows only wage employees (hourly compensation)
  - Real-time save with change detection
  - Visual indicators for unsaved changes

### Backend: Assignment Persistence
- **Endpoint**: `POST /api/hr/geofences/{id}/assign_employees/`
- **Handler**: `GeofenceViewSet.assign_employees()` in `/backend/pyfactor/hr/views.py`
- **Process**:
  1. Deletes all existing assignments for the geofence
  2. Creates new EmployeeGeofence records for selected employees
  3. Stores business_id and assigned_by for audit trail
  4. Returns created assignments and any errors

### Debug Logging Points:
```
🎯 [InlineEmployeeAssignment] - Frontend assignment UI
🎯 [GeofencingSettings] - Geofence list management  
🎯 [assign_employees] - Backend assignment endpoint
🎯 [EmployeeGeofenceViewSet] - Assignment queries
```

## 2. Employee Clock-In/Out Flow

### Desktop Web Flow
- **Component**: `EnhancedClockInOut` in `/src/app/dashboard/components/timesheets/EnhancedClockInOut.js`
- **Process**:
  1. Check location consent status
  2. Get employee ID from session
  3. Call `/api/hr/geofences/check_location/` with location data
  4. Verify if employee is inside required geofences
  5. Allow/block clock action based on geofence rules
  6. Log geofence events for compliance

### Mobile PWA Flow
- **Page**: `/src/app/mobile/timesheet/page.js`
- **Process**:
  1. Load employee geofences on page load
  2. Request location permission when clocking in
  3. Capture GPS coordinates
  4. Check against assigned geofences
  5. Show warnings if outside required areas
  6. Allow override if configured

### Debug Logging Points:
```
🎯 [ClockInOut] - Desktop clock actions
🎯 [MobileTimesheet] - Mobile clock actions
```

## 3. API Endpoints

### Geofence Management
- `GET /api/hr/geofences/` - List all geofences for business
- `POST /api/hr/geofences/` - Create new geofence
- `POST /api/hr/geofences/{id}/assign_employees/` - Assign employees

### Employee Assignments
- `GET /api/hr/employee-geofences/?geofence_id={id}` - Get assignments for geofence
- `GET /api/hr/employee-geofences/?employee_id={id}` - Get geofences for employee

### Location Checking
- `GET /api/hr/geofences/check_location/` - Check if location is within geofences
  - Parameters: latitude, longitude, employee_id
  - Returns: geofence list with is_inside status and distances

## 4. Database Schema

### Geofence Model
```python
- id: UUID
- business_id: UUID (tenant isolation)
- name: String
- location_type: OFFICE/CONSTRUCTION/CLIENT/etc
- center_latitude/longitude: Decimal
- radius_meters: Integer
- require_for_clock_in/out: Boolean
- is_active: Boolean
```

### EmployeeGeofence Model  
```python
- id: UUID
- business_id: UUID (tenant isolation)
- employee: ForeignKey(Employee)
- geofence: ForeignKey(Geofence)
- assigned_by: ForeignKey(User)
- assigned_at: DateTime
- can_clock_in_outside: Boolean (override)
```

## 5. Security & Compliance

### Location Privacy
- Explicit consent required before tracking
- Location data encrypted in transit
- 90-day automatic data retention
- Employee rights to access/delete data

### Audit Trail
- All assignments logged with user and timestamp
- Clock events logged with location data
- Geofence entry/exit events tracked

## 6. Testing the Complete Flow

### Test Scenario:
1. **Create Geofence**:
   - Go to Settings → Geofencing
   - Click "Add Geofence"
   - Draw circle on map, configure rules
   - Save geofence

2. **Assign Employees**:
   - Click employee assignment section under geofence
   - Select wage employees
   - Click "Save Changes"
   - Verify persistence by refreshing page

3. **Employee Clock-In**:
   - Log in as assigned employee
   - Go to timesheet/clock-in page
   - Accept location consent
   - Attempt clock-in
   - Verify geofence validation works

### Debug Commands:
```javascript
// Check assignments in browser console
🎯 [InlineEmployeeAssignment] Assigned employee IDs: [...]

// Backend logs
🎯 [assign_employees] Final assignment count: X
🎯 [EmployeeGeofenceViewSet] Returning X assignments

// Clock-in validation
🎯 [ClockInOut] Inside any geofence: true/false
🎯 [ClockInOut] Can perform action: true/false
```

## 7. Common Issues & Solutions

### Issue: Assignments not persisting
- Check browser console for save errors
- Verify backend logs show assignments created
- Ensure employee has wage compensation type

### Issue: Employee can't clock in despite being assigned
- Verify geofence is active
- Check employee location permissions
- Confirm GPS accuracy is sufficient
- Review geofence radius settings

### Issue: No employees shown in assignment list
- Only wage (hourly) employees appear
- Check employee compensation_type field
- Verify employees are active

## 8. Future Enhancements
- Bulk assignment operations
- Geofence schedule rules (time-based)
- Exception management UI
- Mobile app push notifications
- Offline clock-in queue