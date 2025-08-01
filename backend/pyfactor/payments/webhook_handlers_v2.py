# payments/webhook_handlers_v2.py - Enhanced Webhook Handlers
import json
import logging
from typing import Dict, Any

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.db import transaction as db_transaction

from .models import PaymentGateway, WebhookEvent, Transaction
from .utils import PaymentProcessorFactory, get_client_ip, create_audit_log

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class UnifiedWebhookHandler(View):
    """Unified webhook handler for all payment gateways"""
    
    def post(self, request, gateway_name):
        """Handle webhook for specified gateway"""
        logger.debug(f"🎯 [UnifiedWebhookHandler] === START === Gateway: {gateway_name}")
        
        try:
            # Get gateway
            try:
                gateway = PaymentGateway.objects.get(name=gateway_name.upper(), status='active')
            except PaymentGateway.DoesNotExist:
                logger.error(f"🎯 [UnifiedWebhookHandler] Gateway not found: {gateway_name}")
                return HttpResponseBadRequest("Gateway not found")
            
            # Get raw payload
            payload = request.body.decode('utf-8')
            headers = dict(request.META)
            
            # Clean headers (remove HTTP_ prefix)
            clean_headers = {}
            for key, value in headers.items():
                if key.startswith('HTTP_'):
                    clean_key = key[5:].replace('_', '-').lower()
                    clean_headers[clean_key] = value
                elif key in ['CONTENT_TYPE', 'CONTENT_LENGTH']:
                    clean_headers[key.lower().replace('_', '-')] = value
            
            logger.debug(f"🎯 [UnifiedWebhookHandler] Payload length: {len(payload)}")
            logger.debug(f"🎯 [UnifiedWebhookHandler] Headers: {list(clean_headers.keys())}")
            
            # Get processor and verify signature
            processor = PaymentProcessorFactory.get_processor(gateway)
            
            # Get signature from headers (different for each gateway)
            signature = None
            if gateway_name.lower() == 'stripe':
                signature = clean_headers.get('stripe-signature')
            elif gateway_name.lower() == 'flutterwave':
                signature = clean_headers.get('verif-hash')
            elif gateway_name.lower() == 'mpesa':
                # M-Pesa doesn't use signatures, verify by other means
                signature = 'verified'
            
            # Verify webhook signature
            if signature and not processor.verify_webhook_signature(payload, signature, clean_headers):
                logger.error(f"🎯 [UnifiedWebhookHandler] Signature verification failed for {gateway_name}")
                
                # Create audit log for security event
                create_audit_log(
                    user=None,
                    action='security_event',
                    description=f"Webhook signature verification failed for {gateway_name}",
                    gateway=gateway,
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    risk_level='high',
                    metadata={'gateway': gateway_name, 'signature_provided': bool(signature)}
                )
                
                return HttpResponseForbidden("Invalid signature")
            
            # Parse payload
            try:
                payload_data = json.loads(payload) if payload else {}
            except json.JSONDecodeError:
                logger.error(f"🎯 [UnifiedWebhookHandler] Invalid JSON payload for {gateway_name}")
                return HttpResponseBadRequest("Invalid JSON payload")
            
            # Determine event type
            event_type = self._extract_event_type(gateway_name, payload_data)
            event_id = self._extract_event_id(gateway_name, payload_data)
            
            logger.debug(f"🎯 [UnifiedWebhookHandler] Event type: {event_type}, Event ID: {event_id}")
            
            # Create webhook event record
            with db_transaction.atomic():
                webhook_event, created = WebhookEvent.objects.get_or_create(
                    gateway=gateway,
                    event_id=event_id,
                    defaults={\n                        'event_type': event_type,\n                        'payload': payload_data,\n                        'headers': clean_headers,\n                        'signature': signature,\n                        'source_ip': get_client_ip(request),\n                        'verified': bool(signature)\n                    }\n                )\n                \n                if not created:\n                    # Duplicate webhook - just acknowledge\n                    logger.debug(f\"🎯 [UnifiedWebhookHandler] Duplicate webhook event: {event_id}\")\n                    return HttpResponse(\"OK\")\n                \n                # Process webhook\n                try:\n                    result = processor.process_webhook(event_type, payload_data)\n                    \n                    if result.success:\n                        webhook_event.processed = True\n                        webhook_event.processed_at = timezone.now()\n                        \n                        # Link to transaction if found\n                        transaction = self._find_related_transaction(gateway_name, payload_data)\n                        if transaction:\n                            webhook_event.transaction = transaction\n                            logger.debug(f\"🎯 [UnifiedWebhookHandler] Linked to transaction: {transaction.reference_number}\")\n                        \n                        webhook_event.save()\n                        \n                        logger.debug(f\"🎯 [UnifiedWebhookHandler] Webhook processed successfully\")\n                        \n                        # Create audit log\n                        create_audit_log(\n                            user=None,\n                            action='webhook_processed',\n                            description=f\"Processed {event_type} webhook from {gateway_name}\",\n                            gateway=gateway,\n                            transaction=transaction,\n                            ip_address=get_client_ip(request),\n                            user_agent=request.META.get('HTTP_USER_AGENT', ''),\n                            metadata={'event_type': event_type, 'event_id': event_id}\n                        )\n                        \n                        return HttpResponse(\"OK\")\n                    else:\n                        webhook_event.processing_error = result.error_message\n                        webhook_event.processing_attempts += 1\n                        webhook_event.save()\n                        \n                        logger.error(f\"🎯 [UnifiedWebhookHandler] Webhook processing failed: {result.error_message}\")\n                        \n                        return HttpResponseBadRequest(f\"Processing failed: {result.error_message}\")\n                        \n                except Exception as e:\n                    webhook_event.processing_error = str(e)\n                    webhook_event.processing_attempts += 1\n                    webhook_event.save()\n                    \n                    logger.error(f\"🎯 [UnifiedWebhookHandler] Exception processing webhook: {str(e)}\", exc_info=True)\n                    \n                    # Create audit log for error\n                    create_audit_log(\n                        user=None,\n                        action='webhook_processing_error',\n                        description=f\"Error processing {event_type} webhook from {gateway_name}\",\n                        gateway=gateway,\n                        ip_address=get_client_ip(request),\n                        user_agent=request.META.get('HTTP_USER_AGENT', ''),\n                        risk_level='medium',\n                        metadata={'event_type': event_type, 'error': str(e)}\n                    )\n                    \n                    return HttpResponseBadRequest(f\"Processing error: {str(e)}\")\n                    \n        except Exception as e:\n            logger.error(f\"🎯 [UnifiedWebhookHandler] Unexpected error: {str(e)}\", exc_info=True)\n            return HttpResponseBadRequest(f\"Server error: {str(e)}\")\n    \n    def _extract_event_type(self, gateway_name: str, payload: Dict[str, Any]) -> str:\n        \"\"\"Extract event type from payload based on gateway\"\"\"\n        if gateway_name.lower() == 'stripe':\n            return payload.get('type', 'unknown')\n        elif gateway_name.lower() == 'flutterwave':\n            return payload.get('event', 'unknown')\n        elif gateway_name.lower() == 'mpesa':\n            # M-Pesa has different callback structures\n            if 'stkCallback' in payload:\n                return 'stk_callback'\n            elif 'Result' in payload:\n                return 'b2c_callback'\n            else:\n                return 'unknown'\n        else:\n            return payload.get('type', payload.get('event', 'unknown'))\n    \n    def _extract_event_id(self, gateway_name: str, payload: Dict[str, Any]) -> str:\n        \"\"\"Extract unique event ID from payload\"\"\"\n        if gateway_name.lower() == 'stripe':\n            return payload.get('id', '')\n        elif gateway_name.lower() == 'flutterwave':\n            return payload.get('id', payload.get('txRef', ''))\n        elif gateway_name.lower() == 'mpesa':\n            if 'stkCallback' in payload:\n                return payload['stkCallback'].get('CheckoutRequestID', '')\n            elif 'Result' in payload:\n                return payload['Result'].get('ConversationID', '')\n            else:\n                return str(payload.get('id', ''))\n        else:\n            return str(payload.get('id', payload.get('event_id', '')))\n    \n    def _find_related_transaction(self, gateway_name: str, payload: Dict[str, Any]) -> 'Transaction':\n        \"\"\"Find related transaction from webhook payload\"\"\"\n        try:\n            transaction_ref = None\n            \n            if gateway_name.lower() == 'stripe':\n                # For Stripe, check metadata in the payment intent/charge\n                data_obj = payload.get('data', {}).get('object', {})\n                metadata = data_obj.get('metadata', {})\n                transaction_ref = metadata.get('transaction_id')\n                \n            elif gateway_name.lower() == 'flutterwave':\n                # For Flutterwave, use txRef\n                transaction_ref = payload.get('txRef')\n                if transaction_ref:\n                    # Try to find by reference number\n                    try:\n                        return Transaction.objects.get(reference_number=transaction_ref)\n                    except Transaction.DoesNotExist:\n                        pass\n                        \n            elif gateway_name.lower() == 'mpesa':\n                # For M-Pesa, check callback metadata\n                if 'stkCallback' in payload:\n                    checkout_id = payload['stkCallback'].get('CheckoutRequestID')\n                    if checkout_id:\n                        try:\n                            return Transaction.objects.get(gateway_transaction_id=checkout_id)\n                        except Transaction.DoesNotExist:\n                            pass\n            \n            # Try to find by transaction ID if we have it\n            if transaction_ref:\n                try:\n                    return Transaction.objects.get(id=transaction_ref)\n                except (Transaction.DoesNotExist, ValueError):\n                    pass\n            \n            return None\n            \n        except Exception as e:\n            logger.error(f\"Error finding related transaction: {str(e)}\")\n            return None\n\n# Individual gateway webhook handlers for backward compatibility\n@csrf_exempt\n@require_http_methods([\"POST\"])\ndef stripe_webhook_handler(request):\n    \"\"\"Stripe-specific webhook handler\"\"\"\n    handler = UnifiedWebhookHandler()\n    return handler.post(request, 'stripe')\n\n@csrf_exempt\n@require_http_methods([\"POST\"])\ndef flutterwave_webhook_handler(request):\n    \"\"\"Flutterwave-specific webhook handler\"\"\"\n    handler = UnifiedWebhookHandler()\n    return handler.post(request, 'flutterwave')\n\n@csrf_exempt\n@require_http_methods([\"POST\"])\ndef mpesa_webhook_handler(request):\n    \"\"\"M-Pesa-specific webhook handler\"\"\"\n    handler = UnifiedWebhookHandler()\n    return handler.post(request, 'mpesa')\n\n@csrf_exempt\n@require_http_methods([\"POST\"])\ndef bank_transfer_webhook_handler(request):\n    \"\"\"Bank transfer webhook handler (if applicable)\"\"\"\n    handler = UnifiedWebhookHandler()\n    return handler.post(request, 'bank_transfer')\n\n# Webhook management views\nclass WebhookStatusView(View):\n    \"\"\"View webhook processing status and retry failed webhooks\"\"\"\n    \n    def get(self, request):\n        \"\"\"Get webhook processing statistics\"\"\"\n        from django.http import JsonResponse\n        from django.db.models import Count, Q\n        from datetime import datetime, timedelta\n        \n        try:\n            # Get statistics for the last 24 hours\n            since = datetime.now() - timedelta(hours=24)\n            \n            stats = WebhookEvent.objects.filter(\n                created_at__gte=since\n            ).aggregate(\n                total=Count('id'),\n                processed=Count('id', filter=Q(processed=True)),\n                failed=Count('id', filter=Q(processed=False, processing_attempts__gt=0)),\n                pending=Count('id', filter=Q(processed=False, processing_attempts=0))\n            )\n            \n            # Get stats by gateway\n            gateway_stats = WebhookEvent.objects.filter(\n                created_at__gte=since\n            ).values('gateway__name').annotate(\n                total=Count('id'),\n                processed=Count('id', filter=Q(processed=True)),\n                failed=Count('id', filter=Q(processed=False, processing_attempts__gt=0))\n            ).order_by('gateway__name')\n            \n            return JsonResponse({\n                \"success\": True,\n                \"data\": {\n                    \"overall\": stats,\n                    \"by_gateway\": list(gateway_stats)\n                },\n                \"message\": \"Webhook statistics retrieved successfully\"\n            })\n            \n        except Exception as e:\n            logger.error(f\"Error getting webhook statistics: {str(e)}\", exc_info=True)\n            return JsonResponse({\n                \"success\": False,\n                \"data\": {},\n                \"message\": f\"Error retrieving webhook statistics: {str(e)}\"\n            }, status=500)\n    \n    def post(self, request):\n        \"\"\"Retry failed webhooks\"\"\"\n        from django.http import JsonResponse\n        \n        try:\n            # Get failed webhooks from the last 24 hours\n            since = datetime.now() - timedelta(hours=24)\n            failed_webhooks = WebhookEvent.objects.filter(\n                created_at__gte=since,\n                processed=False,\n                processing_attempts__lt=3  # Don't retry too many times\n            )\n            \n            retry_count = 0\n            success_count = 0\n            \n            for webhook in failed_webhooks:\n                try:\n                    processor = PaymentProcessorFactory.get_processor(webhook.gateway)\n                    result = processor.process_webhook(webhook.event_type, webhook.payload)\n                    \n                    webhook.processing_attempts += 1\n                    \n                    if result.success:\n                        webhook.processed = True\n                        webhook.processed_at = timezone.now()\n                        webhook.processing_error = ''\n                        success_count += 1\n                    else:\n                        webhook.processing_error = result.error_message\n                    \n                    webhook.save()\n                    retry_count += 1\n                    \n                except Exception as e:\n                    webhook.processing_attempts += 1\n                    webhook.processing_error = str(e)\n                    webhook.save()\n                    retry_count += 1\n                    logger.error(f\"Error retrying webhook {webhook.id}: {str(e)}\")\n            \n            return JsonResponse({\n                \"success\": True,\n                \"data\": {\n                    \"retried\": retry_count,\n                    \"successful\": success_count,\n                    \"failed\": retry_count - success_count\n                },\n                \"message\": f\"Retried {retry_count} webhooks, {success_count} successful\"\n            })\n            \n        except Exception as e:\n            logger.error(f\"Error retrying webhooks: {str(e)}\", exc_info=True)\n            return JsonResponse({\n                \"success\": False,\n                \"data\": {},\n                \"message\": f\"Error retrying webhooks: {str(e)}\"\n            }, status=500)\n\n# Utility function for webhook URL generation\ndef get_webhook_url(gateway_name: str, request=None) -> str:\n    \"\"\"Generate webhook URL for a gateway\"\"\"\n    if request:\n        base_url = request.build_absolute_uri('/')[:-1]  # Remove trailing slash\n    else:\n        base_url = getattr(settings, 'SITE_URL', 'https://api.dottapps.com')\n    \n    return f\"{base_url}/api/payments/webhooks/{gateway_name.lower()}/\"\n\n# Webhook URL patterns for easy reference\nWEBHOOK_URLS = {\n    'stripe': '/api/payments/webhooks/stripe/',\n    'flutterwave': '/api/payments/webhooks/flutterwave/',\n    'mpesa': '/api/payments/webhooks/mpesa/',\n    'bank_transfer': '/api/payments/webhooks/bank_transfer/',\n    'unified': '/api/payments/webhooks/<gateway_name>/',\n}