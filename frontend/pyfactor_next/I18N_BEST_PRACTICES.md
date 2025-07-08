# I18N Best Practices for Dott

## Current Issues
1. Hardcoded text in components (Hero.js, Features.js, etc.)
2. All translations in single `common.json` file
3. No type safety for translation keys
4. Mixed approaches (some text translated, some hardcoded)

## Recommended Solution

### 1. Update All Components
Replace ALL hardcoded text with translation keys:

```javascript
// Before
<h1>All-in-one Business Software</h1>

// After
<h1>{t('hero.title')}</h1>
```

### 2. Organize Translations by Feature
Split translations into logical namespaces:

```
/public/locales/
  /en/
    common.json      // Shared: navigation, buttons, common terms
    landing.json     // Landing page: hero, features, pricing
    dashboard.json   // Dashboard specific
    auth.json        // Login, signup, auth messages
  /sw/
    (same structure)
```

### 3. Use Consistent Key Naming
```json
{
  "section": {
    "title": "Title text",
    "subtitle": "Subtitle text",
    "cta": {
      "primary": "Primary button",
      "secondary": "Secondary button"
    },
    "features": {
      "item1": {
        "title": "Feature title",
        "description": "Feature description"
      }
    }
  }
}
```

### 4. Translation Helper Component
Create a wrapper for common patterns:

```javascript
// components/TranslatedText.js
export function TranslatedText({ i18nKey, fallback, ...props }) {
  const { t } = useTranslation();
  return <span {...props}>{t(i18nKey, fallback)}</span>;
}

// Usage
<TranslatedText i18nKey="hero.title" fallback="All-in-one Business Software" />
```

### 5. Currency/Date Formatting
Create locale-aware formatters:

```javascript
// utils/formatters.js
export const formatCurrency = (amount, currency, locale) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Usage
{formatCurrency(15, 'USD', 'en-US')} // $15.00
{formatCurrency(975, 'KES', 'sw-KE')} // KSh 975
```

### 6. Dynamic Content Strategy
For frequently changing content (blog posts, FAQs):
- Store in database with locale field
- Use headless CMS with i18n support
- Keep UI strings in translation files

### 7. Testing Strategy
- Pseudo-localization for testing (`[[ All-in-one Business Software ]]`)
- Visual regression testing for RTL languages
- Translation coverage reports

### 8. Performance Optimization
- Load only required namespaces per page
- Use static generation for translated pages
- Implement proper caching headers

## Implementation Steps

1. **Phase 1**: Update existing components to use translation keys
2. **Phase 2**: Split translations into namespaces
3. **Phase 3**: Add TypeScript definitions
4. **Phase 4**: Implement formatting utilities
5. **Phase 5**: Add translation management workflow

## Translation Management Workflow

1. **Development**: Developers add keys with English fallbacks
2. **Extraction**: Script extracts all keys to translation files
3. **Translation**: 
   - Professional translators for main languages
   - Community contributions for others
   - AI assistance for initial drafts
4. **Review**: Native speakers review translations
5. **Deployment**: Automated checks before deployment

## Tools Recommendations

- **Development**: i18next + react-i18next (current)
- **Type Safety**: i18next-parser for extraction
- **Management**: Phrase or Lokalise for team collaboration
- **Testing**: jest-i18n for unit tests
- **Monitoring**: Track missing translations in production

## Common Pitfalls to Avoid

1. ❌ Concatenating translated strings
2. ❌ Using translations for CSS classes or IDs
3. ❌ Hardcoding plurals or gender assumptions
4. ❌ Forgetting RTL language support
5. ❌ Not considering text expansion (German ~30% longer)
6. ❌ Using flags for languages (use language names)

## Success Metrics

- 0% hardcoded strings in components
- 100% translation coverage before deployment
- < 24hr turnaround for new translations
- Support for 20+ languages with regional variants