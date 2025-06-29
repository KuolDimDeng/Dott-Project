from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from decimal import Decimal
import stripe
import redis
import json
import hashlib
from datetime import datetime, timedelta

from .models import (
    CreditPackage, UserCredit, CreditTransaction, 
    QueryLog, MonthlyUsage
)
from .serializers import (
    CreditPackageSerializer, UserCreditSerializer,
    CreditTransactionSerializer, QueryLogSerializer,
    MonthlyUsageSerializer, PurchaseCreditsSerializer
)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Initialize Redis for rate limiting
redis_client = None
if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        # Test connection
        redis_client.ping()
    except Exception as e:
        print(f"Redis connection failed: {e}")
        redis_client = None


class SmartInsightsViewSet(viewsets.ViewSet):
    """Main viewset for Smart Insights credit management"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def credits(self, request):
        """Get user's current credit balance"""
        # Determine initial credits based on subscription plan
        initial_credits = 5  # Default for free plan
        subscription_plan = getattr(request.user, 'subscription_plan', 'free')
        
        if subscription_plan == 'professional':
            initial_credits = 10
        elif subscription_plan == 'enterprise':
            initial_credits = 20
        
        user_credit, created = UserCredit.objects.get_or_create(
            user=request.user,
            defaults={'balance': initial_credits}
        )
        
        # Get current month usage
        now = timezone.now()
        monthly_usage, _ = MonthlyUsage.objects.get_or_create(
            user=request.user,
            year=now.year,
            month=now.month
        )
        
        return Response({
            'credits': user_credit.balance,
            'total_purchased': user_credit.total_purchased,
            'total_used': user_credit.total_used,
            'monthly_spend_limit': str(user_credit.monthly_spend_limit),
            'monthly_usage': MonthlyUsageSerializer(monthly_usage).data,
            'can_use': user_credit.balance > 0 and not monthly_usage.is_at_limit
        })
    
    @action(detail=False, methods=['post'])
    def deduct(self, request):
        """Deduct credits after a successful query"""
        amount = request.data.get('amount', 1)
        usage_data = request.data.get('usage', {})
        
        user_credit, _ = UserCredit.objects.get_or_create(user=request.user)
        
        # Check monthly limit
        now = timezone.now()
        monthly_usage, _ = MonthlyUsage.objects.get_or_create(
            user=request.user,
            year=now.year,
            month=now.month
        )
        
        if monthly_usage.is_at_limit:
            return Response(
                {'error': 'Monthly spending limit reached'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        if not user_credit.can_use_credits(amount):
            return Response(
                {'error': 'Insufficient credits'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        with transaction.atomic():
            # Deduct credits
            user_credit.deduct_credits(amount)
            
            # Record transaction
            CreditTransaction.objects.create(
                user=request.user,
                transaction_type='usage',
                amount=-amount,
                balance_after=user_credit.balance,
                description=f"AI Query - {usage_data.get('model', 'claude-3-sonnet')}"
            )
            
            # Update monthly usage (with 30% markup for cost)
            cost_per_credit = Decimal('0.10')  # Base cost per credit
            marked_up_cost = cost_per_credit * Decimal('1.30')  # 30% markup
            monthly_usage.total_credits_used += amount
            monthly_usage.total_cost += marked_up_cost * amount
            monthly_usage.query_count += 1
            monthly_usage.save()
        
        return Response({
            'success': True,
            'remaining_credits': user_credit.balance,
            'monthly_cost': str(monthly_usage.total_cost)
        })
    
    @action(detail=False, methods=['get'])
    def packages(self, request):
        """Get available credit packages"""
        try:
            packages = CreditPackage.objects.filter(is_active=True)
            serialized_data = CreditPackageSerializer(packages, many=True).data
            
            # If no packages exist, create default ones
            if not packages.exists():
                default_packages = [
                    {'name': 'Starter Pack', 'credits': 50, 'price': 6.50},
                    {'name': 'Growth Pack', 'credits': 200, 'price': 23.40},
                    {'name': 'Professional Pack', 'credits': 500, 'price': 65.00},
                    {'name': 'Enterprise Pack', 'credits': 1000, 'price': 130.00}
                ]
                
                for pkg in default_packages:
                    CreditPackage.objects.create(**pkg)
                
                packages = CreditPackage.objects.filter(is_active=True)
                serialized_data = CreditPackageSerializer(packages, many=True).data
            
            return Response({'results': serialized_data})
        except Exception as e:
            # Return mock data if there's an error
            return Response({
                'results': [
                    {
                        'id': 1,
                        'name': 'Starter Pack',
                        'credits': 50,
                        'price': '6.50',
                        'is_active': True
                    },
                    {
                        'id': 2,
                        'name': 'Growth Pack',
                        'credits': 200,
                        'price': '23.40',
                        'is_active': True
                    },
                    {
                        'id': 3,
                        'name': 'Professional Pack',
                        'credits': 500,
                        'price': '65.00',
                        'is_active': True
                    },
                    {
                        'id': 4,
                        'name': 'Enterprise Pack',
                        'credits': 1000,
                        'price': '130.00',
                        'is_active': True
                    }
                ]
            })
    
    @action(detail=False, methods=['post'])
    def purchase(self, request):
        """Purchase credits with Stripe"""
        serializer = PurchaseCreditsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        package = CreditPackage.objects.get(id=serializer.validated_data['package_id'])
        
        # Check monthly spending limit
        user_credit, _ = UserCredit.objects.get_or_create(user=request.user)
        now = timezone.now()
        monthly_usage, _ = MonthlyUsage.objects.get_or_create(
            user=request.user,
            year=now.year,
            month=now.month
        )
        
        if monthly_usage.total_cost + package.price > user_credit.monthly_spend_limit:
            return Response(
                {'error': f'Purchase would exceed monthly limit of ${user_credit.monthly_spend_limit}'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        try:
            # Get success and cancel URLs
            frontend_url = settings.FRONTEND_URL
            success_url = f"{frontend_url}/dashboard?smart_insights_purchase=success"
            cancel_url = f"{frontend_url}/dashboard?smart_insights_purchase=cancelled"
            
            # Create Stripe checkout session
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'unit_amount': int(package.price * 100),  # Convert to cents
                        'product_data': {
                            'name': package.name,
                            'description': f"{package.credits} Smart Insights credits",
                        },
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=request.user.email,
                metadata={
                    'user_id': str(request.user.id),
                    'package_id': str(package.id),
                    'credits': package.credits
                }
            )
            
            return Response({
                'checkout_url': checkout_session.url,
                'session_id': checkout_session.id,
                'amount': str(package.price),
                'credits': package.credits
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def confirm_purchase(self, request):
        """Confirm purchase after Stripe payment"""
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response(
                {'error': 'Payment intent ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status != 'succeeded':
                return Response(
                    {'error': 'Payment not completed'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get package info from metadata
            package_id = intent.metadata.get('package_id')
            credits = int(intent.metadata.get('credits', 0))
            
            # Add credits to user account
            user_credit, _ = UserCredit.objects.get_or_create(user=request.user)
            
            with transaction.atomic():
                user_credit.add_credits(credits)
                
                # Record transaction
                CreditTransaction.objects.create(
                    user=request.user,
                    transaction_type='purchase',
                    amount=credits,
                    balance_after=user_credit.balance,
                    description=f"Purchased {credits} credits",
                    stripe_payment_intent_id=payment_intent_id
                )
                
                # Update monthly usage
                now = timezone.now()
                monthly_usage, _ = MonthlyUsage.objects.get_or_create(
                    user=request.user,
                    year=now.year,
                    month=now.month
                )
                monthly_usage.total_cost += Decimal(str(intent.amount / 100))
                monthly_usage.save()
            
            return Response({
                'success': True,
                'credits_added': credits,
                'new_balance': user_credit.balance
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def query(self, request):
        """Process an AI query using Claude"""
        query_text = request.data.get('query', '').strip()
        
        if not query_text:
            return Response(
                {'error': 'Query is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check rate limit
        if redis_client:
            key = f"smart_insights:rate_limit:{request.user.id}"
            try:
                current = redis_client.incr(key)
                if current == 1:
                    redis_client.expire(key, 60)  # 1 minute expiry
                if current > 10:
                    return Response(
                        {'error': 'Rate limit exceeded. Please wait a minute.'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )
            except:
                pass  # Continue if Redis fails
        
        # Check user credits with plan-based initial credits
        initial_credits = 5  # Default for free plan
        subscription_plan = getattr(request.user, 'subscription_plan', 'free')
        
        if subscription_plan == 'professional':
            initial_credits = 10
        elif subscription_plan == 'enterprise':
            initial_credits = 20
            
        user_credit, _ = UserCredit.objects.get_or_create(
            user=request.user,
            defaults={'balance': initial_credits}
        )
        
        if user_credit.balance <= 0:
            return Response(
                {'error': 'Insufficient credits'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Check monthly limit
        now = timezone.now()
        monthly_usage, _ = MonthlyUsage.objects.get_or_create(
            user=request.user,
            year=now.year,
            month=now.month
        )
        
        if monthly_usage.is_at_limit:
            return Response(
                {'error': 'Monthly spending limit reached'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        try:
            import anthropic
            print(f"[Smart Insights] Anthropic version: {anthropic.__version__}")
            print(f"[Smart Insights] API key present: {bool(settings.CLAUDE_API_KEY)}")
            
            # Initialize Claude client
            client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
            print("[Smart Insights] Client initialized successfully")
            
            # Call Claude API
            response = client.messages.create(
                model=settings.CLAUDE_API_MODEL,
                max_tokens=settings.CLAUDE_API_MAX_TOKENS,
                messages=[
                    {
                        "role": "user",
                        "content": f"You are a business intelligence assistant. Answer this query based on general business knowledge: {query_text}"
                    }
                ]
            )
            
            # Extract response
            ai_response = response.content[0].text
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            total_tokens = input_tokens + output_tokens
            
            # Calculate credits used (1 credit per query for now)
            credits_used = 1
            
            with transaction.atomic():
                # Deduct credits
                user_credit.deduct_credits(credits_used)
                
                # Log the query
                QueryLog.objects.create(
                    user=request.user,
                    query=query_text,
                    response=ai_response,
                    model_used=settings.CLAUDE_API_MODEL,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    credits_used=credits_used
                )
                
                # Update monthly usage
                cost_per_credit = Decimal('0.10')
                marked_up_cost = cost_per_credit * Decimal('1.30')
                monthly_usage.total_credits_used += credits_used
                monthly_usage.total_cost += marked_up_cost * credits_used
                monthly_usage.query_count += 1
                monthly_usage.save()
            
            return Response({
                'response': ai_response,
                'credits_used': credits_used,
                'remaining_credits': user_credit.balance,
                'input_tokens': input_tokens,
                'output_tokens': output_tokens,
                'total_tokens': total_tokens
            })
            
        except Exception as e:
            print(f"[Smart Insights] Error processing query: {str(e)}")
            print(f"[Smart Insights] Error type: {type(e)}")
            import traceback
            print(f"[Smart Insights] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to process query: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get user's transaction history"""
        transactions = CreditTransaction.objects.filter(
            user=request.user
        )[:50]  # Last 50 transactions
        
        return Response(CreditTransactionSerializer(transactions, many=True).data)
    
    @action(detail=False, methods=['get'])
    def query_history(self, request):
        """Get user's query history"""
        queries = QueryLog.objects.filter(
            user=request.user
        )[:20]  # Last 20 queries
        
        return Response(QueryLogSerializer(queries, many=True).data)
    
    @action(detail=False, methods=['post'])
    def check_rate_limit(self, request):
        """Check if user is rate limited"""
        if not redis_client:
            return Response({'allowed': True})
        
        # Create rate limit key
        key = f"smart_insights:rate_limit:{request.user.id}"
        
        try:
            # Get current count
            current = redis_client.get(key)
            if current is None:
                current = 0
            else:
                current = int(current)
            
            # Check limit (10 requests per minute)
            if current >= 10:
                return Response({
                    'allowed': False,
                    'message': 'Rate limit exceeded. Please wait before making more requests.'
                })
            
            # Increment counter
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, 60)  # 60 seconds expiry
            pipe.execute()
            
            return Response({
                'allowed': True,
                'remaining': 10 - current - 1
            })
            
        except Exception as e:
            # If Redis fails, allow the request
            return Response({'allowed': True})


class StripeWebhookView(viewsets.ViewSet):
    """Handle Stripe webhooks"""
    permission_classes = []  # No auth for webhooks
    
    @action(detail=False, methods=['post'])
    def webhook(self, request):
        """Process Stripe webhook events"""
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError:
            return Response(status=400)
        except stripe.error.SignatureVerificationError:
            return Response(status=400)
        
        # Handle the event
        if event['type'] == 'checkout.session.completed':
            # Handle successful checkout
            session = event['data']['object']
            user_id = session['metadata'].get('user_id')
            package_id = session['metadata'].get('package_id')
            credits = int(session['metadata'].get('credits', 0))
            
            if user_id and credits > 0:
                try:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user = User.objects.get(id=user_id)
                    
                    # Add credits to user account
                    user_credit, _ = UserCredit.objects.get_or_create(user=user)
                    
                    with transaction.atomic():
                        user_credit.add_credits(credits)
                        
                        # Record transaction
                        CreditTransaction.objects.create(
                            user=user,
                            transaction_type='purchase',
                            amount=credits,
                            balance_before=user_credit.balance - credits,
                            balance_after=user_credit.balance,
                            description=f"Purchased {credits} credits via Stripe",
                            stripe_payment_intent_id=session.get('payment_intent')
                        )
                        
                        # Update monthly usage
                        now = timezone.now()
                        monthly_usage, _ = MonthlyUsage.objects.get_or_create(
                            user=user,
                            year=now.year,
                            month=now.month
                        )
                        monthly_usage.total_cost += Decimal(str(session['amount_total'] / 100))
                        monthly_usage.save()
                except Exception as e:
                    print(f"Error processing webhook: {e}")
                    
        elif event['type'] == 'payment_intent.succeeded':
            # Payment successful - credits should already be added
            # via checkout.session.completed event
            pass
        elif event['type'] == 'payment_intent.payment_failed':
            # Handle failed payment
            payment_intent = event['data']['object']
            # Log the failure
            pass
        
        return Response({'received': True})