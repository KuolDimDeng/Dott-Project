"""
API Documentation Configuration
Implements OpenAPI/Swagger documentation for all endpoints
"""

from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Schema View Configuration
schema_view = get_schema_view(
    openapi.Info(
        title="Dott API",
        default_version='v1',
        description="""
        ## Dott Business Management Platform API
        
        Welcome to the Dott API documentation. This API provides comprehensive endpoints for:
        - Authentication & Authorization
        - User Management
        - Sales & Invoicing
        - Financial Management
        - Payroll Processing
        - Tax Management
        - Reporting & Analytics
        
        ### Authentication
        All API requests require authentication using either:
        1. **Session Token**: Include session token in cookies
        2. **JWT Bearer Token**: Include in Authorization header
        3. **API Key**: For machine-to-machine communication
        
        ### Rate Limiting
        API endpoints are rate-limited based on your subscription plan:
        - **Free/Basic**: Standard limits
        - **Professional**: 2x limits
        - **Enterprise**: 5x limits
        
        ### Error Responses
        All errors follow a consistent format:
        ```json
        {
            "error": "Error code",
            "message": "Human-readable error message",
            "details": {}
        }
        ```
        
        ### Pagination
        List endpoints support pagination:
        - `page`: Page number (default: 1)
        - `page_size`: Items per page (default: 20, max: 100)
        
        ### Filtering & Sorting
        Most list endpoints support:
        - `search`: Text search
        - `ordering`: Sort by field (prefix with `-` for descending)
        - `filters`: Field-specific filters
        """,
        terms_of_service="https://dottapps.com/terms",
        contact=openapi.Contact(email="api@dottapps.com"),
        license=openapi.License(name="Proprietary"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    authentication_classes=(),
)

# API Documentation Examples
API_EXAMPLES = {
    'authentication': {
        'login': {
            'request': {
                'email': 'user@example.com',
                'password': 'SecurePassword123!'
            },
            'response': {
                'success': True,
                'session_token': 'uuid-session-token',
                'user': {
                    'id': 1,
                    'email': 'user@example.com',
                    'name': 'John Doe',
                    'role': 'OWNER'
                },
                'tenant': {
                    'id': 'uuid-tenant-id',
                    'name': 'Acme Corp'
                }
            }
        },
        'logout': {
            'response': {
                'success': True,
                'message': 'Successfully logged out'
            }
        }
    },
    'users': {
        'profile': {
            'response': {
                'id': 1,
                'email': 'user@example.com',
                'name': 'John Doe',
                'phone': '+1234567890',
                'business_name': 'Acme Corp',
                'business_type': 'SERVICE',
                'subscription_plan': 'professional',
                'created_at': '2024-01-01T00:00:00Z'
            }
        },
        'update_profile': {
            'request': {
                'name': 'Jane Doe',
                'phone': '+1987654321',
                'business_name': 'Updated Corp'
            },
            'response': {
                'success': True,
                'message': 'Profile updated successfully',
                'data': {}
            }
        }
    },
    'sales': {
        'create_invoice': {
            'request': {
                'customer_id': 'uuid-customer-id',
                'items': [
                    {
                        'description': 'Consulting Service',
                        'quantity': 1,
                        'unit_price': 1000.00,
                        'tax_rate': 0.10
                    }
                ],
                'due_date': '2024-12-31',
                'notes': 'Thank you for your business'
            },
            'response': {
                'success': True,
                'invoice': {
                    'id': 'INV-2024-001',
                    'status': 'draft',
                    'total': 1100.00,
                    'created_at': '2024-01-01T00:00:00Z'
                }
            }
        },
        'list_invoices': {
            'response': {
                'count': 50,
                'next': 'https://api.dottapps.com/api/sales/invoices/?page=2',
                'previous': None,
                'results': [
                    {
                        'id': 'INV-2024-001',
                        'customer': 'Acme Corp',
                        'total': 1100.00,
                        'status': 'paid',
                        'due_date': '2024-12-31'
                    }
                ]
            }
        }
    },
    'payments': {
        'process_payment': {
            'request': {
                'amount': 100.00,
                'currency': 'USD',
                'payment_method': 'card',
                'card_token': 'tok_visa'
            },
            'response': {
                'success': True,
                'payment_id': 'pay_uuid',
                'status': 'succeeded',
                'amount': 100.00,
                'currency': 'USD'
            }
        }
    },
    'payroll': {
        'run_payroll': {
            'request': {
                'pay_period': {
                    'start_date': '2024-01-01',
                    'end_date': '2024-01-15'
                },
                'employees': [
                    {
                        'employee_id': 'emp_001',
                        'hours_worked': 80,
                        'overtime_hours': 5
                    }
                ]
            },
            'response': {
                'success': True,
                'payroll_run': {
                    'id': 'pr_uuid',
                    'status': 'processing',
                    'total_gross': 5000.00,
                    'total_net': 3800.00,
                    'employee_count': 1
                }
            }
        }
    },
    'taxes': {
        'calculate_tax': {
            'request': {
                'income': 100000,
                'filing_status': 'single',
                'state': 'CA',
                'deductions': 12550
            },
            'response': {
                'federal_tax': 18021.50,
                'state_tax': 7630.60,
                'total_tax': 25652.10,
                'effective_rate': 25.65,
                'marginal_rate': 32
            }
        }
    },
    'reports': {
        'financial_summary': {
            'request': {
                'period': 'monthly',
                'year': 2024,
                'month': 1
            },
            'response': {
                'revenue': 50000.00,
                'expenses': 30000.00,
                'profit': 20000.00,
                'profit_margin': 40.0,
                'top_customers': [],
                'top_products': []
            }
        }
    }
}

# Endpoint Documentation
ENDPOINT_DOCS = {
    '/api/auth/password-login/': {
        'post': {
            'summary': 'User Login',
            'description': 'Authenticate user with email and password',
            'tags': ['Authentication'],
            'request_body': {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['email', 'password'],
                            'properties': {
                                'email': {
                                    'type': 'string',
                                    'format': 'email',
                                    'example': 'user@example.com'
                                },
                                'password': {
                                    'type': 'string',
                                    'format': 'password',
                                    'example': 'SecurePassword123!'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Login successful',
                    'content': {
                        'application/json': {
                            'example': API_EXAMPLES['authentication']['login']['response']
                        }
                    }
                },
                '401': {
                    'description': 'Invalid credentials',
                    'content': {
                        'application/json': {
                            'example': {
                                'error': 'invalid_credentials',
                                'message': 'Invalid email or password'
                            }
                        }
                    }
                },
                '429': {
                    'description': 'Too many login attempts',
                    'content': {
                        'application/json': {
                            'example': {
                                'error': 'rate_limit_exceeded',
                                'message': 'Too many login attempts. Please try again later.',
                                'retry_after': 900
                            }
                        }
                    }
                }
            }
        }
    }
}

@api_view(['GET'])
def api_documentation_view(request):
    """
    API Documentation Overview
    Returns structured documentation for all endpoints
    """
    return Response({
        'title': 'Dott API Documentation',
        'version': 'v1',
        'base_url': 'https://api.dottapps.com',
        'authentication': {
            'methods': ['session', 'jwt', 'api_key'],
            'endpoints': {
                'login': '/api/auth/password-login/',
                'logout': '/api/auth/logout/',
                'refresh': '/api/auth/refresh/',
                'verify': '/api/auth/verify/'
            }
        },
        'rate_limits': {
            'free': {
                'requests_per_hour': 1000,
                'requests_per_day': 10000
            },
            'professional': {
                'requests_per_hour': 2000,
                'requests_per_day': 20000
            },
            'enterprise': {
                'requests_per_hour': 5000,
                'requests_per_day': 50000
            }
        },
        'endpoints': ENDPOINT_DOCS,
        'examples': API_EXAMPLES,
        'sdks': {
            'python': 'pip install dott-api',
            'javascript': 'npm install @dott/api-client',
            'php': 'composer require dott/api-client'
        },
        'support': {
            'email': 'api@dottapps.com',
            'documentation': 'https://docs.dottapps.com/api',
            'status_page': 'https://status.dottapps.com'
        }
    })

# URL patterns for documentation
documentation_urls = [
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('openapi/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('docs/', api_documentation_view, name='api-docs'),
]