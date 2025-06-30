"""
Tax Filing Notification Templates

This module contains email and SMS templates for different filing statuses
and notification types.
"""

from typing import Dict, Any, Optional
from django.template import Template, Context
from django.utils.html import format_html


# Email template configurations
EMAIL_TEMPLATES = {
    'filing_confirmed': {
        'subject': 'Tax Filing Confirmed - {confirmation_number}',
        'html_template': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #1a365d;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f7fafc;
            padding: 30px;
            border: 1px solid #e2e8f0;
            border-radius: 0 0 8px 8px;
        }
        .confirmation-box {
            background-color: #e6fffa;
            border: 2px solid #38b2ac;
            padding: 20px;
            margin: 20px 0;
            border-radius: 6px;
            text-align: center;
        }
        .confirmation-number {
            font-size: 24px;
            font-weight: bold;
            color: #2c5282;
            margin: 10px 0;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .info-table td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .info-table td:first-child {
            font-weight: bold;
            width: 40%;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #4299e1;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Tax Filing Confirmation</h1>
    </div>
    
    <div class="content">
        <p>Dear {{ taxpayer_name }},</p>
        
        <p>Your tax filing has been successfully submitted and confirmed.</p>
        
        <div class="confirmation-box">
            <p>Your Confirmation Number:</p>
            <div class="confirmation-number">{{ confirmation_number }}</div>
            <p>Please save this number for your records</p>
        </div>
        
        <h2>Filing Details</h2>
        <table class="info-table">
            <tr>
                <td>Tax Year:</td>
                <td>{{ tax_year }}</td>
            </tr>
            <tr>
                <td>Filing Type:</td>
                <td>{{ filing_type }}</td>
            </tr>
            <tr>
                <td>State:</td>
                <td>{{ state }}</td>
            </tr>
            <tr>
                <td>Filing Date:</td>
                <td>{{ filing_date }}</td>
            </tr>
            <tr>
                <td>Status:</td>
                <td>{{ status }}</td>
            </tr>
            {% if amount_paid %}
            <tr>
                <td>Amount Paid:</td>
                <td>${{ amount_paid }}</td>
            </tr>
            {% endif %}
            {% if payment_method %}
            <tr>
                <td>Payment Method:</td>
                <td>{{ payment_method }}</td>
            </tr>
            {% endif %}
        </table>
        
        <h2>What's Next?</h2>
        <ul>
            <li>Your filing has been submitted to the appropriate tax authority</li>
            <li>Processing times vary by jurisdiction (typically 24-72 hours)</li>
            <li>You will receive updates on your filing status</li>
            <li>A PDF receipt is attached to this email for your records</li>
        </ul>
        
        <p style="text-align: center;">
            <a href="{{ dashboard_url }}" class="button">View Filing Status</a>
        </p>
        
        <h2>Need Help?</h2>
        <p>If you have questions about your filing, please contact our support team with your confirmation number.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message from Dott Tax Filing System<br>
        Please do not reply to this email</p>
    </div>
</body>
</html>
        ''',
        'text_template': '''
Tax Filing Confirmation

Dear {{ taxpayer_name }},

Your tax filing has been successfully submitted and confirmed.

CONFIRMATION NUMBER: {{ confirmation_number }}
Please save this number for your records.

Filing Details:
- Tax Year: {{ tax_year }}
- Filing Type: {{ filing_type }}
- State: {{ state }}
- Filing Date: {{ filing_date }}
- Status: {{ status }}
{% if amount_paid %}- Amount Paid: ${{ amount_paid }}{% endif %}
{% if payment_method %}- Payment Method: {{ payment_method }}{% endif %}

What's Next?
- Your filing has been submitted to the appropriate tax authority
- Processing times vary by jurisdiction (typically 24-72 hours)
- You will receive updates on your filing status
- A PDF receipt is attached to this email for your records

View your filing status at: {{ dashboard_url }}

Need Help?
If you have questions about your filing, please contact our support team with your confirmation number.

This is an automated message from Dott Tax Filing System
Please do not reply to this email
        '''
    },
    
    'filing_accepted': {
        'subject': 'Tax Filing Accepted - {confirmation_number}',
        'html_template': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* Similar styles as above */
    </style>
</head>
<body>
    <div class="header" style="background-color: #38a169;">
        <h1>Tax Filing Accepted</h1>
    </div>
    
    <div class="content">
        <p>Dear {{ taxpayer_name }},</p>
        
        <p>Great news! Your tax filing has been accepted by {{ tax_authority }}.</p>
        
        <div class="confirmation-box" style="background-color: #c6f6d5; border-color: #38a169;">
            <p>Confirmation Number:</p>
            <div class="confirmation-number">{{ confirmation_number }}</div>
            <p>Agency Reference: {{ agency_reference }}</p>
        </div>
        
        <p>Your filing has been successfully processed and accepted. No further action is required at this time.</p>
        
        {% if refund_amount %}
        <h2>Refund Information</h2>
        <p>Expected Refund: ${{ refund_amount }}</p>
        <p>Estimated Processing Time: {{ refund_timeline }}</p>
        {% endif %}
    </div>
</body>
</html>
        ''',
        'text_template': '''
Tax Filing Accepted

Dear {{ taxpayer_name }},

Great news! Your tax filing has been accepted by {{ tax_authority }}.

Confirmation Number: {{ confirmation_number }}
Agency Reference: {{ agency_reference }}

Your filing has been successfully processed and accepted. No further action is required at this time.

{% if refund_amount %}
Refund Information:
- Expected Refund: ${{ refund_amount }}
- Estimated Processing Time: {{ refund_timeline }}
{% endif %}
        '''
    },
    
    'filing_rejected': {
        'subject': 'Tax Filing Rejected - Action Required - {confirmation_number}',
        'html_template': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* Similar styles as above */
    </style>
</head>
<body>
    <div class="header" style="background-color: #e53e3e;">
        <h1>Tax Filing Rejected - Action Required</h1>
    </div>
    
    <div class="content">
        <p>Dear {{ taxpayer_name }},</p>
        
        <p>Your tax filing has been rejected by {{ tax_authority }} and requires correction.</p>
        
        <div class="confirmation-box" style="background-color: #fed7d7; border-color: #e53e3e;">
            <p>Confirmation Number:</p>
            <div class="confirmation-number">{{ confirmation_number }}</div>
            <p>Status: REJECTED</p>
        </div>
        
        <h2>Rejection Reasons</h2>
        <ul>
            {% for reason in rejection_reasons %}
            <li>{{ reason }}</li>
            {% endfor %}
        </ul>
        
        <h2>Required Actions</h2>
        <ol>
            {% for action in required_actions %}
            <li>{{ action }}</li>
            {% endfor %}
        </ol>
        
        <p style="text-align: center;">
            <a href="{{ correction_url }}" class="button" style="background-color: #e53e3e;">
                Correct Filing
            </a>
        </p>
        
        <p><strong>Deadline:</strong> Please correct and resubmit by {{ correction_deadline }}</p>
    </div>
</body>
</html>
        ''',
        'text_template': '''
Tax Filing Rejected - Action Required

Dear {{ taxpayer_name }},

Your tax filing has been rejected by {{ tax_authority }} and requires correction.

Confirmation Number: {{ confirmation_number }}
Status: REJECTED

Rejection Reasons:
{% for reason in rejection_reasons %}- {{ reason }}
{% endfor %}

Required Actions:
{% for action in required_actions %}{{ forloop.counter }}. {{ action }}
{% endfor %}

Correct your filing at: {{ correction_url }}

Deadline: Please correct and resubmit by {{ correction_deadline }}
        '''
    },
    
    'payment_received': {
        'subject': 'Tax Payment Received - {confirmation_number}',
        'html_template': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
    <div class="header" style="background-color: #2b6cb0;">
        <h1>Tax Payment Received</h1>
    </div>
    
    <div class="content">
        <p>Dear {{ taxpayer_name }},</p>
        
        <p>Your tax payment has been successfully received and processed.</p>
        
        <div class="confirmation-box">
            <p>Payment Confirmation:</p>
            <div class="confirmation-number">{{ payment_confirmation }}</div>
            <p>Amount: ${{ payment_amount }}</p>
        </div>
        
        <table class="info-table">
            <tr>
                <td>Payment Date:</td>
                <td>{{ payment_date }}</td>
            </tr>
            <tr>
                <td>Payment Method:</td>
                <td>{{ payment_method }}</td>
            </tr>
            <tr>
                <td>Applied to Filing:</td>
                <td>{{ confirmation_number }}</td>
            </tr>
        </table>
    </div>
</body>
</html>
        ''',
        'text_template': '''
Tax Payment Received

Dear {{ taxpayer_name }},

Your tax payment has been successfully received and processed.

Payment Confirmation: {{ payment_confirmation }}
Amount: ${{ payment_amount }}

Payment Date: {{ payment_date }}
Payment Method: {{ payment_method }}
Applied to Filing: {{ confirmation_number }}
        '''
    }
}


# SMS Templates (160 character limit)
SMS_TEMPLATES = {
    'filing_confirmed': '''Dott Tax: Filing confirmed! 
Confirmation #{{ confirmation_number }}
{{ filing_type }} for {{ tax_year }}
Check email for receipt''',
    
    'filing_accepted': '''Dott Tax: Filing ACCEPTED by {{ tax_authority }}!
Ref #{{ confirmation_number }}
{% if refund_amount %}Refund: ${{ refund_amount }}{% endif %}''',
    
    'filing_rejected': '''Dott Tax: Filing REJECTED - Action required
#{{ confirmation_number }}
Login to correct by {{ correction_deadline }}''',
    
    'payment_received': '''Dott Tax: Payment received
${{ payment_amount }} for #{{ confirmation_number }}
Thank you!''',
    
    'reminder': '''Dott Tax Reminder: {{ reminder_text }}
Due: {{ due_date }}'''
}


def get_email_template(template_name: str) -> Dict[str, str]:
    """Get email template by name."""
    return EMAIL_TEMPLATES.get(template_name, EMAIL_TEMPLATES['filing_confirmed'])


def get_sms_template(template_name: str, context: Dict[str, Any]) -> str:
    """Get and render SMS template."""
    template_string = SMS_TEMPLATES.get(template_name, SMS_TEMPLATES['filing_confirmed'])
    template = Template(template_string)
    rendered = template.render(Context(context))
    
    # Ensure SMS is within character limit
    if len(rendered) > 160:
        rendered = rendered[:157] + '...'
    
    return rendered


def get_confirmation_context(confirmation) -> Dict[str, Any]:
    """Build context for confirmation templates."""
    filing = confirmation.filing
    taxpayer = filing.taxpayer if filing.taxpayer else None
    
    context = {
        'confirmation_number': confirmation.confirmation_number,
        'taxpayer_name': taxpayer.full_name if taxpayer else 'Taxpayer',
        'tax_year': filing.tax_year,
        'filing_type': filing.get_filing_type_display(),
        'state': filing.state or 'Federal',
        'filing_date': filing.submitted_at.strftime('%B %d, %Y at %I:%M %p') if filing.submitted_at else 'N/A',
        'status': filing.get_status_display(),
        'amount_paid': f"{filing.payment_amount:,.2f}" if filing.payment_amount else None,
        'payment_method': filing.payment_method,
        'dashboard_url': f"https://dottapps.com/taxes/filings/{filing.id}",
        'tax_authority': _get_tax_authority_name(filing.state),
    }
    
    # Add agency-specific data if available
    if hasattr(filing, 'agency_confirmation'):
        context['agency_reference'] = filing.agency_confirmation
    
    return context


def _get_tax_authority_name(state: Optional[str]) -> str:
    """Get the name of the tax authority for a state."""
    if not state:
        return "Internal Revenue Service (IRS)"
    
    state_authorities = {
        'CA': 'California Franchise Tax Board',
        'NY': 'New York State Department of Taxation and Finance',
        'TX': 'Texas Comptroller of Public Accounts',
        'FL': 'Florida Department of Revenue',
        'IL': 'Illinois Department of Revenue',
        'PA': 'Pennsylvania Department of Revenue',
        'OH': 'Ohio Department of Taxation',
        'GA': 'Georgia Department of Revenue',
        'NC': 'North Carolina Department of Revenue',
        'MI': 'Michigan Department of Treasury',
    }
    
    return state_authorities.get(state, f"{state} Department of Revenue")


# PDF Receipt Templates
def get_pdf_styles():
    """Get standard PDF styles for receipts."""
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name='ReceiptHeader',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=20,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='ReceiptSubheader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#2c5282'),
        spaceAfter=10
    ))
    
    styles.add(ParagraphStyle(
        name='ReceiptInfo',
        parent=styles['Normal'],
        fontSize=10,
        leading=12
    ))
    
    styles.add(ParagraphStyle(
        name='ReceiptFooter',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#718096'),
        alignment=TA_CENTER
    ))
    
    return styles


# Notification status messages
STATUS_MESSAGES = {
    'pending': 'Your filing is being processed',
    'submitted': 'Your filing has been submitted successfully',
    'accepted': 'Your filing has been accepted by the tax authority',
    'rejected': 'Your filing has been rejected and requires correction',
    'amended': 'Your amended filing has been submitted',
    'paid': 'Payment has been received for your filing',
}


def get_status_message(status: str) -> str:
    """Get user-friendly status message."""
    return STATUS_MESSAGES.get(status, 'Your filing is in progress')