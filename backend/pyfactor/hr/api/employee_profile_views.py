"""
Employee Profile API Views for Bank and Tax Information
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction
from ..models import Employee
from ..stripe_bank_tax_service import StripeBankTaxService
from ..stripe_ssn_service_express import StripeSSNService
from pyfactor.logging_config import get_logger
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes

logger = get_logger()
User = get_user_model()


class EmployeeProfileView(APIView):
    """
    API endpoint to get/update employee profile information including bank and tax data
    """
    permission_classes = [IsAuthenticated]
    
    def get_employee_for_user(self, user):
        """Get employee record for the logged-in user"""
        try:
            logger.info(f"[EmployeeProfile] === EMPLOYEE LOOKUP DEBUG START ===")
            logger.info(f"[EmployeeProfile] User ID: {user.id}")
            logger.info(f"[EmployeeProfile] User Email: {user.email}")
            logger.info(f"[EmployeeProfile] User tenant_id: {user.tenant_id if hasattr(user, 'tenant_id') else 'NOT_FOUND'}")
            logger.info(f"[EmployeeProfile] User business_id: {getattr(user, 'business_id', 'NOT_FOUND')}")
            logger.info(f"[EmployeeProfile] User tenant: {user.tenant if hasattr(user, 'tenant') else 'NOT_FOUND'}")
            
            # First try to get employee by user's ID (OneToOne relationship)
            logger.info(f"[EmployeeProfile] Attempting to find employee by user_id={user.id}")
            employee = Employee.objects.filter(user_id=user.id).first()
            if employee:
                logger.info(f"[EmployeeProfile] Found employee by user_id: {employee.id} - {employee.first_name} {employee.last_name}")
                return employee
            else:
                logger.info(f"[EmployeeProfile] No employee found by user_id={user.id}")
            
            # Try to find by email and business_id (tenant_id)
            # This is critical for multi-tenant - same email can exist across tenants
            if hasattr(user, 'tenant_id') and user.tenant_id:
                logger.info(f"[EmployeeProfile] Attempting to find employee by business_id={user.tenant_id} AND email={user.email}")
                employee = Employee.objects.filter(
                    business_id=user.tenant_id,
                    email=user.email
                ).first()
                if employee:
                    logger.info(f"[EmployeeProfile] Found employee by business_id+email: {employee.id} - {employee.first_name} {employee.last_name}")
                    # Link the employee to the user if not already linked
                    if not employee.user_id:
                        logger.info(f"[EmployeeProfile] Linking employee to user...")
                        employee.user = user
                        employee.save(update_fields=['user'])
                        logger.info(f"[EmployeeProfile] Employee linked to user successfully")
                    return employee
                else:
                    logger.info(f"[EmployeeProfile] No employee found by business_id={user.tenant_id} AND email={user.email}")
            
            # Last resort: Try to find by email only (but this could return wrong tenant's employee)
            logger.info(f"[EmployeeProfile] Last resort: Attempting to find employee by email={user.email} only")
            employee = Employee.objects.filter(email=user.email).first()
            if employee:
                logger.info(f"[EmployeeProfile] Found employee by email: {employee.id} - {employee.first_name} {employee.last_name}")
                logger.info(f"[EmployeeProfile] WARNING: Found by email only - employee business_id: {employee.business_id}, user tenant_id: {getattr(user, 'tenant_id', 'NONE')}")
                # Only link if business_id matches
                if str(employee.business_id) == str(getattr(user, 'tenant_id', '')):
                    if not employee.user_id:
                        logger.info(f"[EmployeeProfile] Linking employee to user...")
                        employee.user = user
                        employee.save(update_fields=['user'])
                        logger.info(f"[EmployeeProfile] Employee linked to user successfully")
                    return employee
                else:
                    logger.warning(f"[EmployeeProfile] Employee found but business_id mismatch - not returning")
                    return None
            
            # Debug: Show all employees to understand what's in the database
            logger.info(f"[EmployeeProfile] === ALL EMPLOYEES DEBUG ===")
            all_employees = Employee.objects.all()[:10]  # Limit to first 10 to avoid spam
            for emp in all_employees:
                logger.info(f"[EmployeeProfile] Employee: {emp.id} - {emp.email} - {emp.first_name} {emp.last_name} - user_id: {emp.user_id} - business_id: {emp.business_id}")
            
            logger.info(f"[EmployeeProfile] === EMPLOYEE LOOKUP DEBUG END ===")
            return None
        except Exception as e:
            logger.error(f"[EmployeeProfile] Error finding employee: {str(e)}")
            return None
    
    def get(self, request):
        """Get employee profile information including SSN, bank, and tax data from Stripe"""
        logger.info(f"[EmployeeProfile] === GET REQUEST START (OUTSIDE TRY) ===")
        logger.info(f"[EmployeeProfile] Request method: {request.method}")
        logger.info(f"[EmployeeProfile] Request path: {request.path}")
        logger.info(f"[EmployeeProfile] Request user: {request.user}")
        logger.info(f"[EmployeeProfile] Request user authenticated: {request.user.is_authenticated}")
        
        try:
            logger.info(f"[EmployeeProfile] === GET REQUEST START ===")
            logger.info(f"[EmployeeProfile] Request user: {request.user}")
            logger.info(f"[EmployeeProfile] Request user ID: {request.user.id}")
            logger.info(f"[EmployeeProfile] Request user email: {request.user.email}")
            
            employee = self.get_employee_for_user(request.user)
            
            if not employee:
                logger.error(f"[EmployeeProfile] No employee found for user {request.user.email}")
                return Response(
                    {"error": "No employee record found for current user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            logger.info(f"[EmployeeProfile] Found employee: {employee.id} - {employee.first_name} {employee.last_name}")
            
            # Get SSN information from Stripe
            try:
                logger.info(f"[EmployeeProfile] Retrieving SSN information...")
                ssn_last_4 = StripeBankTaxService.retrieve_ssn_information(employee)
                logger.info(f"[EmployeeProfile] SSN last 4: {ssn_last_4}")
            except Exception as e:
                logger.error(f"[EmployeeProfile] Error retrieving SSN: {str(e)}")
                ssn_last_4 = None
            
            # Get bank information from Stripe
            try:
                logger.info(f"[EmployeeProfile] Retrieving bank information...")
                bank_info = StripeBankTaxService.retrieve_bank_information(employee)
                logger.info(f"[EmployeeProfile] Bank info retrieved: {bool(bank_info)}")
            except Exception as e:
                logger.error(f"[EmployeeProfile] Error retrieving bank info: {str(e)}")
                bank_info = None
            
            # Get tax information from Stripe
            try:
                logger.info(f"[EmployeeProfile] Retrieving tax information...")
                tax_info = StripeBankTaxService.retrieve_tax_information(employee)
                logger.info(f"[EmployeeProfile] Tax info retrieved: {bool(tax_info)}")
            except Exception as e:
                logger.error(f"[EmployeeProfile] Error retrieving tax info: {str(e)}")
                tax_info = None
            
            # Build response
            logger.info(f"[EmployeeProfile] Building response...")
            profile_data = {
                "employee_id": str(employee.id),
                "email": employee.email,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "employee_number": employee.employee_number,
                "phone_number": str(employee.phone_number) if employee.phone_number else None,
                "ssn_last_4": ssn_last_4,
                "bank_info": bank_info or {},
                "tax_info": tax_info or {},
                "has_stripe_account": bool(employee.stripe_account_id)
            }
            
            logger.info(f"[EmployeeProfile] === GET REQUEST END - SUCCESS ===")
            return Response(profile_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[EmployeeProfile] === ERROR DETAILS START ===")
            logger.error(f"[EmployeeProfile] Error getting profile: {str(e)}")
            logger.error(f"[EmployeeProfile] Error type: {type(e)}")
            logger.error(f"[EmployeeProfile] Error args: {e.args}")
            import traceback
            logger.error(f"[EmployeeProfile] Traceback: {traceback.format_exc()}")
            logger.error(f"[EmployeeProfile] === ERROR DETAILS END ===")
            return Response(
                {"error": "Failed to retrieve profile information", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def patch(self, request):
        """Update employee profile information (bank or tax data)"""
        try:
            employee = self.get_employee_for_user(request.user)
            
            if not employee:
                return Response(
                    {"error": "No employee record found for current user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            data = request.data
            results = {}
            
            # Update bank information if provided
            if 'bank_info' in data:
                bank_data = data['bank_info']
                success, message = StripeBankTaxService.store_bank_information(
                    employee, bank_data
                )
                results['bank_info'] = {
                    'success': success,
                    'message': message
                }
            
            # Update tax information if provided
            if 'tax_info' in data:
                tax_data = data['tax_info']
                success, message = StripeBankTaxService.store_tax_information(
                    employee, tax_data
                )
                results['tax_info'] = {
                    'success': success,
                    'message': message
                }
            
            # Check if all operations were successful
            all_success = all(
                result.get('success', True) 
                for result in results.values()
            )
            
            if all_success:
                return Response(
                    {
                        "message": "Profile updated successfully",
                        "results": results
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {
                        "message": "Some updates failed",
                        "results": results
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"[EmployeeProfile] Error updating profile: {str(e)}")
            return Response(
                {"error": "Failed to update profile information"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmployeeBankInfoView(APIView):
    """
    Dedicated endpoint for bank information management
    """
    permission_classes = [IsAuthenticated]
    
    def get_employee_for_user(self, user):
        """Get employee record for the logged-in user"""
        try:
            logger.info(f"[EmployeeBankInfo] === EMPLOYEE LOOKUP DEBUG START ===")
            logger.info(f"[EmployeeBankInfo] User ID: {user.id}")
            logger.info(f"[EmployeeBankInfo] User Email: {user.email}")
            logger.info(f"[EmployeeBankInfo] User tenant_id: {getattr(user, 'tenant_id', 'NOT_FOUND')}")
            logger.info(f"[EmployeeBankInfo] User business_id: {getattr(user, 'business_id', 'NOT_FOUND')}")
            
            # First try to get employee by user's ID (OneToOne relationship)
            logger.info(f"[EmployeeBankInfo] Attempting to find employee by user_id={user.id}")
            employee = Employee.objects.filter(user_id=user.id).first()
            if employee:
                logger.info(f"[EmployeeBankInfo] Found employee by user_id: {employee.id} - {employee.first_name} {employee.last_name}")
                return employee
            else:
                logger.info(f"[EmployeeBankInfo] No employee found by user_id={user.id}")
            
            # Try to find by email
            logger.info(f"[EmployeeBankInfo] Attempting to find employee by email={user.email}")
            employee = Employee.objects.filter(email=user.email).first()
            if employee:
                logger.info(f"[EmployeeBankInfo] Found employee by email: {employee.id} - {employee.first_name} {employee.last_name}")
                # Link the employee to the user if not already linked
                if not employee.user_id:
                    logger.info(f"[EmployeeBankInfo] Linking employee to user...")
                    employee.user = user
                    employee.save(update_fields=['user'])
                    logger.info(f"[EmployeeBankInfo] Employee linked to user successfully")
                return employee
            else:
                logger.info(f"[EmployeeBankInfo] No employee found by email={user.email}")
            
            # Try to find by business_id if user has tenant_id
            if hasattr(user, 'tenant_id') and user.tenant_id:
                logger.info(f"[EmployeeBankInfo] Attempting to find employee by business_id={user.tenant_id} AND email={user.email}")
                employee = Employee.objects.filter(
                    business_id=user.tenant_id,
                    email=user.email
                ).first()
                if employee:
                    logger.info(f"[EmployeeBankInfo] Found employee by business_id+email: {employee.id} - {employee.first_name} {employee.last_name}")
                    # Link the employee to the user if not already linked
                    if not employee.user_id:
                        logger.info(f"[EmployeeBankInfo] Linking employee to user...")
                        employee.user = user
                        employee.save(update_fields=['user'])
                        logger.info(f"[EmployeeBankInfo] Employee linked to user successfully")
                    return employee
                else:
                    logger.info(f"[EmployeeBankInfo] No employee found by business_id={user.tenant_id} AND email={user.email}")
            else:
                logger.info(f"[EmployeeBankInfo] User has no tenant_id, skipping business_id lookup")
            
            logger.info(f"[EmployeeBankInfo] === EMPLOYEE LOOKUP DEBUG END ===")
            return None
        except Exception as e:
            logger.error(f"[EmployeeBankInfo] Error finding employee: {str(e)}")
            return None
    
    def get(self, request):
        """Get employee bank information"""
        try:
            employee = self.get_employee_for_user(request.user)
            
            if not employee:
                return Response(
                    {"error": "No employee record found for current user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            bank_info = StripeBankTaxService.retrieve_bank_information(employee)
            
            return Response(
                {"bank_info": bank_info or {}},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"[EmployeeBankInfo] Error getting bank info: {str(e)}")
            return Response(
                {"error": "Failed to retrieve bank information"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Update employee bank information"""
        try:
            employee = self.get_employee_for_user(request.user)
            
            if not employee:
                return Response(
                    {"error": "No employee record found for current user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            bank_data = request.data
            
            # Validate required fields
            required_fields = ['routing_number', 'account_number']
            missing_fields = [field for field in required_fields if not bank_data.get(field)]
            
            if missing_fields:
                return Response(
                    {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            success, message = StripeBankTaxService.store_bank_information(
                employee, bank_data
            )
            
            if success:
                return Response(
                    {"message": message},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {"error": message},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"[EmployeeBankInfo] Error updating bank info: {str(e)}")
            return Response(
                {"error": "Failed to update bank information"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmployeeTaxInfoView(APIView):
    """
    Dedicated endpoint for tax information management
    """
    permission_classes = [IsAuthenticated]
    
    def get_employee_for_user(self, user):
        """Get employee record for the logged-in user"""
        try:
            logger.info(f"[EmployeeTaxInfo] === EMPLOYEE LOOKUP DEBUG START ===")
            logger.info(f"[EmployeeTaxInfo] User ID: {user.id}")
            logger.info(f"[EmployeeTaxInfo] User Email: {user.email}")
            logger.info(f"[EmployeeTaxInfo] User tenant_id: {getattr(user, 'tenant_id', 'NOT_FOUND')}")
            logger.info(f"[EmployeeTaxInfo] User business_id: {getattr(user, 'business_id', 'NOT_FOUND')}")
            
            # First try to get employee by user's ID (OneToOne relationship)
            logger.info(f"[EmployeeTaxInfo] Attempting to find employee by user_id={user.id}")
            employee = Employee.objects.filter(user_id=user.id).first()
            if employee:
                logger.info(f"[EmployeeTaxInfo] Found employee by user_id: {employee.id} - {employee.first_name} {employee.last_name}")
                return employee
            else:
                logger.info(f"[EmployeeTaxInfo] No employee found by user_id={user.id}")
            
            # Try to find by email
            logger.info(f"[EmployeeTaxInfo] Attempting to find employee by email={user.email}")
            employee = Employee.objects.filter(email=user.email).first()
            if employee:
                logger.info(f"[EmployeeTaxInfo] Found employee by email: {employee.id} - {employee.first_name} {employee.last_name}")
                # Link the employee to the user if not already linked
                if not employee.user_id:
                    logger.info(f"[EmployeeTaxInfo] Linking employee to user...")
                    employee.user = user
                    employee.save(update_fields=['user'])
                    logger.info(f"[EmployeeTaxInfo] Employee linked to user successfully")
                return employee
            else:
                logger.info(f"[EmployeeTaxInfo] No employee found by email={user.email}")
            
            # Try to find by business_id if user has tenant_id
            if hasattr(user, 'tenant_id') and user.tenant_id:
                logger.info(f"[EmployeeTaxInfo] Attempting to find employee by business_id={user.tenant_id} AND email={user.email}")
                employee = Employee.objects.filter(
                    business_id=user.tenant_id,
                    email=user.email
                ).first()
                if employee:
                    logger.info(f"[EmployeeTaxInfo] Found employee by business_id+email: {employee.id} - {employee.first_name} {employee.last_name}")
                    # Link the employee to the user if not already linked
                    if not employee.user_id:
                        logger.info(f"[EmployeeTaxInfo] Linking employee to user...")
                        employee.user = user
                        employee.save(update_fields=['user'])
                        logger.info(f"[EmployeeTaxInfo] Employee linked to user successfully")
                    return employee
                else:
                    logger.info(f"[EmployeeTaxInfo] No employee found by business_id={user.tenant_id} AND email={user.email}")
            else:
                logger.info(f"[EmployeeTaxInfo] User has no tenant_id, skipping business_id lookup")
            
            logger.info(f"[EmployeeTaxInfo] === EMPLOYEE LOOKUP DEBUG END ===")
            return None
        except Exception as e:
            logger.error(f"[EmployeeTaxInfo] Error finding employee: {str(e)}")
            return None
    
    def get(self, request):
        """Get employee tax information"""
        try:
            employee = self.get_employee_for_user(request.user)
            
            if not employee:
                return Response(
                    {"error": "No employee record found for current user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            tax_info = StripeBankTaxService.retrieve_tax_information(employee)
            
            return Response(
                {"tax_info": tax_info or {}},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"[EmployeeTaxInfo] Error getting tax info: {str(e)}")
            return Response(
                {"error": "Failed to retrieve tax information"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Update employee tax information"""
        try:
            employee = self.get_employee_for_user(request.user)
            
            if not employee:
                return Response(
                    {"error": "No employee record found for current user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            tax_data = request.data
            
            success, message = StripeBankTaxService.store_tax_information(
                employee, tax_data
            )
            
            if success:
                return Response(
                    {"message": message},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {"error": message},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"[EmployeeTaxInfo] Error updating tax info: {str(e)}")
            return Response(
                {"error": "Failed to update tax information"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_profile_debug(request):
    """Debug endpoint to test employee lookup"""
    # Test if we can access basic user info
    try:
        return Response({
            "debug": "success",
            "user_id": str(request.user.id),
            "user_email": request.user.email,
            "user_authenticated": request.user.is_authenticated
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
    try:
        logger.info(f"[DEBUG] === EMPLOYEE PROFILE DEBUG START ===")
        logger.info(f"[DEBUG] Request user: {request.user}")
        logger.info(f"[DEBUG] User ID: {request.user.id}")
        logger.info(f"[DEBUG] User email: {request.user.email}")
        logger.info(f"[DEBUG] User attributes: {dir(request.user)}")
        
        # Check if user has tenant_id
        if hasattr(request.user, 'tenant_id'):
            logger.info(f"[DEBUG] User tenant_id: {request.user.tenant_id}")
        else:
            logger.info(f"[DEBUG] User has NO tenant_id attribute")
            
        # Try to find employee by different methods
        employees_by_user_id = Employee.objects.filter(user_id=request.user.id)
        logger.info(f"[DEBUG] Employees by user_id: {employees_by_user_id.count()}")
        
        employees_by_email = Employee.objects.filter(email=request.user.email)
        logger.info(f"[DEBUG] Employees by email: {employees_by_email.count()}")
        
        # List first 5 employees in the database
        all_employees = Employee.objects.all()[:5]
        logger.info(f"[DEBUG] First 5 employees in database:")
        for emp in all_employees:
            logger.info(f"[DEBUG]   - {emp.id}: {emp.email} (user_id: {emp.user_id}, business_id: {emp.business_id})")
            
        # List all users with matching email
        matching_users = User.objects.filter(email=request.user.email)
        logger.info(f"[DEBUG] Users with email {request.user.email}: {matching_users.count()}")
        for u in matching_users:
            logger.info(f"[DEBUG]   - User {u.id}: {u.email}")
            
        logger.info(f"[DEBUG] === EMPLOYEE PROFILE DEBUG END ===")
        
        return Response({
            "debug": True,
            "user_id": str(request.user.id),
            "user_email": request.user.email,
            "has_tenant_id": hasattr(request.user, 'tenant_id'),
            "tenant_id": getattr(request.user, 'tenant_id', None),
            "employees_by_user_id": employees_by_user_id.count(),
            "employees_by_email": employees_by_email.count(),
            "total_employees": Employee.objects.count()
        })
        
    except Exception as e:
        logger.error(f"[DEBUG] Error in debug endpoint: {str(e)}")
        import traceback
        logger.error(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return Response({"error": str(e)}, status=500)