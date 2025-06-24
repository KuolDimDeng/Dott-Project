# UI Design Standard for Management Pages

This document defines the mandatory UI/UX pattern for all management pages in the Dott application that include create, edit, view, and list functionality.

## Overview

All management pages accessible through the ListMenu.js component must follow the same design pattern established by ProductManagement and LocationsManagement components. This ensures a consistent user experience across the entire application.

## Required Components Structure

### 1. Summary Cards Section
Located at the top of every management page, displaying key metrics:

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
  <div className="bg-white shadow rounded-lg p-6">
    <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
      Total Items
    </h2>
    <p className="text-3xl font-bold text-blue-600 mt-2">
      {items.length}
    </p>
  </div>
  {/* Additional metric cards */}
</div>
```

**Requirements:**
- 3-4 cards showing relevant statistics
- White background with shadow
- Uppercase gray headers
- Large colored numbers for values
- Responsive grid layout

### 2. Search and Action Toolbar

```jsx
<div className="flex justify-between items-center flex-wrap gap-4 mb-6">
  <div className="relative">
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      placeholder="Search Items"
      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
  
  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
    Create New Item
  </button>
</div>
```

### 3. Tab Navigation

```jsx
<div className="bg-white shadow rounded-lg">
  <div className="border-b border-gray-200">
    <nav className="-mb-px flex">
      <button
        onClick={() => setActiveTab(0)}
        className={`py-2 px-4 border-b-2 font-medium text-sm ${
          activeTab === 0
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Create/Edit
      </button>
      {/* Additional tabs */}
    </nav>
  </div>
  <div className="p-6">
    {/* Tab content */}
  </div>
</div>
```

### 4. Data Table Design

```jsx
<table className="min-w-full divide-y divide-gray-300">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Name
      </th>
      {/* Additional columns */}
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {items.map((item) => (
      <tr key={item.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{item.name}</div>
        </td>
        {/* Additional cells */}
      </tr>
    ))}
  </tbody>
</table>
```

### 5. Action Buttons

```jsx
<div className="flex space-x-2">
  <button className="px-2 py-1 text-xs font-medium rounded border border-blue-700 text-blue-700 hover:bg-blue-50">
    View
  </button>
  <button className="px-2 py-1 text-xs font-medium rounded border border-purple-700 text-purple-700 hover:bg-purple-50">
    Edit
  </button>
  <button className="px-2 py-1 text-xs font-medium rounded border border-red-700 text-red-700 hover:bg-red-50">
    Delete
  </button>
</div>
```

### 6. Status Badges

```jsx
<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
  item.is_active 
    ? 'bg-green-100 text-green-800' 
    : 'bg-gray-100 text-gray-800'
}`}>
  {item.is_active ? 'Active' : 'Inactive'}
</span>
```

## Color System

### Primary Colors
- **Blue (Primary)**: `#2563EB` (blue-600) - Primary actions, active states
- **Green (Success)**: `#059669` (green-600) - Active status, success states
- **Red (Danger)**: `#DC2626` (red-600) - Delete actions, errors
- **Purple (Secondary)**: `#7C3AED` (purple-700) - Edit actions
- **Gray (Neutral)**: Various shades for backgrounds and text

### Background Colors
- Page Background: `bg-gray-50`
- Card/Content Background: `bg-white`
- Table Header: `bg-gray-50`
- Hover States: `hover:bg-gray-50`

## Typography Standards

### Font Sizes and Weights
- Page Title: `text-2xl font-bold`
- Section Headers: `text-xl font-semibold`
- Card Labels: `text-sm font-medium uppercase`
- Card Values: `text-3xl font-bold`
- Table Headers: `text-xs font-medium uppercase`
- Body Text: `text-sm` or `text-base`

### Text Colors
- Primary Text: `text-black` or `text-gray-900`
- Secondary Text: `text-gray-500`
- Link/Action Text: `text-blue-600`

## Form Design Standards

### Input Fields
```jsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
  placeholder="Enter value..."
/>
```

### Labels
```jsx
<label className="block text-sm font-medium text-black mb-1">
  Field Label
</label>
```

### Buttons
- Primary: `bg-blue-600 text-white hover:bg-blue-700`
- Secondary: `border border-gray-300 text-gray-700 hover:bg-gray-50`
- Danger: `bg-red-600 text-white hover:bg-red-700`

## Responsive Design

- Use responsive grid classes: `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`
- Stack elements on mobile: `flex flex-col md:flex-row`
- Adjust spacing for mobile: `gap-4 md:gap-6`
- Hide/show elements: `hidden md:block`

## Implementation Checklist

When creating a new management page, ensure you include:

- [ ] Summary cards section with 3-4 metrics
- [ ] Search bar with icon
- [ ] Create New button with plus icon
- [ ] Tab navigation (Create/Edit, Details, List)
- [ ] Responsive data table with hover states
- [ ] Status badges with consistent colors
- [ ] Action buttons (View, Edit, Delete)
- [ ] Delete confirmation dialog
- [ ] Form validation and error states
- [ ] Loading states
- [ ] Empty states with helpful messages
- [ ] Toast notifications for success/error
- [ ] Consistent spacing and padding
- [ ] Mobile-responsive layout

## Reference Implementations

Study these files for complete examples:
- `/src/app/dashboard/components/forms/ProductManagement.js`
- `/src/app/dashboard/components/forms/LocationsManagement.js`

## Common Mistakes to Avoid

1. **Inconsistent Colors**: Always use the defined color palette
2. **Mixed Button Styles**: Keep button styling consistent across pages
3. **Irregular Spacing**: Use consistent padding/margin values
4. **Non-responsive Layouts**: Test on mobile devices
5. **Missing Loading States**: Always show feedback during data fetching
6. **Unclear Empty States**: Provide helpful messages when no data exists

## Future Considerations

As the application grows, this design system will be expanded to include:
- Dark mode support
- Additional component patterns
- Animation standards
- Accessibility guidelines
- Print styles

Remember: Consistency is key to a professional user experience. When in doubt, refer to the existing ProductManagement and LocationsManagement implementations.