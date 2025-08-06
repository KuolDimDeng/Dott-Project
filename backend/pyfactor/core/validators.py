"""
Comprehensive Input Validation System
Provides reusable validators for all API endpoints
"""

import re
import uuid
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from rest_framework import serializers
import phonenumbers
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


class SecurityValidators:
    """Security-focused validators to prevent injection attacks"""
    
    @staticmethod
    def validate_no_sql_injection(value):
        """Check for common SQL injection patterns"""
        sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE)\b)",
            r"(--|#|\/\*|\*\/)",
            r"(\bOR\b\s*\d+\s*=\s*\d+)",
            r"(\bAND\b\s*\d+\s*=\s*\d+)",
            r"(;.*(SELECT|INSERT|UPDATE|DELETE))",
            r"('|\"|`|;|\\x00|\\n|\\r|\\x1a)",
        ]
        
        value_upper = str(value).upper()
        for pattern in sql_patterns:
            if re.search(pattern, value_upper, re.IGNORECASE):
                raise ValidationError(f"Invalid input detected. Please remove special characters.")
        return value
    
    @staticmethod
    def validate_no_xss(value):
        """Check for XSS attack patterns"""
        xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
            r"<embed[^>]*>",
            r"<object[^>]*>",
            r"eval\s*\(",
            r"expression\s*\(",
        ]
        
        value_lower = str(value).lower()
        for pattern in xss_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                raise ValidationError("Invalid HTML/JavaScript content detected.")
        return value
    
    @staticmethod
    def validate_safe_filename(filename):
        """Validate filename is safe"""
        if not filename:
            raise ValidationError("Filename is required.")
        
        # Check for path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise ValidationError("Invalid filename.")
        
        # Check extension
        allowed_extensions = [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
            '.png', '.jpg', '.jpeg', '.gif', '.csv', '.txt'
        ]
        
        if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
            raise ValidationError(f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}")
        
        return filename


class DataValidators:
    """Data format validators"""
    
    @staticmethod
    def validate_email(email):
        """Enhanced email validation"""
        if not email:
            raise ValidationError("Email is required.")
        
        email = email.strip().lower()
        
        # Basic validation
        email_validator = EmailValidator()
        email_validator(email)
        
        # Additional checks
        if len(email) > 254:  # RFC 5321
            raise ValidationError("Email address too long.")
        
        # Check for disposable email domains
        disposable_domains = [
            'tempmail.com', 'throwaway.email', '10minutemail.com',
            'guerrillamail.com', 'mailinator.com'
        ]
        
        domain = email.split('@')[1] if '@' in email else ''
        if any(domain.endswith(d) for d in disposable_domains):
            raise ValidationError("Disposable email addresses are not allowed.")
        
        return email
    
    @staticmethod
    def validate_phone(phone_number, country_code='US'):
        """International phone number validation"""
        if not phone_number:
            raise ValidationError("Phone number is required.")
        
        try:
            # Parse phone number
            parsed = phonenumbers.parse(phone_number, country_code)
            
            # Check if valid
            if not phonenumbers.is_valid_number(parsed):
                raise ValidationError("Invalid phone number.")
            
            # Return formatted version
            return phonenumbers.format_number(
                parsed, 
                phonenumbers.PhoneNumberFormat.E164
            )
        except phonenumbers.NumberParseException:
            raise ValidationError("Invalid phone number format.")
    
    @staticmethod
    def validate_uuid(value):
        """Validate UUID format"""
        try:
            uuid.UUID(str(value))
            return str(value)
        except (ValueError, AttributeError):
            raise ValidationError("Invalid UUID format.")
    
    @staticmethod
    def validate_currency_amount(amount):
        """Validate currency amount"""
        try:
            decimal_amount = Decimal(str(amount))
            
            # Check for negative
            if decimal_amount < 0:
                raise ValidationError("Amount cannot be negative.")
            
            # Check for reasonable maximum
            if decimal_amount > Decimal('999999999.99'):
                raise ValidationError("Amount exceeds maximum allowed value.")
            
            # Check decimal places
            if decimal_amount.as_tuple().exponent < -2:
                raise ValidationError("Amount cannot have more than 2 decimal places.")
            
            return decimal_amount
        except (ValueError, TypeError):
            raise ValidationError("Invalid amount format.")
    
    @staticmethod
    def validate_percentage(value):
        """Validate percentage value"""
        try:
            percentage = Decimal(str(value))
            
            if percentage < 0 or percentage > 100:
                raise ValidationError("Percentage must be between 0 and 100.")
            
            return percentage
        except (ValueError, TypeError):
            raise ValidationError("Invalid percentage format.")
    
    @staticmethod
    def validate_date_range(start_date, end_date):
        """Validate date range"""
        if not isinstance(start_date, (date, datetime)):
            raise ValidationError("Invalid start date format.")
        
        if not isinstance(end_date, (date, datetime)):
            raise ValidationError("Invalid end date format.")
        
        if start_date > end_date:
            raise ValidationError("Start date cannot be after end date.")
        
        # Check for reasonable range (e.g., not more than 10 years)
        delta = end_date - start_date
        if delta.days > 3650:  # 10 years
            raise ValidationError("Date range cannot exceed 10 years.")
        
        return start_date, end_date


