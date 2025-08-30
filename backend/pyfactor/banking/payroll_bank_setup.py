"""
Payroll bank account assignment for businesses
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from banking.models import BankAccount
from users.models import Business, UserProfile

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_payroll_bank_account(request):
    """
    Assign a bank account for payroll processing
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        bank_account_id = request.data.get('bank_account_id')
        
        if not bank_account_id:
            return Response({
                'error': 'Bank account ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify the bank account belongs to this business
        bank_account = BankAccount.objects.get(
            id=bank_account_id,
            tenant_id=request.user.business_id
        )
        
        # Update business with payroll bank account
        business.payroll_bank_account_id = bank_account_id
        business.save(update_fields=['payroll_bank_account_id'])
        
        logger.info(f"Assigned bank account {bank_account_id} for payroll - Business {business.id}")
        
        return Response({
            'success': True,
            'message': 'Payroll bank account assigned successfully',
            'bank_account': {
                'id': bank_account.id,
                'name': bank_account.name,
                'institution': bank_account.institution_name,
                'last_four': bank_account.account_id[-4:] if bank_account.account_id else None,
                'available_balance': float(bank_account.available_balance) if bank_account.available_balance else None
            }
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except BankAccount.DoesNotExist:
        return Response({
            'error': 'Bank account not found or not authorized'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error assigning payroll bank account: {str(e)}")
        return Response({
            'error': 'Failed to assign payroll bank account'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_bank_account(request):
    """
    Get the currently assigned payroll bank account
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not business.payroll_bank_account_id:
            return Response({
                'has_payroll_account': False,
                'message': 'No payroll bank account assigned'
            }, status=status.HTTP_200_OK)
        
        # Get the bank account details
        try:
            bank_account = BankAccount.objects.get(
                id=business.payroll_bank_account_id,
                tenant_id=request.user.business_id
            )
            
            return Response({
                'has_payroll_account': True,
                'bank_account': {
                    'id': bank_account.id,
                    'name': bank_account.name,
                    'institution': bank_account.institution_name,
                    'last_four': bank_account.account_id[-4:] if bank_account.account_id else None,
                    'available_balance': float(bank_account.available_balance) if bank_account.available_balance else None,
                    'account_type': bank_account.type
                }
            }, status=status.HTTP_200_OK)
            
        except BankAccount.DoesNotExist:
            # Clear invalid reference
            business.payroll_bank_account_id = None
            business.save(update_fields=['payroll_bank_account_id'])
            
            return Response({
                'has_payroll_account': False,
                'message': 'Previously assigned account no longer exists'
            }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error getting payroll bank account: {str(e)}")
        return Response({
            'error': 'Failed to get payroll bank account'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_payroll_bank_account(request):
    """
    Remove the payroll bank account assignment
    """
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Clear payroll bank account
        business.payroll_bank_account_id = None
        business.save(update_fields=['payroll_bank_account_id'])
        
        logger.info(f"Removed payroll bank account for Business {business.id}")
        
        return Response({
            'success': True,
            'message': 'Payroll bank account removed successfully'
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error removing payroll bank account: {str(e)}")
        return Response({
            'error': 'Failed to remove payroll bank account'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)