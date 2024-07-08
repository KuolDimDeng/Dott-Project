from django import forms
from .models import Business

class BusinessRegistrationForm(forms.ModelForm):
    class Meta:
        model = Business
        fields = ['name', 'business_type', 'address', 'phone_number', 'email']  # Add or remove fields as needed