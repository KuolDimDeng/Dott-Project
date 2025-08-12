# 🔧 Code Quality Improvements Plan

## 🎯 **OBJECTIVE**
Standardize code patterns, reduce duplication, and improve maintainability across the entire codebase

---

## 📊 **CURRENT ISSUES IDENTIFIED**

### **1. API Call Duplication**
**Problem:** Similar API patterns repeated 50+ times
```javascript
// Repeated pattern in multiple files:
const response = await fetch('/api/endpoint');
const data = await response.json();
if (!response.ok) {
  throw new Error(data.error);
}
```

### **2. Inconsistent Error Handling**
**Problem:** 10+ different error handling patterns
```javascript
// Pattern 1: Basic try-catch
try { /* code */ } catch(e) { console.error(e); }

// Pattern 2: Error state
const [error, setError] = useState(null);

// Pattern 3: Notification system
notifyError('Something went wrong');
```

### **3. Mixed Response Formats**
**Problem:** APIs return different response structures
```javascript
// Format 1: Direct data
return { data: result }

// Format 2: Wrapped response  
return { success: true, data: result }

// Format 3: Django REST format
return { results: data, count: total }
```

---

## 🛠️ **STANDARDIZATION PLAN**

### **Week 1: API Layer Standardization**

#### **Create Unified API Client**
```javascript
// src/services/apiClient.js
class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    // Add CSRF token
    if (['POST', 'PUT', 'DELETE'].includes(config.method?.toUpperCase())) {
      config.headers = addCSRFHeaders(config.headers);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error || 'Request failed', response.status);
      }

      return this.normalizeResponse(data);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError('Network error', 500);
    }
  }

  normalizeResponse(data) {
    // Standardize all API responses
    if (data.results !== undefined) {
      // Django REST format
      return { data: data.results, meta: { count: data.count } };
    }
    
    if (data.success !== undefined) {
      // Custom success format
      return { data: data.data || data };
    }
    
    // Direct data format
    return { data };
  }

  // HTTP method shortcuts
  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT', 
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Custom error class
class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export const apiClient = new APIClient();
export { APIError };
```

#### **Create Service Layer Pattern**
```javascript
// src/services/taxService.js
import { apiClient } from './apiClient';

export const taxService = {
  // Get tax settings
  async getTaxSettings() {
    return apiClient.get('/settings/taxes');
  },

  // Save tax settings
  async saveTaxSettings(settings) {
    return apiClient.post('/settings/taxes', settings);
  },

  // Get tax rates for location
  async getTaxRates(country, state) {
    const params = new URLSearchParams({ country });
    if (state) params.append('state', state);
    
    return apiClient.get(`/settings/taxes/rates?${params}`);
  },

  // Reset to global defaults
  async resetTaxSettings(country, state) {
    const params = new URLSearchParams({ country });
    if (state) params.append('state', state);
    
    return apiClient.delete(`/settings/taxes?${params}`);
  },
};
```

### **Week 2: Error Handling Standardization**

#### **Create Unified Error Handler**
```javascript
// src/utils/errorHandler.js
import { useNotification } from '@/context/NotificationContext';
import { secureLog } from '@/utils/secureLogger';

export class ErrorHandler {
  constructor(notificationContext) {
    this.notify = notificationContext || console.error;
  }

  handle(error, context = '') {
    // Log error securely
    secureLog.error(`[${context}] Error:`, error);

    // Determine error type and user message
    const userMessage = this.getUserMessage(error);
    
    // Show user notification
    this.notify.error(userMessage);

    // Report to monitoring service
    this.reportError(error, context);

    return userMessage;
  }

  getUserMessage(error) {
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    
    if (error.status === 404) {
      return 'The requested resource was not found.';
    }
    
    if (error.status >= 500) {
      return 'A server error occurred. Please try again later.';
    }
    
    // Custom business logic errors
    if (error.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  reportError(error, context) {
    // Send to monitoring service (Sentry, etc.)
    if (window.Sentry) {
      window.Sentry.captureException(error, { 
        tags: { context },
        extra: { userAgent: navigator.userAgent }
      });
    }
  }
}

// React hook for error handling
export const useErrorHandler = () => {
  const notification = useNotification();
  const errorHandler = new ErrorHandler(notification);
  
  return {
    handleError: errorHandler.handle.bind(errorHandler),
    handleAsyncError: async (asyncFn, context) => {
      try {
        return await asyncFn();
      } catch (error) {
        errorHandler.handle(error, context);
        throw error; // Re-throw for component handling
      }
    }
  };
};
```

