# MUI to Tailwind CSS Components Migration Guide

This guide will help you migrate from Material-UI (MUI) components to the Tailwind CSS replacement components in this project.

## General Migration Steps

1. Replace imports from MUI with imports from the local components:
   ```jsx
   // Before
   import { Button, TextField } from '@mui/material';
   
   // After
   import { Button, TextField } from '@/components/replaced';
   ```

2. Update component props as needed (see component-specific migration notes below)
3. Remove theme provider and MUI-specific styling utilities

## Component-Specific Migration Notes

### Button

```jsx
// Before (MUI)
<Button 
  variant="contained" 
  color="primary" 
  size="medium"
  startIcon={<SaveIcon />}
  disabled={isDisabled}
  fullWidth
  onClick={handleClick}
>
  Save
</Button>

// After (Tailwind CSS)
<Button 
  variant="primary" 
  size="medium"
  startIcon={<SaveIcon />}
  disabled={isDisabled}
  fullWidth
  onClick={handleClick}
>
  Save
</Button>
```

**Changes:**
- `variant="contained"` + `color="primary"` → `variant="primary"`
- `variant="contained"` + `color="secondary"` → `variant="secondary"`
- `variant="outlined"` → `variant="outlined"`
- `variant="text"` → `variant="text"`

### TextField

```jsx
// Before (MUI)
<TextField
  id="email"
  name="email"
  label="Email Address"
  variant="outlined"
  type="email"
  value={email}
  onChange={handleChange}
  error={!!emailError}
  helperText={emailError || "We'll never share your email"}
  required
  fullWidth
  InputProps={{
    startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment>
  }}
/>

// After (Tailwind CSS)
<TextField
  id="email"
  name="email"
  label="Email Address"
  type="email"
  value={email}
  onChange={handleChange}
  error={!!emailError}
  helperText={emailError || "We'll never share your email"}
  required
  fullWidth
  startAdornment={<EmailIcon />}
/>
```

**Changes:**
- Remove `variant` prop as our Tailwind components have a single style
- Replace `InputProps={{ startAdornment }}` with direct `startAdornment` prop
- Replace `InputProps={{ endAdornment }}` with direct `endAdornment` prop

### Select

```jsx
// Before (MUI)
<FormControl fullWidth required error={!!countryError}>
  <InputLabel id="country-label">Country</InputLabel>
  <Select
    labelId="country-label"
    id="country"
    name="country"
    value={country}
    onChange={handleChange}
    label="Country"
  >
    <MenuItem value="" disabled>Select a country</MenuItem>
    <MenuItem value="us">United States</MenuItem>
    <MenuItem value="ca">Canada</MenuItem>
    <MenuItem value="uk">United Kingdom</MenuItem>
  </Select>
  <FormHelperText>{countryError}</FormHelperText>
</FormControl>

// After (Tailwind CSS)
<Select
  id="country"
  name="country"
  label="Country"
  value={country}
  onChange={handleChange}
  error={!!countryError}
  helperText={countryError}
  required
  fullWidth
  placeholder="Select a country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' }
  ]}
/>
```

**Changes:**
- No need for wrapper `FormControl` component
- Options are passed as an array of objects instead of `MenuItem` components
- Helper text and error state are passed directly to the component

### Checkbox & Switch

```jsx
// Before (MUI)
<FormControlLabel
  control={
    <Checkbox
      checked={agreed}
      onChange={handleChange}
      name="agreed"
    />
  }
  label="I agree to the terms and conditions"
/>

// After (Tailwind CSS)
<Checkbox
  id="agreed"
  name="agreed"
  checked={agreed}
  onChange={handleChange}
  label="I agree to the terms and conditions"
/>
```

**Changes:**
- No need for wrapper `FormControlLabel` component
- Label is passed directly to the component

### Radio

