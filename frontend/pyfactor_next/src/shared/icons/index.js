/**
 * Icon Library - Central export for all icons
 * Tree-shakeable imports for optimal bundle size
 */

// Navigation icons
export * from './nav';

// Business icons
export * from './business';

// Finance icons
export * from './finance';

// HR icons
export * from './hr';

// Utility icons
export * from './utility';

// Social icons
export * from './social';

// Convenience grouped exports
export * as NavIcons from './nav';
export * as BusinessIcons from './business';
export * as FinanceIcons from './finance';
export * as HRIcons from './hr';
export * as UtilityIcons from './utility';
export * as SocialIcons from './social';

// Re-export commonly used icons at root level
export { Dashboard, Analytics, Settings, ImportExport } from './nav';
export { Sales, Inventory, Cart, Contacts } from './business';
export { Bank, Wallet, Payments, Tax } from './finance';
export { People, Work, Jobs, Calendar } from './hr';
export { Home, Notification, Receipt } from './utility';
export { InviteFriend, WhatsAppBusiness } from './social';
