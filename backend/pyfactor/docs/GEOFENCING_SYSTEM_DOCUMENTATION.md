# Geofencing System Documentation
*Complete Implementation Guide - Updated: 2025-07-17*

## Overview
This document describes the comprehensive geofencing system in the Dott application, including location-based time tracking, legal compliance, and privacy protection features.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Legal Compliance](#legal-compliance)
3. [Geofencing Setup](#geofencing-setup)
4. [Employee Experience](#employee-experience)
5. [Technical Implementation](#technical-implementation)
6. [Privacy & Security](#privacy--security)
7. [API Documentation](#api-documentation)
8. [Mobile & PWA Support](#mobile--pwa-support)
9. [Troubleshooting](#troubleshooting)

## System Architecture

### Core Components
1. **Geofencing Settings** - Admin interface for location management
2. **Enhanced Clock In/Out** - Location-aware time tracking
3. **Location Consent System** - GDPR-compliant privacy controls
4. **Audit & Compliance** - Event logging and reporting
5. **Mobile Integration** - PWA-compatible location services

### Data Flow
```
Admin Setup → Geofence Creation → Employee Consent → Location Validation → Clock In/Out → Event Logging
```

## Legal Compliance

### Employer Responsibilities
**MANDATORY REQUIREMENTS:**
- **Employee Notification**: Must inform ALL employees about location tracking before implementation
- **Explicit Consent**: Employees must provide written consent for location tracking
- **Legitimate Business Use**: Location data can ONLY be used for work-related purposes
- **Privacy Law Compliance**: Must comply with GDPR, CCPA, and applicable local privacy laws
- **Data Access Rights**: Must provide employees access to their location data upon request
- **Limited Scope**: Location tracking MUST be limited to work hours and work locations only

### Employee Rights
**PROTECTED RIGHTS:**
- **Right to Opt-Out**: Can decline location tracking (may affect clock in/out capabilities)
- **Right to Know**: Must know what data is collected and how it's used
- **Right to Access**: Can request access to all their location data
- **Right to Deletion**: Can request deletion of their location data
- **Right to Portability**: Can request location data in portable format
- **Non-Discrimination**: Cannot be discriminated against based on location preferences

### Data Protection Requirements
**SECURITY MEASURES:**
- **Encryption**: All location data encrypted in transit and at rest
- **Access Control**: Access restricted to authorized personnel only
- **Data Retention**: Automatic deletion after 90 days
- **Audit Trail**: Complete logging of all location-related activities
- **Scope Limitation**: No personal tracking outside work hours
- **Breach Notification**: Immediate notification of any data breaches

## Geofencing Setup

### Admin Interface
**Location**: Settings → Geofencing (Admin/Owner only)

### Setup Process
1. **Legal Compliance Acceptance**
   - Review employer responsibilities
   - Acknowledge employee rights
   - Accept legal obligations
   - Confirm GDPR compliance

2. **Geofence Creation**
   - Interactive Google Maps interface
   - Click-to-place geofence centers
   - Adjustable radius (10-1000 meters)
   - Visual feedback with colored circles

3. **Geofence Configuration**
   ```javascript
   {
     name: "Main Office",
     location_type: "office",
     radius: 100,
     require_for_clock_in: true,
     require_for_clock_out: true,
     auto_clock_out_on_exit: false,
     alert_on_unexpected_exit: true,
     is_active: true
   }
   ```

### Location Types
- **Office**: Standard office locations
- **Construction Site**: Construction and building sites
- **Client Location**: Client premises and facilities
- **Delivery Zone**: Delivery and pickup areas
- **Field Location**: Remote work locations
- **Custom**: User-defined location types

### Geofence Rules
- **Clock In Required**: Employee must be within geofence to clock in
- **Clock Out Required**: Employee must be within geofence to clock out
- **Auto Clock Out**: Automatically clock out when employee leaves geofence
- **Exit Alerts**: Send alerts when employee leaves during work hours

## Employee Experience

### Location Consent Flow
1. **First Clock In Attempt**
   - System detects no location consent
   - Displays comprehensive consent modal
   - Explains data collection and usage
   - Provides accept/decline options

2. **Consent Modal Content**
   ```
   What location data is collected:
   - GPS coordinates during clock in/out
   - Location accuracy information
   - Address information (if available)
   - Distance from work locations
   
   How data is used:
   - Verify presence at authorized work locations
   - Generate accurate time records
   - Ensure work location policy compliance
   - Improve workplace safety and security
   
   Your rights:
   - Decline location tracking
   - Access and delete location data
   - Work-hours only tracking
   - Encrypted secure storage
   - 90-day automatic deletion
   ```

### Clock In/Out Process
1. **Location Detection**
   - System requests location permission
   - GPS coordinates captured with high accuracy
   - Location accuracy and address resolved

2. **Geofence Validation**
   - Real-time check against active geofences
   - Distance calculations from geofence centers
   - Status indicators (inside/outside work areas)

3. **Action Enforcement**
   - Clock in/out blocked if outside required areas
   - Clear error messages with geofence information
   - Distance display showing how far from work area

### Status Indicators
- **🟢 Inside Work Area**: Employee within required geofence
- **🔴 Outside Work Area**: Employee outside required geofence
- **🟡 Location Unknown**: Unable to determine location
- **⚪ No Requirements**: No geofence restrictions active

## Technical Implementation

### Frontend Components

#### GeofencingSettings.js
**Purpose**: Admin interface for geofence management
**Features**:
- Google Maps integration with interactive setup
- Legal compliance modal with employer responsibilities
- Geofence CRUD operations with real-time validation
- Radius controls with visual feedback
- Location type selection and rule configuration

#### EnhancedClockInOut.js
**Purpose**: Location-aware time tracking interface
**Features**:
- Real-time geofence validation
- Location consent management
- Geofence status indicators
- Distance calculations and display
- Automatic event logging

#### LocationConsentModal
**Purpose**: GDPR-compliant consent collection
**Features**:
- Comprehensive privacy information
- Granular consent options
- Legal compliance explanations
- Accept/decline functionality

### Backend Models

#### Geofence Model
```python
class Geofence(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    location_type = models.CharField(max_length=50)
    center_latitude = models.DecimalField(max_digits=10, decimal_places=8)
    center_longitude = models.DecimalField(max_digits=11, decimal_places=8)
    radius = models.IntegerField()  # in meters
    require_for_clock_in = models.BooleanField(default=True)
    require_for_clock_out = models.BooleanField(default=True)
    auto_clock_out_on_exit = models.BooleanField(default=False)
    alert_on_unexpected_exit = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### EmployeeLocationConsent Model
```python
class EmployeeLocationConsent(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    clock_in_out_tracking = models.BooleanField(default=False)
    random_location_checks = models.BooleanField(default=False)
    continuous_tracking = models.BooleanField(default=False)
    consent_given_at = models.DateTimeField()
    consent_withdrawn_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    privacy_policy_version = models.CharField(max_length=20)
```

#### GeofenceEvent Model
```python
class GeofenceEvent(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    geofence = models.ForeignKey(Geofence, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=20)  # enter, exit, clock_in, clock_out, violation
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    distance_from_center = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict)
```

## Privacy & Security

### Data Protection Measures
1. **Encryption**: All location data encrypted with AES-256
2. **Access Control**: Role-based access with audit logging
3. **Data Minimization**: Only collect necessary location data
4. **Purpose Limitation**: Location data used only for stated purposes
5. **Retention Limits**: Automatic deletion after 90 days
6. **Breach Detection**: Real-time monitoring for unauthorized access

### Privacy Controls
1. **Granular Consent**: Separate consent for different tracking types
2. **Consent Withdrawal**: One-click consent withdrawal
3. **Data Export**: Employee can export their location data
4. **Data Deletion**: Immediate deletion upon request
5. **Transparency**: Clear information about data collection

### Compliance Features
1. **GDPR Compliance**: Full compliance with EU privacy regulations
2. **CCPA Compliance**: California Consumer Privacy Act compliance
3. **Audit Trail**: Complete logging of all location activities
4. **Right to Access**: Employee portal for data access
5. **Data Portability**: Export location data in standard formats

## API Documentation

### Geofence Management
```
GET    /api/hr/geofences/           - List all geofences
POST   /api/hr/geofences/           - Create new geofence
GET    /api/hr/geofences/{id}/      - Get geofence details
PUT    /api/hr/geofences/{id}/      - Update geofence
DELETE /api/hr/geofences/{id}/      - Delete geofence
```

### Location Consent
```
GET    /api/hr/location-consents/check/me/    - Check employee consent status
POST   /api/hr/location-consents/            - Create/update consent
GET    /api/hr/location-consents/            - List consents (admin)
DELETE /api/hr/location-consents/{id}/       - Withdraw consent
```

### Geofence Events
```
POST   /api/hr/geofence-events/check/        - Check geofence status
POST   /api/hr/geofence-events/log_event/    - Log geofence event
GET    /api/hr/geofence-events/             - List events (admin)
```

### Location Logs
```
GET    /api/hr/location-logs/                - List location logs
POST   /api/hr/location-logs/               - Create location log
GET    /api/hr/location-logs/{id}/          - Get location log details
```

## Mobile & PWA Support

### Native Features
1. **GPS Integration**: High-accuracy location services
2. **Permission Management**: Browser location permissions
3. **Offline Capability**: Cache location data for offline use
4. **Background Sync**: Sync location data when online
5. **Push Notifications**: Location-based alerts

### Mobile Optimizations
1. **Touch-Friendly Interface**: Optimized for mobile interaction
2. **Responsive Design**: Works on all screen sizes
3. **Battery Optimization**: Efficient location tracking
4. **Network Awareness**: Adapts to network conditions
5. **Native App Feel**: PWA with native-like experience

### Location Services
```javascript
// High-accuracy location capture
navigator.geolocation.getCurrentPosition(
  (position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
    validateGeofence(location);
  },
  (error) => handleLocationError(error),
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000
  }
);
```

## Troubleshooting

### Common Issues

#### Location Permission Denied
**Symptoms**: Unable to get location, permission errors
**Solutions**:
1. Check browser location permissions
2. Ensure HTTPS connection
3. Clear browser cache and cookies
4. Try different browser

#### Geofence Not Working
**Symptoms**: Clock in/out not blocked outside geofence
**Solutions**:
1. Verify geofence is active
2. Check geofence radius settings
3. Confirm location accuracy
4. Review geofence rules configuration

#### Consent Modal Not Appearing
**Symptoms**: No consent dialog for new employees
**Solutions**:
1. Check employee consent status in database
2. Verify consent modal component loading
3. Clear browser localStorage
4. Test with different user account

### Performance Optimization
1. **Geofence Caching**: Cache active geofences locally
2. **Location Throttling**: Limit location requests frequency
3. **Batch Processing**: Process multiple location events together
4. **Database Indexing**: Optimize geofence queries
5. **Memory Management**: Clean up unused location data

### Monitoring & Alerts
1. **Location Accuracy Monitoring**: Track GPS accuracy levels
2. **Geofence Performance**: Monitor validation response times
3. **Consent Compliance**: Track consent rates and withdrawals
4. **Error Logging**: Comprehensive error tracking
5. **Usage Analytics**: Monitor geofencing adoption

## Legal Disclaimers

### Important Legal Notes
1. **Legal Advice**: This system provides technical capabilities but not legal advice
2. **Jurisdiction Compliance**: Ensure compliance with local privacy laws
3. **Employment Law**: Consult employment lawyers for workplace policies
4. **Data Protection**: Regularly review and update privacy policies
5. **Audit Requirements**: Maintain comprehensive audit logs

### Recommended Policies
1. **Employee Handbook**: Include geofencing policies
2. **Privacy Policy**: Update with location tracking details
3. **Consent Forms**: Maintain signed consent documentation
4. **Training Materials**: Train managers on legal requirements
5. **Regular Reviews**: Periodically review compliance requirements

This comprehensive geofencing system provides enterprise-grade location tracking with full legal compliance, making it suitable for industries requiring strict time and attendance verification while respecting employee privacy rights.