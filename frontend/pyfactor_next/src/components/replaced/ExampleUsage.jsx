'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Checkbox,
  DatePicker,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
} from './';

export default function ExampleUsage() {
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    country: '',
    birthDate: '',
    agreeToTerms: false,
    notifications: true,
    favoriteColor: 'blue',
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setDialogOpen(true);
  };

  const countries = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'au', label: 'Australia' },
    { value: 'jp', label: 'Japan' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Tailwind CSS Component Examples</h1>

      {/* Alert examples */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Alert Examples</h2>
        <div className="space-y-4">
          <Alert severity="success">
            This is a success alert — check it out!
          </Alert>
          <Alert severity="info" variant="outlined">
            This is an info alert — check it out!
          </Alert>
          <Alert severity="warning" variant="standard">
            This is a warning alert — check it out!
          </Alert>
          <Alert severity="error" onClose={() => console.log('Closed')}>
            This is an error alert with close button — check it out!
          </Alert>
        </div>
      </section>

      {/* Form example */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Form Example</h2>
        <Card>
          <CardHeader title="User Registration" subheader="Fill in your details" />
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  id="name"
                  name="name"
                  label="Full Name"
                  value={formValues.name}
                  onChange={handleChange}
                  required
                  fullWidth
                />
                
                <TextField
                  id="email"
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange}
                  required
                  fullWidth
                  helperText="We'll never share your email."
                />
                
                <Select
                  id="country"
                  name="country"
                  label="Country"
                  value={formValues.country}
                  onChange={handleChange}
                  options={countries}
                  required
                  fullWidth
                />
                
                <DatePicker
                  id="birthDate"
                  name="birthDate"
                  label="Birth Date"
                  value={formValues.birthDate}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  fullWidth
                />
                
                <div className="md:col-span-2">
                  <RadioGroup
                    name="favoriteColor"
                    value={formValues.favoriteColor}
                    onChange={handleChange}
                    label="Favorite Color"
                    row
                  >
                    <Radio id="color-red" value="red" label="Red" />
                    <Radio id="color-blue" value="blue" label="Blue" />
                    <Radio id="color-green" value="green" label="Green" />
                    <Radio id="color-purple" value="purple" label="Purple" />
                  </RadioGroup>
                </div>
                
                <div>
                  <Switch
                    id="notifications"
                    name="notifications"
                    checked={formValues.notifications}
                    onChange={handleChange}
                    label="Enable notifications"
                  />
                </div>
                
                <div>
                  <Checkbox
                    id="agreeToTerms"
                    name="agreeToTerms"
                    checked={formValues.agreeToTerms}
                    onChange={handleChange}
                    label="I agree to terms and conditions"
                    required
                  />
                </div>
              </div>
            </CardContent>
            
            <CardActions>
              <Button type="submit" variant="primary">
                Submit
              </Button>
              <Button type="button" variant="outlined">
                Cancel
              </Button>
            </CardActions>
          </form>
        </Card>
      </section>

      {/* Button examples */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Button Examples</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="success">Success</Button>
          <Button variant="error">Error</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="info">Info</Button>
          <Button variant="primary" size="small">Small</Button>
          <Button variant="primary" size="large">Large</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Form Submitted</DialogTitle>
        <DialogContent>
          <p className="mb-4">Thank you for submitting the form!</p>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto text-xs">
            {JSON.stringify(formValues, null, 2)}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => setDialogOpen(false)}>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
} 