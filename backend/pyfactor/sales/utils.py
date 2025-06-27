
#/Users/kuoldeng/projectx/backend/pyfactor/sales/utils.py
from datetime import datetime, date, timedelta
from decimal import Decimal
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


def generate_invoice_pdf(invoice):
    """Generate PDF for invoice with proper formatting"""
    logger.debug("Starting PDF generation for invoice: %s", invoice.id)
    buffer = BytesIO()
    try:
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Set up styles
        styles = getSampleStyleSheet()
        title_style = styles['Heading1']
        normal_style = styles['Normal']

        # Draw invoice header
        p.setFont("Helvetica-Bold", 20)
        p.drawString(40, height - 40, "INVOICE")
        
        # Draw invoice details on the right
        p.setFont("Helvetica", 10)
        invoice_num = getattr(invoice, 'invoice_num', f'INV-{invoice.id}')
        p.drawRightString(width - 40, height - 40, f"Invoice #: {invoice_num}")
        
        # Handle date formatting
        try:
            date_str = invoice.date.strftime('%Y-%m-%d')
        except:
            date_str = str(invoice.date)
        p.drawRightString(width - 40, height - 55, f"Date: {date_str}")
        
        try:
            due_date_str = invoice.due_date.strftime('%Y-%m-%d')
        except:
            due_date_str = str(invoice.due_date)
        p.drawRightString(width - 40, height - 70, f"Due Date: {due_date_str}")
        
        # Draw status
        status_color = colors.green if invoice.status == 'paid' else colors.orange if invoice.status == 'sent' else colors.grey
        p.setFillColor(status_color)
        p.setFont("Helvetica-Bold", 12)
        p.drawRightString(width - 40, height - 90, invoice.status.upper())
        p.setFillColor(colors.black)

        # Draw business info from tenant
        p.setFont("Helvetica", 10)
        y_pos = height - 120
        
        # Try to get tenant information
        business_name = "Your Business"
        business_address = None
        
        try:
            # Access tenant through the invoice's tenant relationship
            if hasattr(invoice, 'tenant') and invoice.tenant:
                business_name = invoice.tenant.name or "Your Business"
                logger.debug(f"Using tenant name: {business_name}")
            elif hasattr(invoice, 'tenant_id') and invoice.tenant_id:
                # If tenant is not loaded, try to fetch it
                from custom_auth.models import Tenant
                tenant = Tenant.objects.filter(id=invoice.tenant_id).first()
                if tenant:
                    business_name = tenant.name or "Your Business"
                    logger.debug(f"Fetched tenant name: {business_name}")
        except Exception as e:
            logger.warning(f"Could not fetch tenant information: {e}")
        
        # Display business name
        p.setFont("Helvetica-Bold", 11)
        p.drawString(40, y_pos, business_name)
        y_pos -= 15
        
        # TODO: Add business address fields when available in Tenant or Business model
        # For now, we'll add placeholder for future enhancement
        # p.drawString(40, y_pos, business_street)
        # y_pos -= 15
        # p.drawString(40, y_pos, f"{business_city}, {business_state} {business_postcode}")
        # y_pos -= 15

        # Draw customer details
        y_pos -= 20
        p.setFont("Helvetica-Bold", 10)
        p.drawString(40, y_pos, "Bill To:")
        p.setFont("Helvetica", 10)
        y_pos -= 15
        
        # Check if customer exists
        if hasattr(invoice, 'customer') and invoice.customer:
            # Format customer name - handle all possible name fields
            customer_name = ""
            if hasattr(invoice.customer, 'business_name') and invoice.customer.business_name:
                customer_name = invoice.customer.business_name
            elif hasattr(invoice.customer, 'first_name') and invoice.customer.first_name:
                first_name = invoice.customer.first_name or ""
                last_name = getattr(invoice.customer, 'last_name', "") or ""
                customer_name = f"{first_name} {last_name}".strip()
            elif hasattr(invoice.customer, 'name') and invoice.customer.name:
                customer_name = invoice.customer.name
            else:
                customer_name = "Customer"
                
            # Display customer name
            p.setFont("Helvetica-Bold", 10)
            p.drawString(40, y_pos, customer_name)
            p.setFont("Helvetica", 10)
            y_pos -= 15
            
            # Display customer address
            street = getattr(invoice.customer, 'street', None) or getattr(invoice.customer, 'address', None) or ""
            if street:
                p.drawString(40, y_pos, street)
                y_pos -= 15
                
            # Display city, state, postcode
            city = getattr(invoice.customer, 'city', "") or ""
            state = getattr(invoice.customer, 'billing_state', "") or getattr(invoice.customer, 'state', "") or ""
            postcode = getattr(invoice.customer, 'postcode', "") or getattr(invoice.customer, 'zip_code', "") or ""
            
            if city or state or postcode:
                address_line = []
                if city:
                    address_line.append(city)
                if state:
                    if city:
                        address_line.append(f", {state}")
                    else:
                        address_line.append(state)
                if postcode:
                    address_line.append(f" {postcode}")
                    
                p.drawString(40, y_pos, "".join(address_line))
                y_pos -= 15
                
            # Display email if available
            email = getattr(invoice.customer, 'email', None)
            if email:
                p.drawString(40, y_pos, email)
                y_pos -= 15
                
            # Display phone if available
            phone = getattr(invoice.customer, 'phone', None) or getattr(invoice.customer, 'phone_number', None)
            if phone:
                p.drawString(40, y_pos, phone)
                y_pos -= 15
        else:
            p.drawString(40, y_pos, "No customer information")
            y_pos -= 15

        # Draw invoice items table
        y_pos -= 30
        data = [['Description', 'Quantity', 'Unit Price', 'Total']]
        
        subtotal = Decimal('0.00')
        try:
            items = invoice.items.all()
        except Exception as e:
            logger.warning(f"Could not fetch invoice items: {e}")
            items = []
        
        for item in items:
            item_name = ""
            if hasattr(item, 'product') and item.product:
                item_name = getattr(item.product, 'name', 'Product')
            elif hasattr(item, 'service') and item.service:
                item_name = getattr(item.service, 'name', 'Service')
            elif hasattr(item, 'description') and item.description:
                item_name = item.description
            else:
                item_name = "Item"
            
            quantity = getattr(item, 'quantity', 1)
            unit_price = getattr(item, 'unit_price', 0)
            item_total = Decimal(str(quantity)) * Decimal(str(unit_price))
            subtotal += item_total
            
            data.append([
                item_name,
                str(quantity),
                f"${unit_price:.2f}",
                f"${item_total:.2f}"
            ])

        # Create the table
        table = Table(data, colWidths=[250, 60, 80, 80])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),  # Quantity column
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),   # Price columns
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        # Calculate table position
        table_width, table_height = table.wrap(width - 80, height)
        table.drawOn(p, 40, y_pos - table_height)
        
        # Draw totals
        y_pos = y_pos - table_height - 20
        p.setFont("Helvetica", 10)
        
        # Subtotal
        p.drawString(350, y_pos, "Subtotal:")
        invoice_subtotal = getattr(invoice, 'subtotal', subtotal)
        p.drawRightString(width - 40, y_pos, f"${invoice_subtotal:.2f}")
        y_pos -= 20
        
        # Tax if applicable
        tax_total = getattr(invoice, 'tax_total', 0)
        if tax_total and tax_total > 0:
            p.drawString(350, y_pos, "Tax:")
            p.drawRightString(width - 40, y_pos, f"${tax_total:.2f}")
            y_pos -= 20
        
        # Discount if applicable
        discount = getattr(invoice, 'discount', 0)
        if discount and discount > 0:
            p.drawString(350, y_pos, "Discount:")
            p.drawRightString(width - 40, y_pos, f"-${discount:.2f}")
            y_pos -= 20
        
        # Total
        p.setFont("Helvetica-Bold", 11)
        p.drawString(350, y_pos, "Total:")
        invoice_total = getattr(invoice, 'total', getattr(invoice, 'totalAmount', 0))
        p.drawRightString(width - 40, y_pos, f"${invoice_total:.2f}")
        y_pos -= 20
        
        # Amount paid and balance due
        amount_paid = getattr(invoice, 'amount_paid', 0)
        if amount_paid and amount_paid > 0:
            p.setFont("Helvetica", 10)
            p.drawString(350, y_pos, "Amount Paid:")
            p.drawRightString(width - 40, y_pos, f"${amount_paid:.2f}")
            y_pos -= 20
            
            p.setFont("Helvetica-Bold", 11)
            p.drawString(350, y_pos, "Balance Due:")
            balance_due = getattr(invoice, 'balance_due', invoice_total - amount_paid)
            p.drawRightString(width - 40, y_pos, f"${balance_due:.2f}")
            y_pos -= 20

        # Draw notes if any
        if invoice.notes:
            y_pos -= 20
            p.setFont("Helvetica-Bold", 10)
            p.drawString(40, y_pos, "Notes:")
            y_pos -= 15
            p.setFont("Helvetica", 9)
            # Split notes into lines
            lines = invoice.notes.split('\n')
            for line in lines[:5]:  # Limit to 5 lines
                if len(line) > 80:
                    line = line[:80] + "..."
                p.drawString(40, y_pos, line)
                y_pos -= 12

        # Draw terms if any
        if invoice.terms:
            y_pos -= 20
            p.setFont("Helvetica-Bold", 10)
            p.drawString(40, y_pos, "Terms:")
            y_pos -= 15
            p.setFont("Helvetica", 9)
            # Split terms into lines
            lines = invoice.terms.split('\n')
            for line in lines[:3]:  # Limit to 3 lines
                if len(line) > 80:
                    line = line[:80] + "..."
                p.drawString(40, y_pos, line)
                y_pos -= 12

        # Footer
        p.setFont("Helvetica", 8)
        p.drawCentredString(width/2, 30, "Thank you for your business!")

        p.showPage()
        p.save()
        buffer.seek(0)
        logger.debug("PDF generation successful for invoice: %s", invoice.id)
        return buffer
    except AttributeError as e:
        logger.error(f"AttributeError in PDF generation - missing field: {str(e)}")
        logger.error(f"Invoice object type: {type(invoice)}")
        logger.error(f"Invoice fields: {[f.name for f in invoice._meta.fields] if hasattr(invoice, '_meta') else 'No meta'}")
        raise Exception(f"PDF generation failed due to missing invoice field: {str(e)}")
    except Exception as e:
        logger.exception("Error generating PDF for invoice %s: %s", invoice.id, str(e))
        raise Exception(f"PDF generation failed: {str(e)}")
    
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