```jsx
// Before (MUI)
<FormControl component="fieldset">
  <FormLabel component="legend">Gender</FormLabel>
  <RadioGroup
    aria-label="gender"
    name="gender"
    value={gender}
    onChange={handleChange}
    row
  >
    <FormControlLabel value="female" control={<Radio />} label="Female" />
    <FormControlLabel value="male" control={<Radio />} label="Male" />
    <FormControlLabel value="other" control={<Radio />} label="Other" />
  </RadioGroup>
</FormControl>

// After (Tailwind CSS)
<RadioGroup
  name="gender"
  value={gender}
  onChange={handleChange}
  label="Gender"
  row
>
  <Radio id="gender-female" value="female" label="Female" />
  <Radio id="gender-male" value="male" label="Male" />
  <Radio id="gender-other" value="other" label="Other" />
</RadioGroup>
```

**Changes:**
- No need for wrapper `FormControl` and `FormLabel` components
- `Radio` elements are direct children of `RadioGroup` without `FormControlLabel`
- Label is passed directly to each component

### DatePicker

```jsx
// Before (MUI)
<DatePicker
  label="Birth Date"
  value={birthDate}
  onChange={(newValue) => setBirthDate(newValue)}
  renderInput={(params) => <TextField {...params} />}
/>

// After (Tailwind CSS)
<DatePicker
  id="birthDate"
  name="birthDate"
  label="Birth Date"
  value={birthDate}
  onChange={handleChange}
  required
  fullWidth
/>
```

**Changes:**
- No need for `renderInput` prop
- Direct support for standard form props like `id`, `name`, `onChange`

### Alert

```jsx
// Before (MUI)
<Alert 
  severity="success" 
  variant="filled" 
  onClose={handleClose}
>
  This is a success message!
</Alert>

// After (Tailwind CSS)
<Alert 
  severity="success" 
  variant="filled" 
  onClose={handleClose}
>
  This is a success message!
</Alert>
```

**Changes:**
- API is similar, with support for severity, variant, and onClose

### Dialog

```jsx
// Before (MUI)
<Dialog
  open={open}
  onClose={handleClose}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Confirm Action</DialogTitle>
  <DialogContent>
    <DialogContentText>
      Are you sure you want to proceed?
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose} color="primary">
      Cancel
    </Button>
    <Button onClick={handleConfirm} color="primary" variant="contained">
      Confirm
    </Button>
  </DialogActions>
</Dialog>

// After (Tailwind CSS)
<Dialog
  open={open}
  onClose={handleClose}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Confirm Action</DialogTitle>
  <DialogContent>
    <p>Are you sure you want to proceed?</p>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose} variant="outlined">
      Cancel
    </Button>
    <Button onClick={handleConfirm} variant="primary">
      Confirm
    </Button>
  </DialogActions>
</Dialog>
```

**Changes:**
- No need for `DialogContentText`, just use a regular `<p>` tag
- Update Button variants as noted in the Button section

### Card

```jsx
// Before (MUI)
<Card>
  <CardHeader
    title="Card Title"
    subheader="September 14, 2023"
  />
  <CardMedia
    component="img"
    height="194"
    image="/static/images/cards/image.jpg"
    alt="Card image"
  />
  <CardContent>
    <Typography variant="body2" color="text.secondary">
      Content goes here
    </Typography>
  </CardContent>
  <CardActions disableSpacing>
    <Button size="small">Learn More</Button>
  </CardActions>
</Card>

// After (Tailwind CSS)
<Card>
  <CardHeader
    title="Card Title"
    subheader="September 14, 2023"
  />
  <CardMedia
    component="img"
    height="48"
    image="/static/images/cards/image.jpg"
    alt="Card image"
  />
  <CardContent>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Content goes here
    </p>
  </CardContent>
  <CardActions disableSpacing>
    <Button size="small">Learn More</Button>
  </CardActions>
</Card>
```

**Changes:**
- Replace MUI `Typography` with regular HTML elements and Tailwind classes
- Note that `CardMedia` height is specified directly as a number (in Tailwind's arbitrary height units)

## Final Steps

1. Once all components are migrated, remove MUI packages from your dependencies:
   ```bash
   pnpm remove @mui/material @mui/icons-material @emotion/react @emotion/styled
   ```

2. Clean up any unused MUI theme files or providers in your codebase.

3. Check for any remaining MUI utility imports and replace them with Tailwind CSS or custom solutions.

## Need Help?

If you encounter any issues during migration or need additional components, please refer to the component files directly for implementation details or reach out to the development team. 