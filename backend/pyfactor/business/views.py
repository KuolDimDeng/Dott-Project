# Business SMS Contact API Views
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
import json
import logging
from typing import Dict, Any
from datetime import datetime, timedelta

from .sms_service import sms_service
from .models import PlaceholderBusiness, BusinessContactLog, SMSOptOut, BusinessLead
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_marketplace_businesses(request):
    """
    Get all placeholder businesses for marketplace display
    
    GET /api/business/marketplace-businesses
    """
    try:
        # Check if table exists
        from django.db import connection
        table_name = PlaceholderBusiness._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name} LIMIT 1")
        
        # Get query parameters
        country = request.GET.get('country', None)
        city = request.GET.get('city', None)
        category = request.GET.get('category', None)
        search = request.GET.get('search', None)
        
        # Start with all businesses
        businesses = PlaceholderBusiness.objects.all()
        
        # Apply filters
        if country:
            businesses = businesses.filter(country=country)
        if city:
            businesses = businesses.filter(city__icontains=city)
        if category:
            businesses = businesses.filter(category=category)
        if search:
            businesses = businesses.filter(name__icontains=search)
        
        # Order by city, then name
        businesses = businesses.order_by('city', 'name')
        
        # Build response data
        business_list = []
        for business in businesses:
            # Check if business has reached contact limit for this user
            uncontactable = business.contact_limit_reached
            
            business_data = {
                'id': f'ph{business.id}',
                'name': business.name,
                'phone': business.phone,
                'address': business.address,
                'category': business.category,
                'city': business.city,
                'country': business.country,
                'latitude': float(business.latitude) if business.latitude else None,
                'longitude': float(business.longitude) if business.longitude else None,
                'placeholder': True,
                'verified': business.converted_to_real_business,
                'uncontactable': uncontactable,
                'contactsRemaining': business.get_remaining_contacts(),
                'image': f'https://ui-avatars.com/api/?name={business.name.replace(" ", "+")}&background=random'
            }
            business_list.append(business_data)
        
        return Response({
            'success': True,
            'businesses': business_list,
            'total': len(business_list),
            'countries': {
                'KE': businesses.filter(country='KE').count(),
                'SS': businesses.filter(country='SS').count()
            }
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error fetching marketplace businesses: {str(e)}")
        logger.error(f"Full traceback: {error_details}")
        
        # Return empty businesses list on error
        return Response({
            'success': True,
            'businesses': [],
            'total': 0,
            'debug_error': str(e)
        })

@require_http_methods(["POST"])
@login_required
def send_contact_sms(request) -> JsonResponse:
    """
    Send SMS to placeholder business about customer interest
    
    POST /api/business/send-contact-sms
    {
        "businessPhone": "+254701234567",
        "businessName": "Mama Lucy Restaurant", 
        "businessId": "ph1",
        "businessCountry": "KE",
        "customerRequest": "I want to order ugali and fish",
        "businessAddress": "Kenyatta Avenue, Nairobi",
        "businessCategory": "Food & Dining",
        "source": "google_places"
    }
    """
    
    try:
        # Parse request data
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['businessPhone', 'businessName', 'businessId', 'customerRequest']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return JsonResponse({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'code': 'MISSING_FIELDS'
            }, status=400)
        
        # Get customer info
        customer = request.user
        customer_name = getattr(customer, 'first_name', '') or getattr(customer, 'username', 'Customer')
        
        # Validate phone number format
        business_phone = data['businessPhone'].strip()
        if not _is_valid_african_phone(business_phone):
            return JsonResponse({
                'success': False,
                'error': 'Invalid phone number format. Use +254... for Kenya, +211... for South Sudan',
                'code': 'INVALID_PHONE'
            }, status=400)
        
        # Check placeholder business contact limits
        limit_check = _check_business_contact_limits(
            business_phone=business_phone,
            business_id=data['businessId'],
            customer_id=customer.id
        )
        
        if not limit_check['can_contact']:
            return JsonResponse({
                'success': False,
                'error': limit_check['error'],
                'code': limit_check['code'],
                'details': limit_check.get('details', {})
            }, status=limit_check['status_code'])
        
        # Send SMS via Africa's Talking
        sms_result = sms_service.send_business_contact_sms(
            business_phone=business_phone,
            business_name=data['businessName'],
            customer_name=customer_name,
            customer_request=data['customerRequest'],
            business_id=data['businessId'],
            business_address=data.get('businessAddress', ''),
            business_category=data.get('businessCategory', '')
        )
        
        if sms_result['success']:
            # Log successful contact and increment count
            remaining_contacts = _log_contact_attempt(
                customer=customer,
                business_data=data,
                sms_result=sms_result
            )
            
            logger.info(f"SMS sent successfully to {data['businessName']} by {customer_name}")
            
            response_data = {
                'success': True,
                'messageId': sms_result.get('message_id'),
                'estimatedDelivery': sms_result.get('estimatedDelivery'),
                'cost': sms_result.get('cost'),
                'status': 'SMS sent successfully',
                'remainingContacts': remaining_contacts
            }
            
            # Add warning if this was the last contact allowed
            if remaining_contacts == 0:
                response_data['warning'] = 'This business has reached the maximum contact limit (3 messages). They must register to receive more messages.'
            elif remaining_contacts == 1:
                response_data['info'] = 'This business can only be contacted 1 more time before reaching the limit.'
            
            return JsonResponse(response_data)
        else:
            logger.error(f"SMS failed for {data['businessName']}: {sms_result.get('error')}")
            
            return JsonResponse({
                'success': False,
                'error': sms_result.get('error', 'SMS delivery failed'),
                'code': sms_result.get('code', 'SMS_FAILED')
            }, status=500)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data',
            'code': 'INVALID_JSON'
        }, status=400)
        
    except Exception as e:
        logger.error(f"Unexpected error in send_contact_sms: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }, status=500)

@require_http_methods(["POST"])
@csrf_exempt  # For webhook from Africa's Talking
def sms_delivery_callback(request) -> JsonResponse:
    """
    Webhook endpoint for SMS delivery status updates from Africa's Talking
    
    POST /api/business/sms-delivery-callback
    """
    
    try:
        data = json.loads(request.body)
        
        # Process delivery status update
        message_id = data.get('id')
        status = data.get('status')  # 'Success', 'Failed', etc.
        
        if message_id and status:
            _update_sms_delivery_status(message_id, status)
            
            logger.info(f"SMS delivery status updated: {message_id} -> {status}")
            
        return JsonResponse({'success': True})
        
    except Exception as e:
        logger.error(f"Error processing SMS delivery callback: {str(e)}")
        return JsonResponse({'success': False}, status=500)

@require_http_methods(["POST"])
@login_required
def convert_placeholder_to_verified(request) -> JsonResponse:
    """
    Convert placeholder business to verified (unlimited messaging)
    Called when business completes registration and verification
    
    POST /api/business/convert-to-verified
    {
        "phone": "+254701234567",
        "businessId": "ph1"
    }
    """
    
    try:
        data = json.loads(request.body)
        business_phone = data.get('phone', '').strip()
        business_id = data.get('businessId', '')
        
        if not business_phone:
            return JsonResponse({
                'success': False,
                'error': 'Phone number required',
                'code': 'MISSING_PHONE'
            }, status=400)
        
        # Find placeholder business
        placeholder_business = PlaceholderBusiness.objects.filter(
            phone=business_phone
        ).first()
        
        if not placeholder_business:
            return JsonResponse({
                'success': False,
                'error': 'Placeholder business not found',
                'code': 'BUSINESS_NOT_FOUND'
            }, status=404)
        
        if placeholder_business.converted_to_real_business:
            return JsonResponse({
                'success': False,
                'error': 'Business already converted to verified',
                'code': 'ALREADY_VERIFIED'
            }, status=409)
        
        # Convert to unlimited messaging
        placeholder_business.reset_to_unlimited(request.user)
        
        logger.info(f"Converted placeholder business {placeholder_business.name} to verified with unlimited messaging")
        
        return JsonResponse({
            'success': True,
            'message': 'Business converted to verified with unlimited messaging',
            'previousContactCount': placeholder_business.contact_count,
            'newLimit': 'unlimited'
        })
        
    except Exception as e:
        logger.error(f"Error converting placeholder to verified: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Internal server error',
            'code': 'CONVERSION_ERROR'
        }, status=500)