PRODUCT_FIELDS_MAPPING = {
    # Common fields for all products
    'common': ['name', 'description', 'price', 'is_for_sale', 'is_for_rent', 'salesTax'],
    
    # E-commerce and Retail
    'E-commerce and Retail': [
        'category', 'subcategory', 'brand', 'condition', 'weight', 'height', 'width',
        'weight_unit', 'height_unit', 'width_unit', 'stock_quantity', 'reorder_level',
        'sku', 'barcode'
    ],
    
    # Apparel and Clothing
    'Apparel and Clothing': [
        'category', 'subcategory', 'size', 'color', 'gender', 'material', 'brand',
        'style', 'season', 'care_instructions'
    ],
    
    # Fashion and Apparel
    'Fashion and Apparel': [
        'category', 'subcategory', 'size', 'color', 'gender', 'material', 'brand',
        'style', 'season', 'care_instructions'
    ],
    
    # Food and Beverage
    'Beverage and Food Services': [
        'category', 'subcategory', 'ingredients', 'allergens', 'nutritional_info',
        'preparation_time', 'shelf_life', 'storage_instructions'
    ],
    
    # Restaurants, Cafes, and Food Services
    'Restaurants, Cafes, and Food Services': [
        'category', 'subcategory', 'ingredients', 'allergens', 'nutritional_info',
        'preparation_time', 'menu_section', 'diet_type'
    ],
    
    # Catering and Food Trucks
    'Catering and Food Trucks': [
        'category', 'subcategory', 'ingredients', 'allergens', 'preparation_time',
        'serving_size', 'minimum_order_quantity'
    ],
    
    # Transportation
    'Transportation, Trucking, and Freight': [
        'category', 'vehicle_type', 'load_capacity', 'mileage', 'maintenance_history',
        'registration_info'
    ],
    
    # Manufacturing
    'Manufacturing and Production': [
        'category', 'material', 'weight', 'dimensions', 'stock_quantity',
        'manufacturing_time', 'quality_grade', 'specifications'
    ],
    
    # Electronics and IT Equipment
    'Electronics and IT Equipment': [
        'category', 'brand', 'model', 'specifications', 'condition', 'warranty_period',
        'compatibility', 'power_requirements'
    ],
    
    # Furniture and Home Decor
    'Furniture and Home Decor': [
        'category', 'material', 'color', 'dimensions', 'style', 'assembly_required',
        'room_type', 'care_instructions'
    ],
    
    # Beauty Services
    'Barbershops, Hair Salons, and Beauty Services': [
        'category', 'brand', 'volume', 'ingredients', 'for_hair_type',
        'application_instructions', 'expiry_date'
    ],
    
    # Health and Medical
    'Healthcare and Medical Services': [
        'category', 'brand', 'dosage', 'active_ingredients', 'usage_instructions',
        'side_effects', 'prescription_required', 'expiry_date'
    ],
    
    # Medical Equipment
    'Medical Equipment and Devices': [
        'category', 'brand', 'model', 'specifications', 'certification',
        'warranty_period', 'sterilization_requirements'
    ],
    
    # Pet Services
    'Veterinary and Pet Services': [
        'category', 'pet_type', 'age_group', 'size', 'ingredients',
        'usage_instructions', 'precautions'
    ],
    
    # Construction
    'Construction and Contracting': [
        'category', 'material', 'dimensions', 'weight', 'safety_rating',
        'installation_requirements', 'warranty_period'
    ],
    
    # Agriculture
    'Agriculture and Farming': [
        'category', 'crop_type', 'application_method', 'coverage_area',
        'organic_status', 'growing_season', 'storage_requirements'
    ],
    
    # Arts and Crafts
    'Arts and Crafts': [
        'category', 'material', 'dimensions', 'weight', 'color', 'age_group',
        'skill_level', 'care_instructions'
    ],
    
    # Automotive
    'Automotive, Leasing, and Repair': [
        'category', 'make', 'model', 'year', 'part_number', 'compatibility',
        'condition', 'warranty_period'
    ],
    
    # Books and Educational
    'Education and Tutoring': [
        'category', 'author', 'publisher', 'edition', 'language', 'format',
        'page_count', 'isbn'
    ],
    
    # Photography
    'Photography and Videography': [
        'category', 'brand', 'model', 'specifications', 'compatibility',
        'condition', 'warranty_period', 'accessories_included'
    ],
    
    # Printing
    'Printing, Publishing, and Copy Services': [
        'category', 'paper_type', 'dimensions', 'color_mode', 'finish',
        'quantity_options', 'turnaround_time'
    ],
    
    # Sports and Fitness
    'Fitness and Personal Training': [
        'category', 'material', 'dimensions', 'weight', 'recommended_use',
        'skill_level', 'age_group', 'warranty_period'
    ],
    
    # Technology
    'Software Development and IT Services': [
        'category', 'version', 'compatibility', 'license_type', 'supported_platforms',
        'languages', 'features', 'updates_included'
    ],
    
    # Web Development
    'Web Development and Design Services': [
        'category', 'platform', 'features', 'hosting_requirements', 'browser_compatibility',
        'responsive_design', 'maintenance_included'
    ],
    
    # Real Estate
    'Real Estate and Property Management': [
        'category', 'property_type', 'square_footage', 'lot_size', 'year_built',
        'location', 'features', 'condition'
    ],
    
    # Jewelry
    'Jewelry and Watchmaking': [
        'category', 'material', 'gemstone', 'weight', 'dimensions', 'style',
        'authenticity_certificate', 'care_instructions'
    ],
    
    # Security
    'Security and Alarm Services': [
        'category', 'brand', 'model', 'compatibility', 'power_source',
        'installation_requirements', 'warranty_period'
    ],
    
    # Energy
    'Renewable Energy and Green Tech': [
        'category', 'power_output', 'dimensions', 'efficiency_rating',
        'installation_requirements', 'warranty_period', 'certification'
    ],
    
    # Wholesale and Distribution
    'Wholesale and Distribution': [
        'category', 'brand', 'minimum_order_quantity', 'lead_time', 
        'country_of_origin', 'bulk_pricing_tiers', 'certification'
    ]
}

