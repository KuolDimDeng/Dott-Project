"""
SMS Abuse Prevention and Rate Limiting
Protects against SMS bombing, fraud, and excessive costs
"""

import logging
import hashlib
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger(__name__)


class SMSAbusePrevention:
    """
    Comprehensive SMS abuse prevention system with multiple layers:
    1. Rate limiting per phone number
    2. Rate limiting per IP address
    3. Daily/monthly quotas
    4. Suspicious pattern detection
    5. Blacklist management
    """
    
    # Rate limiting settings
    RATE_LIMITS = {
        # Per phone number limits
        'phone_per_minute': 1,      # Max 1 OTP per minute per phone
        'phone_per_hour': 3,        # Max 3 OTPs per hour per phone
        'phone_per_day': 5,         # Max 5 OTPs per day per phone
        
        # Per IP address limits
        'ip_per_minute': 3,         # Max 3 requests per minute per IP
        'ip_per_hour': 10,          # Max 10 requests per hour per IP
        'ip_per_day': 20,           # Max 20 requests per day per IP
        
        # Global limits (entire platform)
        'global_per_minute': 100,   # Max 100 SMS per minute globally
        'global_per_hour': 1000,    # Max 1000 SMS per hour globally
        'global_per_day': 5000,     # Max 5000 SMS per day globally
        
        # Cost limits
        'daily_cost_limit': 50.0,   # Max $50/day in SMS costs
        'monthly_cost_limit': 500.0, # Max $500/month in SMS costs
    }
    
    # Suspicious patterns
    SUSPICIOUS_PATTERNS = {
        'sequential_numbers': 3,     # Block after 3 sequential phone numbers
        'similar_numbers': 5,        # Block after 5 similar numbers from same IP
        'rapid_requests': 5,         # Block after 5 requests in 10 seconds
        'test_numbers': [            # Known test/fake numbers to block
            '+1234567890',
            '+0000000000',
            '+1111111111',
            '+9999999999',
        ],
        'high_risk_prefixes': [      # High-risk number prefixes
            '+234809',  # Nigerian scam prefixes
            '+234909',
            '+62812',   # Indonesian spam prefixes
        ]
    }
    
    # SMS costs by region (in USD)
    SMS_COSTS = {
        # African countries (Africa's Talking rates)
        '+254': 0.01,   # Kenya
        '+256': 0.01,   # Uganda
        '+255': 0.015,  # Tanzania
        '+234': 0.02,   # Nigeria
        '+27': 0.02,    # South Africa
        '+233': 0.025,  # Ghana
        
        # Global (Twilio rates)
        '+1': 0.0075,   # USA/Canada
        '+44': 0.04,    # UK
        '+91': 0.02,    # India
        '+86': 0.05,    # China
        'default': 0.05  # Default rate for unknown
    }
    
    @classmethod
    def check_rate_limits(cls, phone_number: str, ip_address: str, 
                         request_type: str = 'otp') -> Tuple[bool, str, Dict[str, Any]]:
        """
        Check all rate limits and abuse patterns
        
        Returns:
            Tuple of (allowed, error_message, metadata)
        """
        
        # 1. Check if phone number is blacklisted
        if cls._is_blacklisted(phone_number):
            logger.warning(f"🚫 Blacklisted phone number attempted: {phone_number}")
            return False, "This phone number has been blocked due to suspicious activity", {
                'reason': 'blacklisted',
                'permanent': True
            }
        
        # 2. Check for test/fake numbers
        if cls._is_test_number(phone_number):
            logger.warning(f"🚫 Test/fake number attempted: {phone_number}")
            return False, "Invalid phone number", {
                'reason': 'test_number'
            }
        
        # 3. Check high-risk prefixes
        if cls._is_high_risk(phone_number):
            logger.warning(f"⚠️ High-risk number attempted: {phone_number}")
            # Add extra scrutiny but don't block outright
            # Could require captcha or email verification here
            pass
        
        # 4. Check phone number rate limits
        phone_check = cls._check_phone_limits(phone_number)
        if not phone_check[0]:
            return phone_check
        
        # 5. Check IP address rate limits
        ip_check = cls._check_ip_limits(ip_address)
        if not ip_check[0]:
            return ip_check
        
        # 6. Check global rate limits
        global_check = cls._check_global_limits()
        if not global_check[0]:
            return global_check
        
        # 7. Check cost limits
        cost_check = cls._check_cost_limits(phone_number)
        if not cost_check[0]:
            return cost_check
        
        # 8. Check for suspicious patterns
        pattern_check = cls._check_suspicious_patterns(phone_number, ip_address)
        if not pattern_check[0]:
            return pattern_check
        
        # 9. Record successful request
        cls._record_request(phone_number, ip_address)
        
        return True, "OK", {
            'allowed': True,
            'cost': cls._get_sms_cost(phone_number)
        }
    
    @classmethod
    def _check_phone_limits(cls, phone_number: str) -> Tuple[bool, str, Dict]:
        """Check rate limits for specific phone number"""
        
        # Check per-minute limit
        minute_key = f"sms_rate:phone:minute:{phone_number}"
        minute_count = cache.get(minute_key, 0)
        if minute_count >= cls.RATE_LIMITS['phone_per_minute']:
            return False, "Please wait 1 minute before requesting a new code", {
                'reason': 'rate_limit',
                'retry_after': 60
            }
        
        # Check per-hour limit
        hour_key = f"sms_rate:phone:hour:{phone_number}"
        hour_count = cache.get(hour_key, 0)
        if hour_count >= cls.RATE_LIMITS['phone_per_hour']:
            return False, "Too many requests. Please try again in 1 hour", {
                'reason': 'rate_limit',
                'retry_after': 3600
            }
        
        # Check per-day limit
        day_key = f"sms_rate:phone:day:{phone_number}"
        day_count = cache.get(day_key, 0)
        if day_count >= cls.RATE_LIMITS['phone_per_day']:
            return False, "Daily limit reached. Please try again tomorrow", {
                'reason': 'rate_limit',
                'retry_after': 86400
            }
        
        return True, "OK", {}
    
    @classmethod
    def _check_ip_limits(cls, ip_address: str) -> Tuple[bool, str, Dict]:
        """Check rate limits for specific IP address"""
        
        if not ip_address:
            return True, "OK", {}  # Skip if no IP
        
        # Hash IP for privacy
        ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16]
        
        # Check per-minute limit
        minute_key = f"sms_rate:ip:minute:{ip_hash}"
        minute_count = cache.get(minute_key, 0)
        if minute_count >= cls.RATE_LIMITS['ip_per_minute']:
            logger.warning(f"🚫 IP rate limit hit: {ip_address}")
            return False, "Too many requests from your network. Please wait", {
                'reason': 'ip_rate_limit',
                'retry_after': 60
            }
        
        # Check per-hour limit
        hour_key = f"sms_rate:ip:hour:{ip_hash}"
        hour_count = cache.get(hour_key, 0)
        if hour_count >= cls.RATE_LIMITS['ip_per_hour']:
            return False, "Too many requests from your network. Try again later", {
                'reason': 'ip_rate_limit',
                'retry_after': 3600
            }
        
        return True, "OK", {}
    
    @classmethod
    def _check_global_limits(cls) -> Tuple[bool, str, Dict]:
        """Check global platform-wide rate limits"""
        
        # Check per-minute global limit
        minute_key = "sms_rate:global:minute"
        minute_count = cache.get(minute_key, 0)
        if minute_count >= cls.RATE_LIMITS['global_per_minute']:
            logger.error("🚨 Global SMS rate limit reached!")
            return False, "Service temporarily unavailable. Please try again later", {
                'reason': 'global_rate_limit',
                'retry_after': 60
            }
        
        return True, "OK", {}
    
    @classmethod
    def _check_cost_limits(cls, phone_number: str) -> Tuple[bool, str, Dict]:
        """Check daily and monthly cost limits"""
        
        # Get SMS cost for this number
        sms_cost = cls._get_sms_cost(phone_number)
        
        # Check daily cost
        daily_cost_key = f"sms_cost:daily:{datetime.now().date()}"
        daily_cost = cache.get(daily_cost_key, 0.0)
        if daily_cost + sms_cost > cls.RATE_LIMITS['daily_cost_limit']:
            logger.error(f"💸 Daily SMS cost limit reached: ${daily_cost:.2f}")
            return False, "Service temporarily unavailable", {
                'reason': 'cost_limit',
                'retry_after': 86400
            }
        
        # Check monthly cost
        monthly_cost_key = f"sms_cost:monthly:{datetime.now().strftime('%Y-%m')}"
        monthly_cost = cache.get(monthly_cost_key, 0.0)
        if monthly_cost + sms_cost > cls.RATE_LIMITS['monthly_cost_limit']:
            logger.error(f"💸 Monthly SMS cost limit reached: ${monthly_cost:.2f}")
            return False, "Service temporarily unavailable", {
                'reason': 'cost_limit',
                'retry_after': 2592000  # 30 days
            }
        
        return True, "OK", {}
    
    @classmethod
    def _check_suspicious_patterns(cls, phone_number: str, ip_address: str) -> Tuple[bool, str, Dict]:
        """Detect suspicious patterns like sequential numbers, rapid requests"""
        
        if not ip_address:
            return True, "OK", {}
        
        ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16]
        
        # Check for rapid requests from same IP
        rapid_key = f"sms_rapid:{ip_hash}"
        rapid_count = cache.get(rapid_key, 0)
        if rapid_count >= cls.SUSPICIOUS_PATTERNS['rapid_requests']:
            logger.warning(f"🚨 Rapid requests detected from IP: {ip_address}")
            # Auto-blacklist the IP for 24 hours
            blacklist_key = f"sms_blacklist:ip:{ip_hash}"
            cache.set(blacklist_key, True, 86400)  # 24 hours
            return False, "Suspicious activity detected. Account temporarily locked", {
                'reason': 'suspicious_pattern',
                'pattern': 'rapid_requests'
            }
        
        # Check for sequential numbers from same IP
        recent_numbers_key = f"sms_recent_numbers:{ip_hash}"
        recent_numbers = cache.get(recent_numbers_key, [])
        
        # Check if current number is sequential to recent ones
        if cls._is_sequential(phone_number, recent_numbers):
            logger.warning(f"🚨 Sequential numbers detected from IP: {ip_address}")
            return False, "Suspicious activity detected", {
                'reason': 'suspicious_pattern',
                'pattern': 'sequential_numbers'
            }
        
        return True, "OK", {}
    
    @classmethod
    def _is_blacklisted(cls, phone_number: str) -> bool:
        """Check if phone number is blacklisted"""
        blacklist_key = f"sms_blacklist:phone:{phone_number}"
        return cache.get(blacklist_key, False)
    
    @classmethod
    def _is_test_number(cls, phone_number: str) -> bool:
        """Check if number is a known test/fake number"""
        return phone_number in cls.SUSPICIOUS_PATTERNS['test_numbers']
    
    @classmethod
    def _is_high_risk(cls, phone_number: str) -> bool:
        """Check if number has high-risk prefix"""
        return any(phone_number.startswith(prefix) 
                  for prefix in cls.SUSPICIOUS_PATTERNS['high_risk_prefixes'])
    
    @classmethod
    def _is_sequential(cls, current: str, recent: list) -> bool:
        """Check if phone numbers are sequential"""
        if len(recent) < 2:
            return False
        
        try:
            # Extract last 4 digits and check for sequential pattern
            current_suffix = int(current[-4:])
            recent_suffixes = [int(num[-4:]) for num in recent[-3:]]
            
            # Check if they form a sequence
            if all(recent_suffixes[i] + 1 == recent_suffixes[i+1] 
                  for i in range(len(recent_suffixes)-1)):
                if recent_suffixes[-1] + 1 == current_suffix:
                    return True
        except (ValueError, IndexError):
            pass
        
        return False
    
    @classmethod
    def _get_sms_cost(cls, phone_number: str) -> float:
        """Get SMS cost for given phone number"""
        # Find matching country code
        for prefix, cost in cls.SMS_COSTS.items():
            if phone_number.startswith(prefix):
                return cost
        return cls.SMS_COSTS['default']
    
    @classmethod
    def _record_request(cls, phone_number: str, ip_address: str):
        """Record successful SMS request for rate limiting"""
        
        # Update phone number counters
        cache.set(f"sms_rate:phone:minute:{phone_number}", 
                 cache.get(f"sms_rate:phone:minute:{phone_number}", 0) + 1, 60)
        cache.set(f"sms_rate:phone:hour:{phone_number}", 
                 cache.get(f"sms_rate:phone:hour:{phone_number}", 0) + 1, 3600)
        cache.set(f"sms_rate:phone:day:{phone_number}", 
                 cache.get(f"sms_rate:phone:day:{phone_number}", 0) + 1, 86400)
        
        # Update IP counters
        if ip_address:
            ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16]
            cache.set(f"sms_rate:ip:minute:{ip_hash}", 
                     cache.get(f"sms_rate:ip:minute:{ip_hash}", 0) + 1, 60)
            cache.set(f"sms_rate:ip:hour:{ip_hash}", 
                     cache.get(f"sms_rate:ip:hour:{ip_hash}", 0) + 1, 3600)
            
            # Update rapid request counter (10 second window)
            cache.set(f"sms_rapid:{ip_hash}", 
                     cache.get(f"sms_rapid:{ip_hash}", 0) + 1, 10)
            
            # Track recent numbers from this IP
            recent_key = f"sms_recent_numbers:{ip_hash}"
            recent = cache.get(recent_key, [])
            recent.append(phone_number)
            cache.set(recent_key, recent[-10:], 3600)  # Keep last 10 numbers
        
        # Update global counters
        cache.set("sms_rate:global:minute", 
                 cache.get("sms_rate:global:minute", 0) + 1, 60)
        
        # Update cost tracking
        sms_cost = cls._get_sms_cost(phone_number)
        daily_key = f"sms_cost:daily:{datetime.now().date()}"
        cache.set(daily_key, cache.get(daily_key, 0.0) + sms_cost, 86400)
        
        monthly_key = f"sms_cost:monthly:{datetime.now().strftime('%Y-%m')}"
        cache.set(monthly_key, cache.get(monthly_key, 0.0) + sms_cost, 2592000)
        
        logger.info(f"📊 SMS recorded: {phone_number} (${sms_cost:.3f})")
    
    @classmethod
    def blacklist_number(cls, phone_number: str, duration: int = 86400, reason: str = ""):
        """Manually blacklist a phone number"""
        blacklist_key = f"sms_blacklist:phone:{phone_number}"
        cache.set(blacklist_key, True, duration)
        logger.warning(f"🚫 Phone number blacklisted: {phone_number} for {duration}s. Reason: {reason}")
    
    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """Get current SMS usage statistics"""
        return {
            'daily_cost': cache.get(f"sms_cost:daily:{datetime.now().date()}", 0.0),
            'monthly_cost': cache.get(f"sms_cost:monthly:{datetime.now().strftime('%Y-%m')}", 0.0),
            'global_per_minute': cache.get("sms_rate:global:minute", 0),
            'limits': cls.RATE_LIMITS
        }