#### **Standardized Component Error Pattern**
```javascript
// Standard error handling in components
const TaxSettings = () => {
  const { handleError, handleAsyncError } = useErrorHandler();
  const [loading, setLoading] = useState(false);

  const saveTaxSettings = async (settings) => {
    setLoading(true);
    
    try {
      await handleAsyncError(
        () => taxService.saveTaxSettings(settings),
        'TaxSettings.save'
      );
      
      // Success handling
      notifySuccess('Tax settings saved successfully');
    } catch (error) {
      // Error already handled by handleAsyncError
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### **Week 3: Response Format Standardization**

#### **Backend Response Wrapper**
```python
# backend/pyfactor/core/response_utils.py
from rest_framework.response import Response
from rest_framework import status

class StandardResponse:
    @staticmethod
    def success(data=None, message=None, status_code=status.HTTP_200_OK):
        """Standard success response format"""
        response_data = {
            'success': True,
            'data': data,
        }
        
        if message:
            response_data['message'] = message
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error(message, status_code=status.HTTP_400_BAD_REQUEST, details=None):
        """Standard error response format"""
        response_data = {
            'success': False,
            'error': message,
        }
        
        if details:
            response_data['details'] = details
            
        return Response(response_data, status=status_code)

    @staticmethod
    def paginated(data, count, page=1, page_size=50):
        """Standard paginated response format"""
        return Response({
            'success': True,
            'data': data,
            'meta': {
                'count': count,
                'page': page,
                'page_size': page_size,
                'total_pages': (count + page_size - 1) // page_size
            }
        })
```

#### **Update All API Views**
```python
# Example: Update tax settings view
from core.response_utils import StandardResponse

class TaxSettingsView(APIView):
    def get(self, request):
        try:
            settings = get_tax_settings(request.user)
            return StandardResponse.success(
                data=settings,
                message="Tax settings retrieved successfully"
            )
        except Exception as e:
            return StandardResponse.error(
                message="Failed to retrieve tax settings",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        try:
            settings = save_tax_settings(request.user, request.data)
            return StandardResponse.success(
                data=settings,
                message="Tax settings saved successfully"
            )
        except ValidationError as e:
            return StandardResponse.error(
                message="Invalid tax settings data",
                details=e.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
```

### **Week 4: Documentation & Testing**

#### **API Documentation Standard**
```javascript
/**
 * Tax Service API
 * 
 * Handles all tax-related operations including settings management,
 * rate calculations, and compliance features.
 * 
 * @example
 * // Get current tax settings
 * const settings = await taxService.getTaxSettings();
 * 
 * // Save new tax rates
 * await taxService.saveTaxSettings({
 *   sales_tax_rate: 0.0875,
 *   region_code: 'CA'
 * });
 */
export const taxService = {
  /**
   * Retrieves current tax settings for the authenticated user's tenant
   * 
   * @returns {Promise<{data: TaxSettings}>} Tax settings object
   * @throws {APIError} When settings cannot be retrieved
   */
  async getTaxSettings() {
    return apiClient.get('/settings/taxes');
  },
  
  // ... other methods with similar documentation
};
```

#### **Testing Standards**
```javascript
// src/services/__tests__/taxService.test.js
import { taxService } from '../taxService';
import { apiClient } from '../apiClient';

// Mock the API client
jest.mock('../apiClient');

describe('TaxService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaxSettings', () => {
    it('should retrieve tax settings successfully', async () => {
      const mockSettings = { sales_tax_rate: 0.0875 };
      apiClient.get.mockResolvedValue({ data: mockSettings });

      const result = await taxService.getTaxSettings();

      expect(apiClient.get).toHaveBeenCalledWith('/settings/taxes');
      expect(result.data).toEqual(mockSettings);
    });

    it('should handle API errors', async () => {
      const mockError = new APIError('Settings not found', 404);
      apiClient.get.mockRejectedValue(mockError);

      await expect(taxService.getTaxSettings()).rejects.toThrow('Settings not found');
    });
  });
});
```

---

## 🧹 **CODE CLEANUP AUTOMATION**

### **Automated Refactoring Script**
```bash
#!/bin/bash
# cleanup-code-quality.sh