SERVICE_FIELDS_MAPPING = {
    # Common fields for all services
    'common': ['name', 'description', 'price', 'duration', 'is_recurring'],
    
    # Professional Services
    'Accounting and Bookkeeping': [
        'category', 'subcategory', 'certification', 'skill_level', 'experience_years',
        'deliverables', 'turnaround_time', 'software_used'
    ],
    
    # Legal Services
    'Law and Legal Services': [
        'category', 'subcategory', 'certification', 'experience_years',
        'jurisdiction', 'deliverables', 'confidentiality_terms'
    ],
    
    # Healthcare
    'Healthcare and Medical Services': [
        'category', 'subcategory', 'certification', 'min_booking_notice', 'buffer_time',
        'insurance_accepted', 'virtual_option', 'prerequisites'
    ],
    
    # Event planning
    'Event Planning, Rentals, and Technology': [
        'category', 'max_capacity', 'amenities', 'duration',
        'setup_time', 'takedown_time', 'included_staff', 'restrictions'
    ],
    
    # Transportation
    'Transportation, Trucking, and Freight': [
        'category', 'service_area', 'vehicle_requirements', 'load_capacity',
        'estimated_time', 'insurance_coverage', 'tracking_available'
    ],
    
    # Consulting
    'Business Consulting and Advisory Services': [
        'category', 'expertise_area', 'experience_years', 'deliverables',
        'session_format', 'follow_up_included', 'industries_served'
    ],
    
    # Marketing
    'Digital Marketing and Online Services': [
        'category', 'platforms_used', 'deliverables', 'reporting_frequency',
        'minimum_contract_period', 'included_revisions', 'target_metrics'
    ],
    
    # Creative Services
    'Creative Services (Design, Graphic Design)': [
        'category', 'deliverable_format', 'revision_rounds', 'turnaround_time',
        'source_files_included', 'copyright_terms', 'style_options'
    ],
    
    # Cleaning Services
    'Cleaning Services': [
        'category', 'coverage_area', 'duration', 'supplies_included',
        'eco_friendly_options', 'minimum_frequency', 'insurance_coverage'
    ],
    
    # Education
    'Education and Tutoring': [
        'category', 'subject', 'teaching_level', 'session_format',
        'min_booking_notice', 'prerequisites', 'materials_included'
    ],
    
    # Real Estate
    'Real Estate and Property Management': [
        'category', 'coverage_area', 'property_types', 'license_number',
        'fee_structure', 'services_included', 'min_contract_period'
    ],
    
    # Software
    'Software Development and IT Services': [
        'category', 'technologies', 'deliverables', 'support_period',
        'hosting_included', 'source_code_included', 'milestone_schedule'
    ],
    
    # Wellness
    'Wellness and Spa Services': [
        'category', 'duration', 'prerequisites', 'contraindications',
        'products_used', 'follow_up_included', 'certification'
    ],
    
    # Fitness
    'Fitness and Personal Training': [
        'category', 'session_format', 'equipment_required', 'fitness_level',
        'specialization', 'assessment_included', 'nutrition_guidance'
    ],
    
    # Photography
    'Photography and Videography': [
        'category', 'duration', 'deliverable_format', 'number_of_photos',
        'editing_included', 'usage_rights', 'turnaround_time'
    ],
    
    # Repair Services
    'Automotive, Leasing, and Repair': [
        'category', 'vehicle_types', 'warranty_period', 'parts_included',
        'diagnostic_fee', 'turnaround_time', 'shuttle_service'
    ],
    
    # Construction
    'Construction and Contracting': [
        'category', 'service_area', 'license_number', 'insurance_coverage',
        'warranty_offered', 'payment_schedule', 'permits_handling'
    ],
    
    # Pet Services
    'Veterinary and Pet Services': [
        'category', 'pet_types', 'certification', 'services_included',
        'location_type', 'emergency_available', 'insurance_accepted'
    ],
    
    # Virtual Services
    'Virtual Assistant and Administrative Services': [
        'category', 'hours_availability', 'response_time', 'skills',
        'software_proficiency', 'languages', 'industry_experience'
    ],
    
    # Web Development
    'Web Development and Design Services': [
        'category', 'technologies', 'deliverables', 'hosting_included',
        'maintenance_included', 'responsive_design', 'seo_included'
    ],
    
    # Insurance
    'Insurance and Risk Management': [
        'category', 'insurance_types', 'coverage_area', 'license_number',
        'carriers_represented', 'claim_assistance', 'review_frequency'
    ],
    
    # Financial Services
    'Financial Planning and Investment Services': [
        'category', 'certification', 'fee_structure', 'minimum_assets',
        'services_included', 'review_frequency', 'fiduciary_status'
    ],
    
    # Security
    'Security and Alarm Services': [
        'category', 'coverage_hours', 'response_time', 'equipment_included',
        'monitoring_included', 'contract_length', 'background_checks'
    ],
    
    # Home Services
    'Home Improvement and Renovation': [
        'category', 'service_area', 'license_number', 'insurance_coverage',
        'warranty_offered', 'payment_schedule', 'design_included'
    ]
}

