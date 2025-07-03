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
import math
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
            # Return updated mock data if there's an error
            return Response({
                'results': [
                    {
                        'id': 'starter',
                        'name': 'Starter Pack',
                        'credits': 100,
                        'price': '13.00',
                        'is_active': True
                    },
                    {
                        'id': 'growth',
                        'name': 'Growth Pack',
                        'credits': 500,
                        'price': '65.00',
                        'is_active': True
                    },
                    {
                        'id': 'professional',
                        'name': 'Professional Pack',
                        'credits': 1000,
                        'price': '130.00',
                        'is_active': True
                    },
                    {
                        'id': 'enterprise',
                        'name': 'Enterprise Pack',
                        'credits': 2500,
                        'price': '325.00',
                        'is_active': True
                    }
                ]
            })
    
    @action(detail=False, methods=['post'])
    def purchase(self, request):
        """Purchase credits with Stripe"""
        try:
            package_id = request.data.get('package_id')
            print(f"[Smart Insights] Purchase request for package_id: {package_id}")
            
            # For mock packages, create a temporary object
            if isinstance(package_id, str) and package_id in ['starter', 'growth', 'professional', 'enterprise']:
                # Map string IDs to package data
                package_map = {
                    'starter': {'name': 'Starter Pack', 'credits': 100, 'price': Decimal('13.00')},
                    'growth': {'name': 'Growth Pack', 'credits': 500, 'price': Decimal('65.00')},
                    'professional': {'name': 'Professional Pack', 'credits': 1000, 'price': Decimal('130.00')},
                    'enterprise': {'name': 'Enterprise Pack', 'credits': 2500, 'price': Decimal('325.00')}
                }
                
                if package_id not in package_map:
                    return Response({'error': 'Invalid package'}, status=status.HTTP_404_NOT_FOUND)
                
                # Create a temporary package object
                package = type('Package', (), package_map[package_id])()
            else:
                # Try to get from database
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
                    'package_id': str(getattr(package, 'id', package_id)),
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
                print(f"[Smart Insights] Stripe error: {str(e)}")
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            print(f"[Smart Insights] Purchase error: {str(e)}")
            import traceback
            print(f"[Smart Insights] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
            print(f"[Smart Insights] Smart Insights API key present: {bool(settings.CLAUDE_SMART_INSIGHTS_API_KEY)}")
            print(f"[Smart Insights] Smart Insights API key length: {len(settings.CLAUDE_SMART_INSIGHTS_API_KEY) if settings.CLAUDE_SMART_INSIGHTS_API_KEY else 0}")
            
            if not settings.CLAUDE_SMART_INSIGHTS_API_KEY:
                raise ValueError("CLAUDE_SMART_INSIGHTS_API_KEY environment variable is not set")
            
            # Initialize Claude client for Smart Insights
            client = anthropic.Anthropic(api_key=settings.CLAUDE_SMART_INSIGHTS_API_KEY)
            print("[Smart Insights] Client initialized successfully")
            
            # Fetch business data for context
            business_context = self._get_business_context(request.user)
            
            # Call Claude API with business context
            response = client.messages.create(
                model=settings.CLAUDE_SMART_INSIGHTS_MODEL,
                max_tokens=settings.CLAUDE_SMART_INSIGHTS_MAX_TOKENS,
                system="""You are a business intelligence assistant that helps analyze business data and create visualizations. 
When users ask for charts, graphs, or visualizations, you MUST include chart data in JSON format within ```json code blocks.
Never use ASCII art or text-based charts. Always use the proper JSON format for Chart.js compatibility.
Supported chart types: bar, line, doughnut, pie.""",
                messages=[
                    {
                        "role": "user",
                        "content": f"""You are a business intelligence assistant for this company. Answer the following query using the provided business data and insights.

BUSINESS DATA:
{business_context}

USER QUERY: {query_text}

IMPORTANT INSTRUCTIONS FOR CHARTS:
1. When the user asks for charts, visualizations, or includes words like "show", "display", "chart", "graph", "visualize":
   - Include chart data in your response using this EXACT JSON format within code blocks:
   
   ```json
   {{
     "type": "bar",  // or "line", "doughnut", "pie"
     "title": "Chart Title",
     "data": {{
       "labels": ["Label1", "Label2", "Label3"],
       "datasets": [{{
         "label": "Dataset Name",
         "data": [10, 20, 30],
         "backgroundColor": "rgba(59, 130, 246, 0.2)",
         "borderColor": "rgba(59, 130, 246, 1)",
         "borderWidth": 1
       }}]
     }},
     "options": {{
       "responsive": true,
       "plugins": {{
         "title": {{
           "display": true,
           "text": "Chart Title"
         }}
       }}
     }}
   }}
   ```

2. DO NOT use ASCII art or text-based charts like ┌─────┐
3. Always include actual numeric data from the business context
4. You can include multiple charts by using multiple JSON code blocks
5. Include explanatory text along with the charts

Please provide specific insights based on the actual business data above, not generic advice."""
                    }
                ]
            )
            
            # Extract response
            ai_response = response.content[0].text
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            total_tokens = input_tokens + output_tokens
            
            # Calculate credits based on actual Claude API costs
            # Claude 3 Sonnet pricing (as of 2024):
            # Input: $3 per million tokens = $0.000003 per token
            # Output: $15 per million tokens = $0.000015 per token
            
            # Calculate actual API cost
            input_cost = Decimal(str(input_tokens)) * Decimal('0.000003')
            output_cost = Decimal(str(output_tokens)) * Decimal('0.000015')
            total_api_cost = input_cost + output_cost
            
            # 1 credit = $0.001 (0.1 cent) of API cost
            # This gives users good value while covering costs + markup
            cost_per_credit = Decimal('0.001')
            # Use proper rounding instead of always rounding up
            credits_used = max(1, int(round(total_api_cost / cost_per_credit)))
            
            print(f"[Smart Insights] Token usage - Input: {input_tokens}, Output: {output_tokens}, Total: {total_tokens}")
            print(f"[Smart Insights] API cost: ${total_api_cost:.6f}, Credits charged: {credits_used}")
            
            with transaction.atomic():
                # Deduct credits
                user_credit.deduct_credits(credits_used)
                
                # Log the query
                QueryLog.objects.create(
                    user=request.user,
                    query=query_text,
                    response=ai_response,
                    model_used=settings.CLAUDE_SMART_INSIGHTS_MODEL,
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
    
    def _get_business_context(self, user):
        """Fetch business data to provide context to Claude"""
        context_parts = []
        try:
            from crm.models import Customer
            from inventory.models import Product, Supplier
            from django.db.models import Sum, Count, Avg
            from datetime import datetime, timedelta
            
            # Try to import SalesOrder model
            try:
                from sales.models import SalesOrder
                Sale = SalesOrder
            except ImportError:
                Sale = None
            
            # Get user's tenant for data filtering
            tenant = getattr(user, 'tenant', None)
            if not tenant:
                # Try to get tenant from user's tenants relationship
                if hasattr(user, 'tenants'):
                    user_tenants = user.tenants.all()
                    if user_tenants:
                        tenant = user_tenants.first()
                    else:
                        return "No business data available - user not associated with any tenant."
                else:
                    return "No business data available - user not associated with a tenant."
            
            # Customer data
            try:
                customers = Customer.objects.filter(tenant_id=tenant.id)
                customer_count = customers.count()
                if customer_count > 0:
                    top_customers = customers.order_by('-id')[:5]  # Get recent customers as "top"
                    customer_names = []
                    for c in top_customers:
                        if hasattr(c, 'business_name') and c.business_name:
                            customer_names.append(c.business_name)
                        elif hasattr(c, 'first_name') and c.first_name:
                            full_name = f"{c.first_name} {getattr(c, 'last_name', '')}".strip()
                            customer_names.append(full_name)
                        elif hasattr(c, 'email') and c.email:
                            customer_names.append(c.email)
                    context_parts.append(f"CUSTOMERS: Total {customer_count} customers. Recent customers: {', '.join(customer_names[:3])}")
                else:
                    context_parts.append("CUSTOMERS: No customers found.")
            except Exception as e:
                context_parts.append(f"CUSTOMERS: Limited customer data available")
            
            # Product data
            try:
                products = Product.objects.filter(tenant_id=tenant.id)
                product_count = products.count()
                if product_count > 0:
                    product_names = [p.name for p in products[:5] if hasattr(p, 'name')]
                    context_parts.append(f"PRODUCTS: Total {product_count} products. Products: {', '.join(product_names)}")
                else:
                    context_parts.append("PRODUCTS: No products found.")
            except Exception as e:
                context_parts.append(f"PRODUCTS: Limited product data available")
            
            # Supplier data
            try:
                suppliers = Supplier.objects.filter(tenant_id=tenant.id)
                supplier_count = suppliers.count()
                if supplier_count > 0:
                    supplier_names = [s.name for s in suppliers[:3] if hasattr(s, 'name')]
                    context_parts.append(f"SUPPLIERS: Total {supplier_count} suppliers. Suppliers: {', '.join(supplier_names)}")
                else:
                    context_parts.append("SUPPLIERS: No suppliers found.")
            except Exception as e:
                context_parts.append(f"SUPPLIERS: Limited supplier data available")
            
            # Sales data (if available)
            if Sale:
                try:
                    # Try to get recent sales data
                    thirty_days_ago = datetime.now() - timedelta(days=30)
                    # Try different date field names
                    try:
                        recent_sales = Sale.objects.filter(tenant_id=tenant.id, order_date__gte=thirty_days_ago)
                    except:
                        try:
                            recent_sales = Sale.objects.filter(tenant_id=tenant.id, created_at__gte=thirty_days_ago)
                        except:
                            recent_sales = Sale.objects.filter(tenant_id=tenant.id)[:100]  # Just get recent 100
                    
                    sales_count = recent_sales.count()
                    if sales_count > 0:
                        # Try different amount field names
                        try:
                            total_revenue = recent_sales.aggregate(total=Sum('total'))['total'] or 0
                        except:
                            try:
                                total_revenue = recent_sales.aggregate(total=Sum('total_amount'))['total'] or 0
                            except:
                                total_revenue = "N/A"
                        context_parts.append(f"SALES: {sales_count} recent sales, total revenue: ${total_revenue}")
                    else:
                        context_parts.append("SALES: No recent sales data.")
                except Exception as e:
                    context_parts.append(f"SALES: Limited sales data available")
            else:
                context_parts.append("SALES: Sales data not available in current system")
            
            # Business info
            context_parts.append(f"BUSINESS: {tenant.name}")
            context_parts.append(f"USER: {user.subscription_plan.title()} plan subscriber")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            print(f"[Smart Insights] Error getting business context: {str(e)}")
            return f"Error fetching business data: {str(e)}"
    
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