@require_http_methods(["POST"])
@csrf_exempt  # For SMS replies
def sms_reply_callback(request) -> JsonResponse:
    """
    Handle SMS replies (including STOP requests)
    
    POST /api/business/sms-reply-callback
    """
    
    try:
        data = json.loads(request.body)
        
        phone_number = data.get('from', '').strip()
        message = data.get('text', '').strip().upper()
        
        if message == 'STOP':
            # Handle opt-out request
            _handle_opt_out(phone_number)
            logger.info(f"Business opted out: {phone_number}")
        elif 'DOTT' in message or 'JOIN' in message:
            # Business showing interest
            _handle_business_interest(phone_number, message)
            logger.info(f"Business showed interest: {phone_number}")
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        logger.error(f"Error processing SMS reply: {str(e)}")
        return JsonResponse({'success': False}, status=500)

# Helper functions

def _is_valid_african_phone(phone: str) -> bool:
    """Validate African phone number formats"""
    if not phone.startswith('+'):
        return False
    
    # Remove + and check if it's a valid African country code
    number = phone[1:]
    
    african_codes = [
        '254',  # Kenya
        '211',  # South Sudan
        '256',  # Uganda
        '255',  # Tanzania
        '234',  # Nigeria
        '233',  # Ghana
        '250',  # Rwanda
        '27',   # South Africa
        '251',  # Ethiopia
        '260',  # Zambia
    ]
    
    return any(number.startswith(code) for code in african_codes)

