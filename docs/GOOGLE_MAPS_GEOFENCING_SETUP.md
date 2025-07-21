# Google Maps Geofencing Setup Documentation

*Last Updated: 2025-07-21*

## Overview

The Dott platform uses Google Maps for the geofencing feature, which allows businesses to define geographic boundaries where employees can clock in and out. This ensures employees are at the correct work location and helps maintain accurate time records.

## Google Maps API Key Configuration

### Current Configuration
- **API Key**: `AIzaSyCC7KgQRztJDsoaQa94zMO7F4Pa-4R73E0`
- **Configuration File**: `/src/config/maps.js`
- **Environment Variable**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Required Google APIs
The following APIs must be enabled in the Google Cloud Console:
1. **Maps JavaScript API** (required)
2. **Geometry Library** (for distance calculations)
3. **Drawing Library** (for circle drawing functionality)

## Implementation Details

### Frontend Components

#### 1. GeofencingSettingsSimple.js
- **Location**: `/src/app/Settings/components/sections/GeofencingSettingsSimple.js`
- **Purpose**: Simplified Google Maps integration for creating geofences
- **Features**:
  - Click on map to place geofence center
  - Adjustable radius (10-1000 meters)
  - Drag and drop circle repositioning
  - Remove circle button
  - Real-time coordinate display

#### 2. Configuration File
```javascript
// /src/config/maps.js
export const GOOGLE_MAPS_CONFIG = {
  apiKey: 'AIzaSyCC7KgQRztJDsoaQa94zMO7F4Pa-4R73E0',
  libraries: ['geometry', 'drawing'],
  defaultCenter: { lat: 37.7749, lng: -122.4194 }, // San Francisco
  defaultZoom: 15
};
```

### Backend API

#### Geofence Model Fields
- `name`: Geofence name (required)
- `geofence_type`: Type of location (office, construction_site, etc.)
- `center_latitude`: Center point latitude
- `center_longitude`: Center point longitude
- `radius`: Radius in meters
- `enforce_clock_in`: Require location for clock in
- `enforce_clock_out`: Require location for clock out
- `auto_clock_out`: Auto clock-out when leaving
- `alert_on_unexpected_exit`: Send alerts for unexpected exits

#### API Endpoints
- **Create Geofence**: `POST /api/hr/geofences/`
- **List Geofences**: `GET /api/hr/geofences/`
- **Update Geofence**: `PATCH /api/hr/geofences/{id}/`
- **Delete Geofence**: `DELETE /api/hr/geofences/{id}/`
- **Assign Employees**: `POST /api/hr/geofences/{id}/assign_employees/`
- **Check Location**: `GET /api/hr/geofences/check_location/`

## User Interface Features

### Creating a Geofence
1. Navigate to Settings → Geofencing (Admin/Owner only)
2. Accept legal compliance requirements
3. Click "Add Geofence" button
4. Fill in the geofence details:
   - Enter a descriptive name
   - Select location type
   - Click on the map to set the center point
   - Adjust radius using the input field or by dragging
   - Configure enforcement rules
5. Click "Create Geofence" to save

### Managing Geofences
- **View**: All active geofences listed with details
- **Edit**: Click edit icon to modify geofence settings
- **Delete**: Click delete icon to remove geofence
- **Remove Circle**: While creating, click "Remove Circle" to clear selection

### Circle Manipulation
- **Place**: Single click on map
- **Move**: Drag the circle to new location
- **Resize**: Drag the circle edge to adjust radius
- **Remove**: Click "Remove Circle" button

## Troubleshooting

### Common Issues

1. **Map Not Displaying**
   - Check if API key is valid
   - Verify Maps JavaScript API is enabled
   - Check browser console for errors

2. **InvalidKeyMapError**
   - API key is invalid or restricted
   - Update key in `/src/config/maps.js`
   - Ensure key has proper permissions

3. **Create Button Not Working**
   - Ensure all required fields are filled
   - Check browser console for API errors
   - Verify backend service is running

### Debug Steps
1. Open browser developer console
2. Look for `[GoogleMaps]` or `[GeofenceSetup]` log entries
3. Check Network tab for API calls to `/api/hr/geofences/`
4. Verify session cookie exists

## Future Enhancements

1. **Multiple Geofences Per Location**
   - Support for complex work sites
   - Nested geofence boundaries

2. **Time-Based Geofences**
   - Different boundaries for different shifts
   - Temporary event locations

3. **Geofence Analytics**
   - Entry/exit reports
   - Time spent in geofenced areas
   - Compliance reporting

## Security Considerations

- API key is public (client-side) but restricted to specific domains
- All geofence data filtered by tenant (business_id)
- Employee location data encrypted and auto-deleted after 90 days
- GDPR-compliant with explicit consent requirements

## Developer Notes

- Google Maps loads asynchronously - always check for `window.google.maps`
- Use refs for map container to avoid React re-render issues
- Portal pattern removed in favor of direct DOM manipulation
- 100ms delay ensures DOM element exists before map initialization