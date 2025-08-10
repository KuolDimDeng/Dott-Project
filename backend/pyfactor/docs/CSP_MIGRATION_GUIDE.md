# CSP Migration Guide - Removing Unsafe Inline Scripts

## Overview
We've removed `unsafe-inline` and `unsafe-eval` from the Content Security Policy to prevent XSS attacks. This document explains how to handle inline scripts and styles that may break.

## What Changed

### Before (Insecure)
```python
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'", ...)
```

### After (Secure)
```python
CSP_SCRIPT_SRC = ("'self'", "https://js.stripe.com", ...)  # No unsafe directives
```

## Impact

### What Will Break
1. **Inline JavaScript** in HTML templates
   ```html
   <!-- This will be blocked -->
   <script>console.log('Hello');</script>
   <button onclick="handleClick()">Click</button>
   ```

2. **Inline event handlers**
   ```html
   <!-- These will be blocked -->
   <div onload="init()"></div>
   <a href="#" onclick="return false;">Link</a>
   ```

3. **Dynamic script evaluation**
   ```javascript
   // These will be blocked
   eval('console.log("test")');
   new Function('return true')();
   setTimeout('alert("Hi")', 1000);  // String argument
   ```

### What Still Works
1. **External scripts** from allowed domains
2. **Event listeners** added via JavaScript
3. **Inline styles** (temporarily, with `unsafe-inline` for CSS)

## Migration Strategies

### 1. Use External JavaScript Files

**Before:**
```html
<script>
  function handleSubmit() {
    // form submission logic
  }
</script>
```

**After:**
```html
<script src="{% static 'js/form-handler.js' %}"></script>
```

### 2. Use Event Listeners Instead of Inline Handlers

**Before:**
```html
<button onclick="deleteItem({{ item.id }})">Delete</button>
```

**After:**
```html
<button data-item-id="{{ item.id }}" class="delete-btn">Delete</button>
<script src="{% static 'js/delete-handler.js' %}"></script>
```

```javascript
// delete-handler.js
document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const itemId = this.dataset.itemId;
    deleteItem(itemId);
  });
});
```

### 3. Use Nonce-Based Inline Scripts (When Necessary)

If you absolutely need inline scripts, use the CSP nonce:

**Step 1:** Add CSPNonceMiddleware to settings.py
```python
MIDDLEWARE = [
    # ... other middleware
    'custom_auth.csp_nonce.CSPNonceMiddleware',
    'custom_auth.unified_middleware.SecurityHeadersMiddleware',
]
```

**Step 2:** Add context processor
```python
TEMPLATES = [
    {
        'OPTIONS': {
            'context_processors': [
                # ... other processors
                'custom_auth.csp_nonce.csp_nonce_processor',
            ],
        },
    },
]
```

**Step 3:** Use nonce in templates
```django
{% if csp_nonce %}
<script nonce="{{ csp_nonce }}">
  // This inline script is allowed with nonce
  const config = {
    apiUrl: "{{ api_url }}",
    userId: {{ user.id }}
  };
</script>
{% endif %}
```

### 4. Replace eval() and Function() Constructors

**Before:**
```javascript
const result = eval(userInput);
const fn = new Function('x', 'return x * 2');
setTimeout('processData()', 1000);
```

**After:**
```javascript
// Use JSON.parse for data
const result = JSON.parse(userInput);

// Use regular functions
const fn = (x) => x * 2;

// Use function references
setTimeout(processData, 1000);
```

### 5. Handle Dynamic Content

**Before:**
```javascript
element.innerHTML = '<script>alert("Hi")</script>';
```

**After:**
```javascript
// Use textContent for text
element.textContent = 'Hi';

// Or createElement for complex content
const script = document.createElement('script');
script.src = '/static/js/dynamic.js';
document.body.appendChild(script);
```

## Common Patterns to Fix

### Django Admin Customizations
If you have custom admin JavaScript:

1. Move inline scripts to static files:
   ```python
   # admin.py
   class MyModelAdmin(admin.ModelAdmin):
       class Media:
           js = ['admin/js/custom.js']
   ```

2. Use data attributes for configuration:
   ```html
   <div id="admin-config" 
        data-api-url="{% url 'api:endpoint' %}"
        data-csrf-token="{{ csrf_token }}">
   </div>
   ```

### AJAX with CSRF Tokens
**Before (inline):**
```html
<script>
  $.ajaxSetup({
    headers: {'X-CSRFToken': '{{ csrf_token }}'}
  });
</script>
```

**After (external with meta tag):**
```html
<meta name="csrf-token" content="{{ csrf_token }}">
<script src="{% static 'js/ajax-setup.js' %}"></script>
```

```javascript
// ajax-setup.js
const token = document.querySelector('meta[name="csrf-token"]').content;
$.ajaxSetup({
  headers: {'X-CSRFToken': token}
});
```

## Testing Your Changes

### 1. Check Browser Console
Look for CSP violations:
```
Refused to execute inline script because it violates the following 
Content Security Policy directive: "script-src 'self'"
```

### 2. Use CSP Report-Only Mode (Development)
```python
# settings.py (development only)
if DEBUG:
    CSP_REPORT_ONLY = True  # Report violations without blocking
    CSP_REPORT_URI = '/api/csp-report/'
```

### 3. Monitor Production
Set up CSP reporting endpoint:
```python
# urls.py
path('api/csp-report/', views.csp_report_view, name='csp-report'),
```

## Rollback Plan

If critical functionality breaks in production:

### Temporary Rollback (Emergency Only)
```python
# settings.py - ADD BACK TEMPORARILY
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", ...)  # SECURITY RISK - FIX ASAP
```

Then fix the issues and remove unsafe-inline again.

## Best Practices

1. **Never use eval() or Function() constructors**
2. **Avoid inline event handlers**
3. **Use external JavaScript files**
4. **Use data attributes for configuration**
5. **Implement nonce-based CSP for necessary inline scripts**
6. **Test thoroughly before production deployment**

## Resources

- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Django CSP Documentation](https://django-csp.readthedocs.io/)

## Checklist

- [ ] Removed all inline JavaScript from templates
- [ ] Replaced onclick handlers with addEventListener
- [ ] Moved configuration to data attributes
- [ ] Tested all interactive features
- [ ] Set up CSP violation reporting
- [ ] Documented any remaining inline scripts that use nonces