def _check_business_contact_limits(business_phone: str, business_id: str, customer_id: int) -> Dict[str, Any]:
    """
    Check if business can be contacted based on various limits:
    - 3 message limit for placeholders
    - 24-hour customer rate limit
    - Opt-out status
    - Conversion status
    """
    from datetime import datetime, timedelta
    
    try:
        # Try to find existing placeholder business
        placeholder_business = PlaceholderBusiness.objects.filter(
            phone=business_phone
        ).first()
        
        if not placeholder_business:
            # Create new placeholder business entry
            placeholder_business = PlaceholderBusiness.objects.create(
                name=business_id,  # Temporary, will be updated with real name
                phone=business_phone,
                country=_extract_country_from_phone(business_phone),
                source='marketplace_contact',
                max_contact_limit=3  # Default for placeholders
            )
        
        # Check if business can be contacted
        if not placeholder_business.can_be_contacted():
            if placeholder_business.opted_out:
                return {
                    'can_contact': False,
                    'error': 'This business has opted out of receiving messages.',
                    'code': 'BUSINESS_OPTED_OUT',
                    'status_code': 403
                }
            elif placeholder_business.converted_to_real_business:
                return {
                    'can_contact': False,
                    'error': 'This business has already joined Dott. Please contact them directly through their business profile.',
                    'code': 'BUSINESS_ALREADY_REGISTERED',
                    'status_code': 409
                }
            elif placeholder_business.contact_limit_reached:
                return {
                    'can_contact': False,
                    'error': f'This business has reached the maximum contact limit ({placeholder_business.max_contact_limit} messages). They must register with Dott to receive more messages.',
                    'code': 'CONTACT_LIMIT_REACHED',
                    'status_code': 429,
                    'details': {
                        'contactCount': placeholder_business.contact_count,
                        'maxLimit': placeholder_business.max_contact_limit,
                        'lastContacted': placeholder_business.last_contacted.isoformat() if placeholder_business.last_contacted else None
                    }
                }
        
        # Check customer rate limiting (24 hours)
        recent_contact = BusinessContactLog.objects.filter(
            customer_id=customer_id,
            business_phone=business_phone,
            contacted_at__gte=datetime.now() - timedelta(hours=24)
        ).first()
        
        if recent_contact:
            return {
                'can_contact': False,
                'error': 'You already contacted this business recently. Please wait 24 hours before contacting again.',
                'code': 'CUSTOMER_RATE_LIMITED',
                'status_code': 429,
                'details': {
                    'lastContactedAt': recent_contact.contacted_at.isoformat(),
                    'nextAllowedAt': (recent_contact.contacted_at + timedelta(hours=24)).isoformat()
                }
            }
        
        # All checks passed
        return {
            'can_contact': True,
            'placeholder_business': placeholder_business,
            'remaining_contacts': placeholder_business.get_remaining_contacts()
        }
        
    except Exception as e:
        logger.error(f"Error checking business contact limits: {str(e)}")
        return {
            'can_contact': False,
            'error': 'Unable to verify contact limits. Please try again.',
            'code': 'LIMIT_CHECK_ERROR',
            'status_code': 500
        }

