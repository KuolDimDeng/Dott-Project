/**
 * currencyUtils.js
 * 
 * Utility functions for currency handling and pricing calculations
 */

import { getCurrencyForCountry, convertFromUSD, formatCurrency } from '@/services/wiseApiService';
import { getCacheValue } from @/utils/appCache';

// Base pricing in USD
export const BASE_PRICING_USD = {
  basic: { monthly: 0, annual: 0 },
  professional: { monthly: 15, annual: 15 },
  enterprise: { monthly: 45, annual: 45 }
};

/**
 * Calculate pricing for user's country with discounts
 * @param {string} countryCode - User's country code
 * @param {boolean} isDeveloping - Whether country is developing
 * @returns {Promise<Object>} Pricing object with converted amounts
 */
export async function calculatePricingForCountry(countryCode, isDeveloping = false) {
  try {
    const currency = getCurrencyForCountry(countryCode);
    const discount = isDeveloping ? 0.5 : 1.0; // 50% discount for developing countries
    
    const pricing = {
      currency,
      discount: isDeveloping ? 50 : 0,
      basic: {
        monthly: { amount: 0, formatted: formatCurrency(0, currency) },
        annual: { amount: 0, formatted: formatCurrency(0, currency) }
      },
      professional: {
        monthly: {
          amount: await convertFromUSD(BASE_PRICING_USD.professional.monthly * discount, currency),
          formatted: ''
        },
        annual: {
          amount: await convertFromUSD(BASE_PRICING_USD.professional.annual * discount, currency),
          formatted: ''
        }
      },
      enterprise: {
        monthly: {
          amount: await convertFromUSD(BASE_PRICING_USD.enterprise.monthly * discount, currency),
          formatted: ''
        },
        annual: {
          amount: await convertFromUSD(BASE_PRICING_USD.enterprise.annual * discount, currency),
          formatted: ''
        }
      }
    };
    
    // Format the amounts
    pricing.professional.monthly.formatted = formatCurrency(pricing.professional.monthly.amount, currency);
    pricing.professional.annual.formatted = formatCurrency(pricing.professional.annual.amount, currency);
    pricing.enterprise.monthly.formatted = formatCurrency(pricing.enterprise.monthly.amount, currency);
    pricing.enterprise.annual.formatted = formatCurrency(pricing.enterprise.annual.amount, currency);
    
    return pricing;
  } catch (error) {
    console.error('❌ Error calculating pricing for country:', error);
    // Return USD pricing as fallback
    return {
      currency: 'USD',
      discount: 0,
      basic: {
        monthly: { amount: 0, formatted: '$0' },
        annual: { amount: 0, formatted: '$0' }
      },
      professional: {
        monthly: { amount: 15, formatted: '$15' },
        annual: { amount: 15, formatted: '$15' }
      },
      enterprise: {
        monthly: { amount: 45, formatted: '$45' },
        annual: { amount: 45, formatted: '$45' }
      }
    };
  }
}

/**
 * Get user's current pricing based on cached country data
 * @returns {Promise<Object>} Current pricing object
 */
export async function getCurrentUserPricing() {
  const country = await getCacheValue('user_country') || 'US';
  const isDeveloping = await getCacheValue('user_is_developing_country') || false;
  
  console.log('💰 Getting user pricing:', { country, isDeveloping });
  
  return await calculatePricingForCountry(country, isDeveloping);
}

/**
 * Format price with proper currency symbol and discount indication
 * @param {number} amount - Price amount
 * @param {string} currency - Currency code
 * @param {boolean} hasDiscount - Whether price has discount applied
 * @returns {string} Formatted price string
 */
export function formatPriceWithDiscount(amount, currency, hasDiscount = false) {
  const formatted = formatCurrency(amount, currency);
  return hasDiscount ? `${formatted} (50% off)` : formatted;
}
