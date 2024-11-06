from django import forms
from .models import Business

class BusinessRegistrationForm(forms.ModelForm):
    class Meta:
        model = Business
        fields = ['business_name', 'business_type', 'country', 'legal_structure', 'date_founded']
        # Update any field customizations to use business_name instead of name
        widgets = {
            'business_name': forms.TextInput(attrs={'class': 'form-control'}),
            'business_type': forms.Select(attrs={'class': 'form-control'}),
            'country': forms.Select(attrs={'class': 'form-control'}),
            'legal_structure': forms.Select(attrs={'class': 'form-control'}),
            'date_founded': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }