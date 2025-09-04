# Dott Mobile App (React Native)

## Setup Instructions

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Install Expo CLI globally (if not already installed):
```bash
npm install -g expo-cli
```

3. Start the development server:
```bash
npm start
# or
expo start
```

4. Run on iOS:
```bash
npm run ios
# or
expo start --ios
```

5. Run on Android:
```bash
npm run android
# or
expo start --android
```

## Project Structure

```
DottApp/
├── src/
│   ├── screens/          # All app screens
│   ├── navigation/        # Navigation setup
│   ├── context/          # React Context providers
│   ├── services/         # API services
│   ├── components/       # Reusable components
│   └── assets/           # Images, fonts, etc.
├── App.js                # Main app entry point
└── package.json         # Dependencies
```

## Key Features

- **Authentication**: Login/Register with session management
- **Unified Navigation**: Bottom tabs with conditional Business icon
- **Business Mode**: Full business management features
- **Consumer Mode**: Marketplace and consumer features
- **Real-time Chat**: WhatsApp-style messaging
- **Call Management**: Recent calls and contacts

## API Configuration

The app connects to the Django backend at:
- Staging: `https://dott-api-staging.onrender.com/api`
- Production: `https://api.dottapps.com/api`

Update the API_URL in `src/services/api.js` as needed.

## Building for Production

### iOS:
```bash
expo build:ios
```

### Android:
```bash
expo build:android
```

## Benefits over Capacitor/HTML approach:

1. **Native Performance**: Direct compilation to native code
2. **Hot Reload**: Instant updates during development
3. **Single Codebase**: No file reversion issues
4. **Better UX**: Native animations and gestures
5. **Easier Maintenance**: Standard React patterns
6. **Direct API Integration**: No bridge/WebView overhead