echo "🧹 AUTOMATED CODE QUALITY CLEANUP"
echo "================================="

# 1. Remove duplicate API patterns
echo "🔍 Finding duplicate API patterns..."
find src/ -name "*.js" -exec grep -l "fetch.*await.*json" {} \; > api-files.txt

echo "Found $(wc -l < api-files.txt) files with API calls"

# 2. Standardize import statements
echo "📦 Standardizing imports..."
find src/ -name "*.js" -exec sed -i 's/import React, {/import React, {\n  /g' {} \;

# 3. Remove console.log statements (except secureLog)
echo "🔇 Removing debug console.log statements..."
find src/ -name "*.js" -exec sed -i '/console\.log.*debug\|console\.log.*test/d' {} \;

# 4. Standardize component export patterns  
echo "📤 Standardizing exports..."
find src/components -name "*.js" -exec sed -i 's/export default function/const Component = () => {\n  \/\/ Component logic\n};\n\nexport default Component; \/\/ /g' {} \;

# 5. Add missing PropTypes (where applicable)
echo "🏷️  Adding PropTypes..."
find src/components -name "*.js" -exec grep -L "PropTypes" {} \; | head -10

echo "✅ Automated cleanup complete!"
echo "⚠️  Manual review required for all changes"
```

---

## 📊 **QUALITY METRICS TRACKING**

### **Code Quality Dashboard**
```javascript
// scripts/quality-metrics.js
const fs = require('fs');
const path = require('path');

class QualityMetrics {
  constructor() {
    this.metrics = {
      duplicateLines: 0,
      averageFileSize: 0,
      testCoverage: 0,
      eslintWarnings: 0,
      apiCallDuplication: 0
    };
  }

  analyzeDuplication() {
    // Find duplicate code patterns
    const files = this.getAllJSFiles();
    const codeHashes = new Map();
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const hash = this.hashLine(line);
        codeHashes.set(hash, (codeHashes.get(hash) || 0) + 1);
      });
    });

    this.metrics.duplicateLines = Array.from(codeHashes.values())
      .filter(count => count > 1)
      .reduce((sum, count) => sum + count, 0);
  }

  analyzeFileSize() {
    const files = this.getAllJSFiles();
    const sizes = files.map(file => {
      const content = fs.readFileSync(file, 'utf8');
      return content.split('\n').length;
    });

    this.metrics.averageFileSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
  }

  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      recommendations: this.getRecommendations()
    };
  }

  getRecommendations() {
    const recommendations = [];

    if (this.metrics.averageFileSize > 200) {
      recommendations.push('Consider breaking down large components');
    }

    if (this.metrics.duplicateLines > 100) {
      recommendations.push('Significant code duplication detected - refactor common patterns');
    }

    return recommendations;
  }
}

// Usage
const analyzer = new QualityMetrics();
analyzer.analyzeDuplication();
analyzer.analyzeFileSize();

console.log(JSON.stringify(analyzer.generateReport(), null, 2));
```

---

## 🎯 **SUCCESS CRITERIA**

### **Quantitative Targets:**
- ✅ API call duplication reduced by 80%
- ✅ Average file size < 200 lines
- ✅ ESLint warnings < 10 total
- ✅ Test coverage > 75%
- ✅ Code duplication < 5%

### **Qualitative Improvements:**
- ✅ Consistent error handling patterns
- ✅ Standardized API response formats
- ✅ Unified coding standards
- ✅ Better developer onboarding experience

---

## 📅 **IMPLEMENTATION TIMELINE**

| Week | Focus Area | Deliverables | Hours |
|------|------------|--------------|-------|
| 1 | API Standardization | Unified API client, service layer | 20h |
| 2 | Error Handling | Standard error patterns, handlers | 16h |
| 3 | Response Formats | Backend/frontend format alignment | 12h |
| 4 | Documentation & Testing | API docs, test standards | 12h |

**Total Effort:** 60 hours over 4 weeks
**Impact:** Major improvement in code maintainability and developer productivity