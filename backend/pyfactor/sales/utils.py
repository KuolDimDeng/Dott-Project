
#/Users/kuoldeng/projectx/backend/pyfactor/sales/utils.py
from datetime import datetime, date, timedelta
from finance.models import Account, AccountType, FinanceTransaction
from django.db import IntegrityError, connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.logging_config import get_logger
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle, Paragraph, Spacer
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from users.models import UserProfile



logger = get_logger()



def ensure_date(value):
    logger.debug(f"ensure_date called with value: {value} (type: {type(value)})")
    if isinstance(value, datetime):
        logger.debug(f"Converting datetime to date: {value}")
        return value.date()
    elif isinstance(value, str):
        try:
            converted_date = datetime.fromisoformat(value).date()
            logger.debug(f"Converted string to date: {converted_date}")
            return converted_date
        except ValueError:
            logger.error(f"Failed to convert string to date: {value}")
            raise
    elif isinstance(value, date):
        logger.debug(f"Returning date as-is: {value}")
        return value
    else:
        logger.error(f"Unsupported type for date conversion: {type(value)}")
        raise TypeError(f"Unsupported type for date conversion: {type(value)}")



def get_or_create_account(database_name, account_name, account_type_name):
    logger.debug(f"Attempting to get or create account: {account_name} of type {account_type_name} in database {database_name}")
    
    # First, try to get the AccountType
    try:
        logger.debug(f"Trying to get AccountType: {account_type_name}")
        account_type = AccountType.objects.using(database_name).get(name=account_type_name)
        logger.debug(f"Successfully retrieved AccountType: {account_type}")
    except AccountType.DoesNotExist:
        logger.debug(f"AccountType {account_type_name} does not exist. Attempting to create.")
        try:
            account_type = AccountType.objects.using(database_name).create(name=account_type_name)
            logger.debug(f"Successfully created AccountType: {account_type}")
        except IntegrityError:
            logger.warning(f"IntegrityError while creating AccountType. It might have been created concurrently. Trying to fetch again.")
            account_type = AccountType.objects.using(database_name).get(name=account_type_name)
            logger.debug(f"Successfully retrieved AccountType after IntegrityError: {account_type}")

    # Now that we have the AccountType, get or create the Account
    logger.debug(f"Attempting to get or create Account: {account_name}")
    try:
        account, created = Account.objects.using(database_name).get_or_create(
            name=account_name,
            defaults={'account_type': account_type}
        )
        if created:
            logger.debug(f"Created new Account: {account}")
        else:
            logger.debug(f"Retrieved existing Account: {account}")
    except IntegrityError:
        logger.warning(f"IntegrityError while creating Account. It might have been created concurrently. Trying to fetch.")
        account = Account.objects.using(database_name).get(name=account_name)
        logger.debug(f"Successfully retrieved Account after IntegrityError: {account}")

    return account


def remove_time_from_datetime(dt):
    if isinstance(dt, datetime):
        return dt.date()
    return dt


def calculate_due_date(date):
    return date + timedelta(days=30)


def generate_pdf(estimate):
    logger.debug("Starting PDF generation for estimate: %s", estimate.id)
    buffer = BytesIO()
    try:
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Set up styles
        styles = getSampleStyleSheet()
        title_style = styles['Heading1']
        normal_style = styles['Normal']

        # Draw company logo (if available)
        # p.drawInlineImage("path/to/logo.png", 40, height - 50, width=100, height=50)

        # Draw estimate details
        p.setFont("Helvetica-Bold", 16)
        p.drawString(40, height - 40, f"Estimate #{estimate.estimate_num}")

        p.setFont("Helvetica", 12)
        p.drawString(40, height - 60, f"Date: {estimate.date.strftime('%Y-%m-%d')}")
        p.drawString(40, height - 80, f"Valid Until: {estimate.valid_until.strftime('%Y-%m-%d')}")

        # Draw customer details
        p.drawString(40, height - 110, "Bill To:")
        customer_name = f"{estimate.customer.first_name} {estimate.customer.last_name}"
        p.drawString(40, height - 130, customer_name)

        p.drawString(40, height - 150, estimate.customer.street)
        p.drawString(40, height - 170, f"{estimate.customer.city}, {estimate.customer.billingState} {estimate.customer.postcode}")

        # Draw estimate items
        data = [['Item', 'Description', 'Quantity', 'Unit Price', 'Total']]
        for item in estimate.items.all():
            data.append([
                item.product.name if item.product else item.service.name,
                item.description,
                str(item.quantity),
                f"${item.unit_price:.2f}",
              #  f"${item.total:.2f}"
            ])

        # Add totals
        data.append(['', '', '', 'Subtotal', f"${estimate.totalAmount:.2f}"])
       # if estimate.tax:
           # data.append(['', '', '', 'Tax', f"${estimate.tax:.2f}"])
        if estimate.discount:
            data.append(['', '', '', 'Discount', f"${estimate.discount:.2f}"])
        data.append(['', '', '', 'Total', f"${estimate.totalAmount:.2f}"])

        table = Table(data, colWidths=[100, 200, 50, 70, 70])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        table.wrapOn(p, width - 80, height)
        table.drawOn(p, 40, height - 400)

        # Draw footer
        if estimate.footer:
            footer_text = Paragraph(estimate.footer, normal_style)
            footer_text.wrapOn(p, width - 80, height)
            footer_text.drawOn(p, 40, 50)

        p.showPage()
        p.save()
        buffer.seek(0)
        logger.debug("PDF generation successful for estimate: %s", estimate.id)
        return buffer
    except Exception as e:
        logger.exception("Error generating PDF for estimate %s: %s", estimate.id, str(e))
        raise
    
def get_or_create_user_database(user):
    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error(f"Database name is empty for user: {user.id}")
            raise ValueError("Database name is empty.")

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        return database_name
    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user.id}")
        raise ValueError("User profile not found.")