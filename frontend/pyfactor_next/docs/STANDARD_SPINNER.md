# Standard Spinner Component Documentation

## Overview

The `StandardSpinner` component provides a consistent, accessible loading indicator across the entire Dott application. It implements the official Tailwind CSS spinner pattern with proper accessibility features.

## Component Location

```
/src/components/ui/StandardSpinner.js
```

## Features

- ✅ SVG-based animation using Tailwind's `animate-spin`
- ✅ Fully accessible with `role="status"` and screen reader text
- ✅ Multiple size variants
- ✅ Dark mode support
- ✅ Helper components for common use cases
- ✅ Consistent design across all loading states

## Usage

### Basic Import

```javascript
import StandardSpinner from '@/components/ui/StandardSpinner';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';
```

### Basic Spinner

```jsx
// Default size spinner
<StandardSpinner />

// With custom size
<StandardSpinner size="large" />

// Without screen reader text
<StandardSpinner showText={false} />
```

### Centered Loading State

```jsx
// For page/section loading
{isLoading ? (
  <CenteredSpinner size="large" minHeight="h-64" />
) : (
  <YourContent />
)}

// With custom loading text
<CenteredSpinner text="Loading products..." showText={true} />
```

### Button Loading State

```jsx
<button disabled={isSubmitting}>
  {isSubmitting ? (
    <ButtonSpinner text="Saving..." />
  ) : (
    'Save Changes'
  )}
</button>
```

## Props

### StandardSpinner

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| size | string | 'default' | Size variant: 'small', 'default', 'large', 'xl' |
| className | string | '' | Additional CSS classes |
| text | string | 'Loading...' | Screen reader text |
| showText | boolean | true | Whether to include screen reader text |

### CenteredSpinner

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| size | string | 'default' | Size variant for the spinner |
| text | string | 'Loading...' | Text to display below spinner |
| showText | boolean | false | Whether to show visible loading text |
| minHeight | string | 'h-64' | Minimum height of the container |

### ButtonSpinner

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| text | string | 'Loading...' | Text to display next to spinner |

## Size Variants

- **small**: 4x4 (16px) - For inline elements, buttons
- **default**: 8x8 (32px) - Standard loading states
- **large**: 12x12 (48px) - Page loading, modals
- **xl**: 16x16 (64px) - Full-screen loading

## Implementation Details

The spinner uses two SVG paths:
1. **Background circle**: Gray color (`text-gray-200`)
2. **Animated arc**: Blue color (`fill-blue-600`)

The animation is handled by Tailwind's `animate-spin` utility class, which applies a 360-degree rotation animation.

## Migration Guide

### From Border-Based Spinners

```jsx
// Old pattern
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>

// New pattern
<StandardSpinner />
```

### From Custom Loading States

```jsx
// Old pattern
{isLoading ? (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <p className="mt-2 text-gray-600">Loading...</p>
  </div>
) : (
  <Content />
)}

// New pattern
{isLoading ? (
  <CenteredSpinner size="default" text="Loading..." showText={true} />
) : (
  <Content />
)}
```

### From Button Spinners

```jsx
// Old pattern
<button disabled={loading}>
  {loading ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
      Processing...
    </>
  ) : (
    'Submit'
  )}
</button>

// New pattern
<button disabled={loading}>
  {loading ? <ButtonSpinner text="Processing..." /> : 'Submit'}
</button>
```

## Accessibility

The component includes proper accessibility features:
- `role="status"` on the container div
- `aria-hidden="true"` on the SVG element
- Screen reader text with `sr-only` class
- Proper contrast ratios for visibility

## Dark Mode Support

The spinner automatically adjusts for dark mode:
- Background circle: `dark:text-gray-600`
- Animated arc: Remains blue for consistency

## Performance Considerations

- The component is lightweight and uses only CSS animations
- No JavaScript animation loops
- Minimal re-renders due to simple prop structure
- SVG is optimized for performance

## Common Use Cases

### 1. Page Loading
```jsx
if (pageLoading) {
  return <CenteredSpinner size="large" minHeight="h-screen" />;
}
```

### 2. Table/List Loading
```jsx
{isLoadingData ? (
  <CenteredSpinner minHeight="h-96" text="Loading data..." showText={true} />
) : (
  <DataTable data={data} />
)}
```

### 3. Form Submission
```jsx
<form onSubmit={handleSubmit}>
  {/* form fields */}
  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? <ButtonSpinner text="Submitting..." /> : 'Submit'}
  </button>
</form>
```

### 4. Inline Loading
```jsx
<span>
  Refreshing data <StandardSpinner size="small" className="inline ml-2" />
</span>
```

## Best Practices

1. **Consistent Sizing**: Use predefined size variants instead of custom sizes
2. **Accessibility**: Always include appropriate loading text
3. **Context**: Use CenteredSpinner for full sections, StandardSpinner for inline
4. **Button States**: Always disable buttons while loading
5. **Dark Mode**: Test spinner visibility in both light and dark modes

## Troubleshooting

### Spinner Not Visible
- Check if parent container has proper height
- Ensure no conflicting CSS overrides
- Verify Tailwind CSS is properly configured

### Animation Not Working
- Confirm `animate-spin` class is in Tailwind config
- Check for CSS animation conflicts
- Ensure no `animation: none` overrides

### Accessibility Issues
- Verify `role="status"` is present
- Check screen reader announces loading state
- Ensure proper contrast ratios

## Future Enhancements

- [ ] Add progress variant with percentage
- [ ] Add skeleton loading patterns
- [ ] Add custom color variants
- [ ] Add loading state management hook
- [ ] Add automatic timeout handling

## Related Components

- LoadingScreen: Full-page loading component
- LoadingSpinner: Legacy component (to be deprecated)
- SkeletonLoader: For content placeholder loading

---

Last Updated: January 2025