def get_submenu_specific_fields(business_type, submenu_selections):
    """Get additional fields based on submenu selections"""
    additional_fields = []
    
    # E-commerce and Retail
    if business_type == 'E-commerce and Retail':
        # Online platforms
        platforms = submenu_selections.get('onlinePlatforms', {})
        if platforms:
            if platforms.get('marketplaces'):
                additional_fields.append('marketplace_id')
                additional_fields.append('marketplace_category')
            if platforms.get('ownStore'):
                additional_fields.append('store_url')
                additional_fields.append('store_category')
            if platforms.get('socialCommerce'):
                additional_fields.append('social_profile_url')
        
        # Product types
        if submenu_selections.get('productTypes') in ['Physical products', 'Mixed']:
            additional_fields.extend(['inventory_tracking', 'restock_threshold', 'shipping_weight', 'shipping_dimensions'])
        elif submenu_selections.get('productTypes') == 'Digital products':
            additional_fields.extend(['download_link', 'file_format', 'file_size', 'download_limit'])
        elif submenu_selections.get('productTypes') == 'Subscription boxes':
            additional_fields.extend(['subscription_frequency', 'box_contents', 'shipping_schedule'])
            
        # Fulfillment method
        if submenu_selections.get('fulfillment') == 'Dropshipping':
            additional_fields.extend(['supplier_id', 'supplier_sku', 'processing_time'])
        elif submenu_selections.get('fulfillment') == 'FBA (Fulfillment by Amazon)':
            additional_fields.extend(['fba_sku', 'amazon_fee', 'prep_required'])
            
    # Transportation, Trucking, and Freight
    elif business_type == 'Transportation, Trucking, and Freight':
        # Vehicle info
        vehicle_info = submenu_selections.get('vehicleInfo', {})
        if vehicle_info:
            if vehicle_info.get('vehicleTypes') == 'Specialized vehicle':
                additional_fields.append('vehicle_specifications')
                additional_fields.append('special_licenses_required')
            
            if vehicle_info.get('ownershipStatus') == 'Leased from carrier':
                additional_fields.extend(['lease_terms', 'lease_expiration'])
                
        # Cargo types
        if submenu_selections.get('cargoTypes') in ['Hazardous materials', 'Temperature-controlled']:
            additional_fields.extend(['special_handling_requirements', 'certification_required', 'temperature_range'])
            
        # Operating authority
        if submenu_selections.get('businessStructure', {}).get('operatingAuthority') == 'Own MC/DOT number':
            additional_fields.extend(['authority_number', 'insurance_requirements'])
            
    # Restaurant and Food Services
    elif business_type == 'Restaurants, Cafes, and Food Services':
        # Establishment type
        if submenu_selections.get('establishmentType') in ['Full-service restaurant', 'Bar/Pub']:
            additional_fields.extend(['alcohol_served', 'seating_capacity', 'reservation_required'])
        elif submenu_selections.get('establishmentType') == 'Food truck':
            additional_fields.extend(['location_schedule', 'power_requirements', 'serving_capacity'])
            
        # Delivery integrations
        if 'delivery' in submenu_selections.get('serviceTypes', []):
            delivery_platforms = submenu_selections.get('deliveryIntegrations', [])
            if delivery_platforms:
                if 'UberEats' in delivery_platforms:
                    additional_fields.append('ubereats_menu_link')
                if 'DoorDash' in delivery_platforms:
                    additional_fields.append('doordash_menu_link')
                additional_fields.append('delivery_radius')
                additional_fields.append('minimum_order')
                
    # Healthcare and Medical Services
    elif business_type == 'Healthcare and Medical Services':
        # Practice type
        if submenu_selections.get('practiceType') == 'Telemedicine':
            additional_fields.extend(['platform_used', 'technical_requirements', 'geographic_restrictions'])
            
        # Insurance model
        if submenu_selections.get('insuranceModel') == 'Insurance-based':
            additional_fields.append('accepted_insurance')
        elif submenu_selections.get('insuranceModel') == 'Subscription model':
            additional_fields.extend(['subscription_includes', 'subscription_excludes'])
            
        # Specialization
        specialization = submenu_selections.get('specialization')
        if specialization == 'Mental Health':
            additional_fields.extend(['session_type', 'treatment_approaches', 'crisis_availability'])
        elif specialization in ['Dentistry', 'Chiropractic', 'Physical Therapy']:
            additional_fields.extend(['treatment_duration', 'follow_up_included', 'equipment_used'])
            
    # Construction and Contracting
    elif business_type == 'Construction and Contracting':
        # Specialization
        specialization = submenu_selections.get('specialization')
        if specialization:
            if specialization in ['Electrical', 'Plumbing', 'HVAC']:
                additional_fields.extend(['license_number', 'emergency_availability', 'warranty_offered'])
            elif specialization in ['Roofing', 'Flooring', 'Painting']:
                additional_fields.extend(['material_options', 'preparation_included', 'cleanup_included'])
                
        # Project scope
        if submenu_selections.get('projectScope') in ['New construction', 'Remodeling']:
            additional_fields.extend(['permit_handling', 'design_services', 'project_timeline'])
            
        # Workforce structure
        if submenu_selections.get('workforceStructure') == 'Subcontractors':
            additional_fields.append('subcontractor_management')
            
    # Creative Services
    elif business_type == 'Creative Services (Design, Graphic Design)':
        # Creative field
        creative_field = submenu_selections.get('creativeField')
        if creative_field:
            if creative_field in ['Graphic design', 'Web design', 'UX/UI design']:
                additional_fields.extend(['software_used', 'file_formats', 'device_compatibility'])
            elif creative_field in ['Video production', 'Animation']:
                additional_fields.extend(['output_resolution', 'length_options', 'format_options'])
                
        # Pricing model
        if submenu_selections.get('pricingModel') == 'Project-based':
            additional_fields.extend(['project_phases', 'milestone_deliverables'])
        elif submenu_selections.get('pricingModel') == 'Retainer':
            additional_fields.extend(['monthly_deliverables', 'response_time'])
            
    # Fitness and Personal Training
    elif business_type == 'Fitness and Personal Training':
        # Service type
        if submenu_selections.get('serviceType') == 'Online training':
            additional_fields.extend(['platform_used', 'equipment_required', 'video_quality'])
            
        # Specialization
        specialization = submenu_selections.get('specialization')
        if specialization:
            if specialization in ['Weight loss', 'Strength training']:
                additional_fields.extend(['program_duration', 'nutrition_included', 'progress_tracking'])
            elif specialization in ['Rehabilitation', 'Pre/post-natal']:
                additional_fields.extend(['medical_clearance_required', 'adaptations_available'])
                
    # Software Development and IT Services
    elif business_type == 'Software Development and IT Services':
        # Development focus
        dev_focus = submenu_selections.get('developmentFocus')
        if dev_focus:
            if dev_focus in ['Mobile apps', 'Web applications']:
                additional_fields.extend(['platform_compatibility', 'responsive_design', 'backend_requirements'])
            elif dev_focus == 'SaaS products':
                additional_fields.extend(['subscription_tiers', 'api_access', 'data_storage'])
                
        # Tech stack
        tech_stack = submenu_selections.get('techStack', {})
        if tech_stack:
            additional_fields.append('technology_used')
            if tech_stack.get('infrastructure') in ['AWS', 'Azure', 'Google Cloud']:
                additional_fields.extend(['cloud_resources', 'estimated_hosting_cost'])
                
    # Add more business types as needed
                
    return additional_fields

