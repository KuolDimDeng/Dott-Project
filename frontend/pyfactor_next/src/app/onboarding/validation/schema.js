// src/app/onboarding/validation/schema.js
import { z } from 'zod';

export const validationSchema = z.object({
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(100, 'Business name cannot exceed 100 characters')
    .trim(),
  industry: z.string().min(1, 'Industry is required').trim(),
  country: z.string().min(2, 'Country is required').trim(),
  legalStructure: z.string().min(1, 'Legal structure is required').trim(),
  dateFounded: z
    .string()
    .min(1, 'Date founded is required')
    .refine(
      (date) => {
        const parsedDate = Date.parse(date);
        const now = Date.now();
        return (
          !isNaN(parsedDate) &&
          parsedDate <= now &&
          parsedDate > new Date('1800-01-01').getTime()
        );
      },
      { message: 'Please enter a valid date between 1800 and today' }
    ),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .trim()
    .regex(
      /^[a-zA-Z\s-']+$/,
      'First name can only contain letters, spaces, hyphens and apostrophes'
    ),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .trim()
    .regex(
      /^[a-zA-Z\s-']+$/,
      'Last name can only contain letters, spaces, hyphens and apostrophes'
    )
}).required();

// Default export
export default validationSchema;