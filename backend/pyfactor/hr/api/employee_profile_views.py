"""
Employee Profile API Views for Bank and Tax Information
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from ..models import Employee
from ..stripe_bank_tax_service import StripeBankTaxService
from ..stripe_ssn_service_express import StripeSSNService
from pyfactor.logging_config import get_logger
from django.contrib.auth import get_user_model

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
            logger.info(f"[EmployeeProfile] User tenant_id: {getattr(user, 'tenant_id', 'NOT_FOUND')}")
            logger.info(f"[EmployeeProfile] User business_id: {getattr(user, 'business_id', 'NOT_FOUND')}")
            logger.info(f"[EmployeeProfile] User attributes: {dir(user)}")
            
            # First try to get employee by user's ID (OneToOne relationship)
            logger.info(f"[EmployeeProfile] Attempting to find employee by user_id={user.id}")
            employee = Employee.objects.filter(user_id=user.id).first()
            if employee:
                logger.info(f"[EmployeeProfile] Found employee by user_id: {employee.id} - {employee.first_name} {employee.last_name}")
                return employee
            else:
                logger.info(f"[EmployeeProfile] No employee found by user_id={user.id}")
            
            # Try to find by email
            logger.info(f"[EmployeeProfile] Attempting to find employee by email={user.email}")
            employee = Employee.objects.filter(email=user.email).first()
            if employee:
                logger.info(f"[EmployeeProfile] Found employee by email: {employee.id} - {employee.first_name} {employee.last_name}")
                logger.info(f"[EmployeeProfile] Employee user_id: {employee.user_id}")
                logger.info(f"[EmployeeProfile] Employee business_id: {employee.business_id}")
                # Link the employee to the user if not already linked
                if not employee.user_id:
                    logger.info(f"[EmployeeProfile] Linking employee to user...")
                    employee.user = user
                    employee.save(update_fields=['user'])
                    logger.info(f"[EmployeeProfile] Employee linked to user successfully")
                return employee
            else:
                logger.info(f"[EmployeeProfile] No employee found by email={user.email}")
            
            # Try to find by business_id if user has tenant_id
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
            else:
                logger.info(f"[EmployeeProfile] User has no tenant_id, skipping business_id lookup")
            
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
        try:
            employee = self.get_employee_for_user(request.user)
            
            if not employee:
                return Response(
                    {"error": "No employee record found for current user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get SSN information from Stripe
            ssn_last_4 = StripeBankTaxService.retrieve_ssn_information(employee)
            
            # Get bank information from Stripe
            bank_info = StripeBankTaxService.retrieve_bank_information(employee)
            
            # Get tax information from Stripe
            tax_info = StripeBankTaxService.retrieve_tax_information(employee)
            
            # Build response
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
            
            return Response(profile_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[EmployeeProfile] Error getting profile: {str(e)}")
            return Response(
                {"error": "Failed to retrieve profile information"},
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