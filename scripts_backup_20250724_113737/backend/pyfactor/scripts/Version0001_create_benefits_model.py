#!/usr/bin/env python
"""
Script: Version0001_create_benefits_model.py
Description: Adds a Benefits model to hr/models.py and links it with the Employee model
Author: AI Assistant
Version: 1.0
Date: 2023-11-15
"""

import os
import sys
import shutil
import datetime
import re
from pathlib import Path

# Add the parent directory to sys.path to import Django settings
sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Create a backup of the models.py file
def backup_file(file_path):
    """Creates a backup of the specified file with timestamp."""
    backup_dir = os.path.join(os.path.dirname(file_path), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    backup_path = os.path.join(backup_dir, f"models_{timestamp}.py.bak")
    
    shutil.copy2(file_path, backup_path)
    print(f"Backup created at: {backup_path}")
    return backup_path

# Add the Benefits model to models.py
def add_benefits_model(file_path):
    """Adds the Benefits model to the hr/models.py file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Define the Benefits model code to be added
    benefits_model_code = """
class Benefits(models.Model):
    \"\"\"Employee benefits model\"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField('Employee', on_delete=models.CASCADE, related_name='benefits')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Health Insurance
    HEALTH_PLAN_CHOICES = [
        ('NONE', 'No Coverage'),
        ('BASIC', 'Basic Coverage'),
        ('STANDARD', 'Standard Coverage'),
        ('PREMIUM', 'Premium Coverage'),
        ('FAMILY', 'Family Coverage'),
    ]
    health_insurance_plan = models.CharField(max_length=20, choices=HEALTH_PLAN_CHOICES, default='NONE')
    health_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    health_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    health_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Dental Insurance
    DENTAL_PLAN_CHOICES = [
        ('NONE', 'No Coverage'),
        ('BASIC', 'Basic Coverage'),
        ('STANDARD', 'Standard Coverage'),
        ('PREMIUM', 'Premium Coverage'),
        ('FAMILY', 'Family Coverage'),
    ]
    dental_insurance_plan = models.CharField(max_length=20, choices=DENTAL_PLAN_CHOICES, default='NONE')
    dental_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    dental_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    dental_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Vision Insurance
    VISION_PLAN_CHOICES = [
        ('NONE', 'No Coverage'),
        ('BASIC', 'Basic Coverage'),
        ('STANDARD', 'Standard Coverage'),
        ('PREMIUM', 'Premium Coverage'),
        ('FAMILY', 'Family Coverage'),
    ]
    vision_insurance_plan = models.CharField(max_length=20, choices=VISION_PLAN_CHOICES, default='NONE')
    vision_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    vision_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    vision_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Retirement Plan
    RETIREMENT_PLAN_CHOICES = [
        ('NONE', 'None'),
        ('401K', '401(k)'),
        ('ROTH_401K', 'Roth 401(k)'),
        ('IRA', 'Individual Retirement Account'),
        ('ROTH_IRA', 'Roth IRA'),
        ('PENSION', 'Pension Plan'),
        ('OTHER', 'Other Retirement Plan'),
    ]
    retirement_plan = models.CharField(max_length=20, choices=RETIREMENT_PLAN_CHOICES, default='NONE')
    retirement_contribution_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        default=0
    )
    employer_match_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        default=0
    )
    
    # Life Insurance
    has_life_insurance = models.BooleanField(default=False)
    life_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    life_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    life_insurance_coverage_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    life_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Disability Insurance
    has_disability_insurance = models.BooleanField(default=False)
    disability_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    disability_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    disability_insurance_coverage_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    disability_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Flexible Spending Account (FSA)
    has_fsa = models.BooleanField(default=False)
    fsa_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Health Savings Account (HSA)
    has_hsa = models.BooleanField(default=False)
    hsa_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employer_hsa_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Additional Benefits
    additional_benefits = models.JSONField(default=dict, blank=True)
    
    # Enrollment Status
    is_enrolled = models.BooleanField(default=False)
    enrollment_date = models.DateField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    # Open Enrollment
    next_enrollment_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if hasattr(self, 'employee') and self.employee:
            return f"Benefits for {self.employee.first_name} {self.employee.last_name}"
        return f"Benefits (ID: {self.id})"

    class Meta:
        verbose_name = "Benefits"
        verbose_name_plural = "Benefits"
"""

    # Find a suitable spot to add the Benefits model (after TimeOffBalance but before PerformanceReview)
    pattern = r'class TimeOffBalance\(models\.Model\):.*?class Meta:.*?unique_together = \(\'employee\', \'year\'\)'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        insert_index = match.end()
        updated_content = content[:insert_index] + "\n\n" + benefits_model_code + content[insert_index:]
        
        # Write the updated content back to the file
        with open(file_path, 'w') as f:
            f.write(updated_content)
        print("Benefits model added successfully!")
        return True
    else:
        print("Could not find the right location to add the Benefits model.")
        return False

def main():
    # Path to the hr/models.py file
    models_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'hr', 'models.py')
    
    # Check if file exists
    if not os.path.isfile(models_path):
        print(f"Error: File {models_path} does not exist!")
        sys.exit(1)
    
    # Create a backup of the file
    backup_path = backup_file(models_path)
    
    # Add the Benefits model to the file
    success = add_benefits_model(models_path)
    
    if success:
        print("""
Benefits model has been successfully added to hr/models.py.
Next steps:
1. Run 'python manage.py makemigrations hr' to create the migration
2. Run 'python manage.py migrate hr' to apply the migration
""")
    else:
        print(f"Failed to add Benefits model. The original file has been restored from backup at {backup_path}.")
        shutil.copy2(backup_path, models_path)

if __name__ == "__main__":
    main() 