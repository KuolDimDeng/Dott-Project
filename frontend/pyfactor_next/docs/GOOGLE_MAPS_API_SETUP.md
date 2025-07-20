# Google Maps API Setup Guide

## Current Issue
The Google Maps API key `AIzaSyDq2UEzOWBrWHgvbXVQfmLHXlpIqWwXGxs` is showing an `InvalidKeyMapError`. This needs to be replaced with a valid API key.

## Steps to Get a Valid Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Either select an existing project or create a new one

3. **Enable the Maps JavaScript API**
   - Go to "APIs & Services" → "Library"
   - Search for "Maps JavaScript API"
   - Click on it and press "Enable"

4. **Enable Additional Required APIs**
   - Also enable "Geometry Library" (for distance calculations)
   - Enable "Drawing Library" (for drawing geofences)

5. **Create an API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API key"
   - Copy the generated API key

6. **Configure API Key Restrictions (Recommended)**
   - Click on the API key you just created
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domains:
     - `https://dottapps.com/*`
     - `https://www.dottapps.com/*`
     - `http://localhost:3000/*` (for development)
   - Under "API restrictions", select "Restrict key"
   - Choose only the APIs you enabled:
     - Maps JavaScript API
     - Geometry Library
     - Drawing Library

7. **Set Up Billing**
   - Google Maps requires a billing account
   - You get $200 free credit monthly
   - Go to "Billing" and set up a payment method

## Update the Configuration

Once you have a valid API key:

1. Update `/src/config/maps.js`:
   ```javascript
   export const GOOGLE_MAPS_CONFIG = {
     apiKey: 'YOUR_NEW_API_KEY_HERE',
     libraries: ['geometry', 'drawing'],
     defaultCenter: { lat: 37.7749, lng: -122.4194 },
     defaultZoom: 15
   };
   ```

2. For production, you should also update the environment variable in `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_NEW_API_KEY_HERE
   ```

## Testing

After updating the API key:
1. Restart the development server
2. Go to Settings → Geofencing
3. Click "Add Geofence"
4. The map should now display without errors

## Troubleshooting

If you still see errors:
- Check that billing is enabled in Google Cloud Console
- Verify all required APIs are enabled
- Ensure the API key has no typos
- Check domain restrictions match your current domain
- Look at browser console for specific error messages

## Cost Considerations

- Google Maps provides $200 free monthly credit
- Geofencing usage is typically low-volume
- Monitor usage in Google Cloud Console to avoid unexpected charges