class BusinessValidators:
    """Business logic validators"""
    
    @staticmethod
    def validate_tax_id(tax_id, country='US'):
        """Validate tax identification number"""
        if not tax_id:
            raise ValidationError("Tax ID is required.")
        
        tax_id = re.sub(r'[^0-9A-Z]', '', tax_id.upper())
        
        if country == 'US':
            # EIN format: XX-XXXXXXX
            if not re.match(r'^\d{2}\d{7}$', tax_id):
                raise ValidationError("Invalid EIN format. Expected: XX-XXXXXXX")
        elif country == 'CA':
            # Canadian Business Number
            if not re.match(r'^\d{9}[A-Z]{2}\d{4}$', tax_id):
                raise ValidationError("Invalid Canadian Business Number.")
        elif country == 'GB':
            # UK VAT number
            if not re.match(r'^GB\d{9}$', tax_id):
                raise ValidationError("Invalid UK VAT number.")
        
        return tax_id
    
    @staticmethod
    def validate_bank_account(account_number, routing_number=None, country='US'):
        """Validate bank account details"""
        if country == 'US':
            if not routing_number:
                raise ValidationError("Routing number is required for US accounts.")
            
            # Validate routing number (9 digits)
            if not re.match(r'^\d{9}$', routing_number):
                raise ValidationError("Invalid routing number. Must be 9 digits.")
            
            # Validate account number (typically 10-12 digits)
            if not re.match(r'^\d{10,12}$', account_number):
                raise ValidationError("Invalid account number.")
        
        return account_number, routing_number
    
    @staticmethod
    def validate_credit_card(card_number):
        """Basic credit card validation (Luhn algorithm)"""
        # Remove spaces and dashes
        card_number = re.sub(r'[^0-9]', '', card_number)
        
        if len(card_number) < 13 or len(card_number) > 19:
            raise ValidationError("Invalid credit card number length.")
        
        # Luhn algorithm
        def luhn_checksum(card_num):
            def digits_of(n):
                return [int(d) for d in str(n)]
            
            digits = digits_of(card_num)
            odd_digits = digits[-1::-2]
            even_digits = digits[-2::-2]
            
            checksum = sum(odd_digits)
            for d in even_digits:
                checksum += sum(digits_of(d * 2))
            
            return checksum % 10
        
        if luhn_checksum(card_number) != 0:
            raise ValidationError("Invalid credit card number.")
        
        # Mask for storage (only show last 4 digits)
        return f"****{card_number[-4:]}"


class EnhancedSerializerMixin:
    """Mixin to add enhanced validation to serializers"""
    
    def validate(self, attrs):
        """Add security validation to all fields"""
        for field_name, value in attrs.items():
            if isinstance(value, str):
                # Apply security validators
                SecurityValidators.validate_no_sql_injection(value)
                SecurityValidators.validate_no_xss(value)
        
        return super().validate(attrs)


class BaseModelSerializer(EnhancedSerializerMixin, serializers.ModelSerializer):
    """Base serializer with enhanced validation"""
    pass


# Example serializers with validation

class UserRegistrationSerializer(BaseModelSerializer):
    """User registration with comprehensive validation"""
    
    email = serializers.EmailField(
        required=True,
        validators=[DataValidators.validate_email]
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128
    )
    phone = serializers.CharField(
        required=False,
        validators=[DataValidators.validate_phone]
    )
    
    def validate_password(self, value):
        """Enhanced password validation"""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        
        # Check complexity
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        
        # Check for common passwords
        common_passwords = ['password', '12345678', 'qwerty', 'admin']
        if value.lower() in common_passwords:
            raise serializers.ValidationError("Password is too common. Please choose a stronger password.")
        
        return value


class PaymentSerializer(BaseModelSerializer):
    """Payment processing with validation"""
    
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[DataValidators.validate_currency_amount]
    )
    currency = serializers.ChoiceField(
        choices=['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    )
    card_number = serializers.CharField(
        write_only=True,
        validators=[BusinessValidators.validate_credit_card]
    )
    
    def validate_amount(self, value):
        """Additional amount validation"""
        if value < Decimal('1.00'):
            raise serializers.ValidationError("Minimum payment amount is $1.00")
        
        if value > Decimal('10000.00'):
            raise serializers.ValidationError("Maximum single payment is $10,000")
        
        return value


class FileUploadSerializer(serializers.Serializer):
    """File upload validation"""
    
    file = serializers.FileField(required=True)
    
    def validate_file(self, value):
        """Validate uploaded file"""
        # Check file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 10MB.")
        
        # Validate filename
        SecurityValidators.validate_safe_filename(value.name)
        
        # Check file content type
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'text/csv'
        ]
        
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(f"File type {value.content_type} not allowed.")
        
        return value