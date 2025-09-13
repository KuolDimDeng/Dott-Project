# Advertise to Marketplace - Complete Feature Guide
*Last Updated: 2025-09-13*

## Table of Contents
1. [Overview](#overview)
2. [Feature Flow](#feature-flow)
3. [Profile Structure](#profile-structure)
4. [Image Management](#image-management)
5. [API Integration](#api-integration)
6. [Data Persistence](#data-persistence)
7. [Publishing Process](#publishing-process)
8. [Troubleshooting](#troubleshooting)

## Overview

The "Advertise to Marketplace" feature allows businesses to create and manage their marketplace presence. It's accessible from the Business Menu and enables businesses to:
- Create a comprehensive business profile
- Upload logo, banner, and gallery images
- Set operating hours and delivery options
- Publish/unpublish their listing
- Manage visibility in the consumer marketplace

## Feature Flow

### 1. Accessing the Feature
```
Business Menu Tab → Advertise to Marketplace → MarketplaceProfileEditor Screen
```

### 2. Profile Creation Steps

The profile editor uses a tabbed interface with 5 sections:

#### Tab 1: Basic Info
```javascript
{
  businessName: "Restaurant Name",
  businessType: "RESTAURANT_CAFE", // Dropdown selection
  description: "Business description",
  searchTags: ["restaurant", "food", "delivery"] // Tags for search
}
```

#### Tab 2: Contact & Location
```javascript
{
  phone: "+211912345678",
  email: "business@example.com",
  website: "www.example.com",
  whatsapp: "+211912345678",
  address: "123 Main St",
  city: "Juba",
  state: "Central Equatoria",
  country: "SS", // ISO country code
  zipCode: "00211"
}
```

#### Tab 3: Hours & Delivery
```javascript
{
  // Operating Hours
  operatingHours: {
    monday: { open: "09:00", close: "22:00", isClosed: false },
    tuesday: { open: "09:00", close: "22:00", isClosed: false },
    // ... other days
  },

  // Delivery Settings
  deliveryOptions: {
    pickup: true,
    delivery: true,
    shipping: false
  },
  deliveryRadius: 10, // km
  deliveryFee: 5.00,
  minimumOrder: 20.00,
  estimatedDeliveryTime: "30-45 minutes"
}
```

#### Tab 4: Images & Media
```javascript
{
  logoImage: "url_or_base64", // Business logo
  bannerImage: "url_or_base64", // Cover/banner image
  galleryImages: [ // Up to 10 images
    "url_or_base64_1",
    "url_or_base64_2",
    // ...
  ]
}
```

#### Tab 5: Additional Info
```javascript
{
  specialties: ["Italian Cuisine", "Pizza", "Pasta"],
  paymentMethods: ["cash", "card", "mobile_money"],
  amenities: ["wifi", "parking", "outdoor_seating"],
  socialMedia: {
    facebook: "facebook.com/business",
    instagram: "@business",
    twitter: "@business"
  }
}
```

## Profile Structure

### Complete Profile Object
```javascript
const marketplaceProfile = {
  basic: {
    businessName: string,
    businessType: string,
    description: string,
    searchTags: string[]
  },
  contact: {
    phone: string,
    email: string,
    website: string,
    whatsapp: string,
    address: string,
    city: string,
    state: string,
    country: string,
    zipCode: string
  },
  hours: {
    operatingHours: {
      [day]: { open: string, close: string, isClosed: boolean }
    },
    deliveryOptions: {
      pickup: boolean,
      delivery: boolean,
      shipping: boolean
    },
    deliveryRadius: number,
    deliveryFee: number,
    minimumOrder: number,
    estimatedDeliveryTime: string
  },
  visuals: {
    logoImage: string | null,
    bannerImage: string | null,
    galleryImages: string[]
  },
  additional: {
    specialties: string[],
    paymentMethods: string[],
    amenities: string[],
    socialMedia: object
  }
}
```

## Image Management

### Image Selection Flow
1. **Select Image Source**:
   ```javascript
   Alert.alert(
     'Select Image',
     'Choose image source',
     [
       { text: 'Camera', onPress: () => openCamera() },
       { text: 'Gallery', onPress: () => openGallery() },
       { text: 'Cancel', style: 'cancel' }
     ]
   );
   ```

2. **Image Picker Options**:
   ```javascript
   const options = {
     mediaType: 'photo',
     includeBase64: true,
     maxHeight: 2000,
     maxWidth: 2000,
     quality: 0.8
   };
   ```

3. **Image Storage**:
   - Images are converted to base64 for initial storage
   - Backend processes and uploads to Cloudinary
   - Returns permanent URLs for display

### Image Requirements
- **Logo**: Square format recommended (500x500px minimum)
- **Banner**: Landscape format (1200x400px recommended)
- **Gallery**: Up to 10 images, any format
- **File Size**: Max 5MB per image
- **Formats**: JPEG, PNG, WebP

## API Integration

### Loading Existing Profile
```javascript
// GET /api/marketplace/business/my-listing/
const loadBusinessProfile = async () => {
  try {
    const response = await marketplaceApi.getBusinessListing();
    if (response?.data) {
      // Map backend structure to frontend profile
      const profileData = {
        basic: {
          businessName: response.data.business_name,
          businessType: response.data.business_type,
          description: response.data.description,
          searchTags: response.data.search_tags || []
        },
        contact: {
          phone: response.data.phone,
          email: response.data.business_email,
          // ... map other fields
        },
        // ... map other sections
      };
      setProfile(profileData);
      setIsPublished(response.data.is_visible_in_marketplace);
    }
  } catch (error) {
    console.log('No existing profile found');
  }
};
```

### Saving Profile
```javascript
// POST/PATCH /api/marketplace/business/my-listing/
const handleSave = async () => {
  const dataToSend = {
    // Flatten nested structure for backend
    business_name: profile.basic.businessName,
    business_type: profile.basic.businessType,
    description: profile.basic.description,
    search_tags: profile.basic.searchTags,

    // Contact info
    phone: profile.contact.phone,
    business_email: profile.contact.email,
    website: profile.contact.website,
    whatsapp: profile.contact.whatsapp,

    // Location
    address: profile.contact.address,
    city: profile.contact.city,
    state: profile.contact.state,
    country: profile.contact.country,
    postal_code: profile.contact.zipCode,

    // Operating hours
    business_hours: profile.hours.operatingHours,

    // Delivery settings
    delivery_scope: profile.hours.deliveryOptions.delivery ? 'LOCAL' : 'NONE',
    delivery_radius_km: profile.hours.deliveryRadius,
    delivery_fee: profile.hours.deliveryFee,
    minimum_order_amount: profile.hours.minimumOrder,

    // Images
    logo_url: profile.visuals.logoImage,
    cover_image_url: profile.visuals.bannerImage,
    gallery_images: profile.visuals.galleryImages,

    // Additional info
    amenities: profile.additional.amenities,
    payment_methods: profile.additional.paymentMethods,
    social_media_links: profile.additional.socialMedia,

    // Publish status
    is_visible_in_marketplace: isPublished
  };

  await marketplaceApi.updateBusinessListing(dataToSend);
};
```

## Data Persistence

### Backend Model Structure
```python
class BusinessListing(models.Model):
    id = models.UUIDField(primary_key=True)
    business = models.OneToOneField(User, on_delete=models.CASCADE)

    # Basic Info
    business_type = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    search_tags = models.JSONField(default=list)

    # Location
    country = models.CharField(max_length=2)
    city = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    latitude = models.FloatField(null=True)
    longitude = models.FloatField(null=True)

    # Hours & Delivery
    business_hours = models.JSONField(default=dict)
    delivery_scope = models.CharField(max_length=20)
    delivery_radius_km = models.IntegerField(default=5)

    # Images
    logo_url = models.URLField(blank=True)
    cover_image_url = models.URLField(blank=True)
    gallery_images = models.JSONField(default=list)

    # Status
    is_visible_in_marketplace = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    is_open_now = models.BooleanField(default=True)
```

### Data Flow
1. **User Updates Profile** → Frontend state (React Native)
2. **User Clicks Save** → API call to backend
3. **Backend Processes** → Validates, stores in PostgreSQL
4. **Image Upload** → Cloudinary (async)
5. **Response** → Updated listing returned to frontend
6. **Frontend Updates** → State refreshed with saved data

## Publishing Process

### Publishing Requirements
1. **Minimum Required Fields**:
   - Business name
   - Business type
   - City and country
   - At least one contact method (phone or email)
   - Description (minimum 50 characters)

2. **Publishing Toggle**:
   ```javascript
   const handlePublishToggle = async () => {
     const newStatus = !isPublished;
     setIsPublished(newStatus);

     // Auto-save when publishing status changes
     await handleSave();

     if (newStatus) {
       Alert.alert('Success', 'Your business is now visible in the marketplace!');
     } else {
       Alert.alert('Success', 'Your business has been hidden from the marketplace.');
     }
   };
   ```

### Visibility Rules
- **Published (is_visible_in_marketplace = true)**:
  - Appears in consumer marketplace search
  - Accessible via public API endpoints
  - Can receive orders and inquiries

- **Unpublished (is_visible_in_marketplace = false)**:
  - Not visible to consumers
  - API returns 404 for public endpoints
  - Profile data is preserved

## Troubleshooting

### Common Issues

#### 1. Profile Not Saving
**Symptom**: Save button clicked but data not persisting

**Solution**:
```javascript
// Check API response
const response = await marketplaceApi.updateBusinessListing(data);
console.log('Save response:', response);

// Verify data structure matches backend expectations
console.log('Data being sent:', JSON.stringify(dataToSend, null, 2));
```

#### 2. Images Not Uploading
**Symptom**: Images selected but not appearing after save

**Causes**:
- Image too large (>5MB)
- Invalid format
- Network timeout

**Solution**:
```javascript
// Compress image before sending
const compressImage = async (base64) => {
  // Implement compression logic
  return compressedBase64;
};
```

#### 3. Profile Not Loading
**Symptom**: Existing profile data not showing when screen opens

**Debug Steps**:
```javascript
// 1. Check if API call succeeds
console.log('Loading profile...');
const response = await marketplaceApi.getBusinessListing();
console.log('API Response:', response);

// 2. Verify data mapping
console.log('Mapped profile:', profileData);

// 3. Check state update
console.log('Profile state after load:', profile);
```

### Backend Debugging

#### Check Business Listing
```sql
-- Find user's listing
SELECT
    bl.id,
    bl.business_id,
    u.email,
    bl.is_visible_in_marketplace,
    bl.description,
    bl.logo_url
FROM marketplace_businesslisting bl
JOIN custom_auth_user u ON u.id = bl.business_id
WHERE u.email = 'user@example.com';
```

#### Update Listing Manually
```sql
-- Make business visible
UPDATE marketplace_businesslisting
SET is_visible_in_marketplace = true
WHERE business_id = (
    SELECT id FROM custom_auth_user
    WHERE email = 'user@example.com'
);
```

## Best Practices

### 1. Data Validation
```javascript
const validateProfile = () => {
  const errors = [];

  if (!profile.basic.businessName) {
    errors.push('Business name is required');
  }

  if (!profile.contact.city || !profile.contact.country) {
    errors.push('City and country are required');
  }

  if (profile.basic.description?.length < 50) {
    errors.push('Description must be at least 50 characters');
  }

  return errors;
};
```

### 2. Auto-Save Draft
```javascript
// Save draft every 30 seconds if changes detected
useEffect(() => {
  const interval = setInterval(() => {
    if (hasUnsavedChanges) {
      saveDraft();
    }
  }, 30000);

  return () => clearInterval(interval);
}, [hasUnsavedChanges]);
```

### 3. Image Optimization
```javascript
const optimizeImage = (imageUri) => {
  return ImageResizer.createResizedImage(
    imageUri,
    1200, // maxWidth
    1200, // maxHeight
    'JPEG',
    80, // quality
    0, // rotation
    null // outputPath
  );
};
```

## Related Files

### Frontend (React Native)
- `/mobile/DottAppNative/src/screens/business/MarketplaceProfileEditor.js`
- `/mobile/DottAppNative/src/services/marketplaceApi.js`
- `/mobile/DottAppNative/src/screens/BusinessMenuScreen.js`

### Backend (Django)
- `/backend/pyfactor/marketplace/views.py`
- `/backend/pyfactor/marketplace/models.py`
- `/backend/pyfactor/marketplace/serializers.py`
- `/backend/pyfactor/marketplace/urls.py`

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/business/my-listing/` | GET | Get current business listing |
| `/api/marketplace/business/my-listing/` | POST | Create/update business listing |
| `/api/marketplace/business/listing/` | GET | Get listing (mobile) |
| `/api/marketplace/business/listing/` | PATCH | Update listing (mobile) |
| `/api/marketplace/business/{id}/public/` | GET | Public view of business |
| `/api/marketplace/business/operating-hours/` | PATCH | Update operating hours |

## Testing Checklist

- [ ] Can create new marketplace profile
- [ ] Profile data persists after save
- [ ] Images upload and display correctly
- [ ] Publishing toggle works
- [ ] Published business appears in consumer search
- [ ] Unpublished business returns 404
- [ ] Profile loads correctly on return visit
- [ ] All tabs save data properly
- [ ] Validation messages appear for required fields
- [ ] Operating hours update correctly