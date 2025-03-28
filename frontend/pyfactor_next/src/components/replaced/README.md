# Tailwind CSS Replacements for MUI Components

This directory contains Tailwind CSS replacements for common Material-UI (MUI) components. These replacements were created to help transition the application from MUI to Tailwind CSS.

## Available Components

### Form Components
- `Button` - Replacement for MUI Button
- `TextField` - Replacement for MUI TextField
- `Select` - Replacement for MUI Select
- `Checkbox` - Replacement for MUI Checkbox
- `Radio` & `RadioGroup` - Replacement for MUI Radio and RadioGroup
- `Switch` - Replacement for MUI Switch
- `DatePicker` - Replacement for MUI DatePicker

### Layout Components
- `Card`, `CardHeader`, `CardMedia`, `CardContent`, `CardActions` - Replacements for MUI Card components

### Feedback Components
- `Alert` - Replacement for MUI Alert
- `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` - Replacements for MUI Dialog components

## Usage

Import components from the replaced directory instead of MUI:

```jsx
// Before (with MUI)
import { Button, TextField } from '@mui/material';

// After (with Tailwind CSS replacements)
import { Button, TextField } from '@/components/replaced';
```

The API of these components is designed to be similar to MUI components to make the transition easier, but they use Tailwind CSS for styling.

## Props

Each component accepts similar props to its MUI counterpart, with some simplifications:

### Common Props
- `className` - Additional CSS classes to apply to the component
- `children` - Child components/content

### Specific Components
Please refer to each component's implementation for the full list of supported props.

## Theming

These components use Tailwind CSS classes for styling. They respect the light/dark mode settings via Tailwind's dark mode classes.

To customize the appearance:
1. Use the `className` prop to override specific styles
2. Add or modify color variables in your `tailwind.config.js` file

## Accessibility

These components include appropriate ARIA attributes and keyboard interactions for accessibility. 