def get_product_fields_for_business(business):
    """Get all relevant fields for a product based on business type and selections"""
    if not business or not business.business_type:
        return PRODUCT_FIELDS_MAPPING['common']
        
    # Start with common fields
    fields = PRODUCT_FIELDS_MAPPING['common'].copy()
    
    # Add business-type specific fields
    business_fields = PRODUCT_FIELDS_MAPPING.get(business.business_type, [])
    fields.extend(business_fields)
    
    # Add submenu-specific fields if selections exist
    if hasattr(business, 'business_subtype_selections') and business.business_subtype_selections:
        additional_fields = get_submenu_specific_fields(
            business.business_type, 
            business.business_subtype_selections
        )
        fields.extend(additional_fields)
        
    return fields
    
def get_service_fields_for_business(business):
    """Get all relevant fields for a service based on business type and selections"""
    if not business or not business.business_type:
        return SERVICE_FIELDS_MAPPING['common']
        
    # Start with common fields
    fields = SERVICE_FIELDS_MAPPING['common'].copy()
    
    # Add business-type specific fields
    business_fields = SERVICE_FIELDS_MAPPING.get(business.business_type, [])
    fields.extend(business_fields)
    
    # Add submenu-specific fields if selections exist
    if hasattr(business, 'business_subtype_selections') and business.business_subtype_selections:
        additional_fields = get_submenu_specific_fields(
            business.business_type, 
            business.business_subtype_selections
        )
        fields.extend(additional_fields)
        
    return fields