# Tailwind CSS and Form Plugins Installation Instructions

To complete the transition from MUI to Tailwind CSS, you need to install the `@tailwindcss/forms` package which was referenced in your Tailwind configuration.

## Installation Steps

Run one of the following commands in the `frontend/pyfactor_next` directory based on your package manager:

### Using npm:
```bash
npm install @tailwindcss/forms
```

### Using yarn:
```bash
yarn add @tailwindcss/forms
```

### Using pnpm (if you're using pnpm as indicated by your lock files):
```bash
pnpm add @tailwindcss/forms
```

## After Installation

Once installed, uncomment the following line in your `tailwind.config.js` file:

```js
plugins: [
  require('@tailwindcss/forms'),
],
```

The line is currently commented out to allow the build to proceed without errors, but you'll want to restore it after installing the package.

## Why This Plugin Is Important

The `@tailwindcss/forms` plugin adds better default styling for form elements when using Tailwind CSS. It provides a good base style for inputs, checkboxes, radio buttons, etc. that looks better than the browser defaults while still being easily customizable.

## Additional Tailwind CSS Dependencies

If you experience any other dependency issues with Tailwind CSS, you might also need to install:

```bash
npm install tailwindcss postcss autoprefixer
```

or if using pnpm:

```bash
pnpm add tailwindcss postcss autoprefixer
```

## Migration Status

The key components that have been migrated from MUI to Tailwind CSS:

1. Dashboard layout
2. Navbar/AppBar
3. Subscription component
4. Authentication forms

The landing page has intentionally been left using MUI as requested.