def _log_contact_attempt(customer: User, business_data: Dict[str, Any], sms_result: Dict[str, Any]) -> int:
    """
    Log contact attempt to database and increment placeholder business count
    Returns remaining contact count for the business
    """
    try:
        from datetime import datetime
        
        # Find or create placeholder business
        placeholder_business = PlaceholderBusiness.objects.filter(
            phone=business_data['businessPhone']
        ).first()
        
        if not placeholder_business:
            placeholder_business = PlaceholderBusiness.objects.create(
                name=business_data['businessName'],
                phone=business_data['businessPhone'],
                address=business_data.get('businessAddress', ''),
                category=business_data.get('businessCategory', ''),
                country=business_data.get('businessCountry', ''),
                source=business_data.get('source', 'marketplace_contact'),
                max_contact_limit=3
            )
        
        # Create contact log entry
        contact_log = BusinessContactLog.objects.create(
            placeholder_business=placeholder_business,
            business_phone=business_data['businessPhone'],
            business_name=business_data['businessName'],
            customer=customer,
            customer_name=getattr(customer, 'first_name', '') or customer.username,
            customer_request=business_data['customerRequest'],
            sms_message_id=sms_result.get('message_id', ''),
            sms_status='sent',
            sms_cost=sms_result.get('cost', 0)
        )
        
        # Increment contact count on placeholder business
        placeholder_business.increment_contact_count()
        
        logger.info(f"Contact logged: {customer.username} -> {business_data['businessName']} [{placeholder_business.contact_count}/{placeholder_business.max_contact_limit}]")
        
        return placeholder_business.get_remaining_contacts()
        
    except Exception as e:
        logger.error(f"Error logging contact attempt: {str(e)}")
        return 0  # Return 0 if logging failed

def _update_sms_delivery_status(message_id: str, status: str):
    """
    Update SMS delivery status in database
    """
    try:
        # TODO: Update BusinessContactLog model
        # BusinessContactLog.objects.filter(sms_message_id=message_id).update(sms_status=status)
        pass
    except Exception as e:
        logger.error(f"Error updating SMS status: {str(e)}")

def _handle_opt_out(phone_number: str):
    """
    Handle business opt-out (STOP) request
    """
    try:
        # Add to SMS opt-out list
        SMSOptOut.objects.get_or_create(
            phone_number=phone_number,
            defaults={'original_message': 'STOP'}
        )
        
        # Mark placeholder business as opted out
        placeholder_business = PlaceholderBusiness.objects.filter(
            phone=phone_number
        ).first()
        
        if placeholder_business:
            placeholder_business.opted_out = True
            placeholder_business.save(update_fields=['opted_out'])
            logger.info(f"Placeholder business {placeholder_business.name} opted out")
        
        logger.info(f"Added {phone_number} to opt-out list")
        
    except Exception as e:
        logger.error(f"Error handling opt-out: {str(e)}")

def _extract_country_from_phone(phone: str) -> str:
    """Extract country code from phone number"""
    if phone.startswith('+254'):
        return 'KE'  # Kenya
    elif phone.startswith('+211'):
        return 'SS'  # South Sudan
    elif phone.startswith('+256'):
        return 'UG'  # Uganda
    elif phone.startswith('+255'):
        return 'TZ'  # Tanzania
    elif phone.startswith('+234'):
        return 'NG'  # Nigeria
    elif phone.startswith('+233'):
        return 'GH'  # Ghana
    elif phone.startswith('+250'):
        return 'RW'  # Rwanda
    elif phone.startswith('+27'):
        return 'ZA'  # South Africa
    elif phone.startswith('+251'):
        return 'ET'  # Ethiopia
    elif phone.startswith('+260'):
        return 'ZM'  # Zambia
    else:
        return 'XX'  # Unknown

def _handle_business_interest(phone_number: str, message: str):
    """
    Handle when business shows interest via SMS reply
    """
    try:
        # TODO: Create BusinessLead model entry
        # BusinessLead.objects.create(phone_number=phone_number, interest_message=message)
        logger.info(f"Business interest recorded: {phone_number}")
    except Exception as e:
        logger.error(f"Error handling business interest: {str(e)}")