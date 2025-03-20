from django import forms
from django_countries.fields import CountryField
from .models import Business, BusinessDetails
from users.choices import BUSINESS_TYPES, LEGAL_STRUCTURE_CHOICES

class BusinessRegistrationForm(forms.ModelForm):
    class Meta:
        model = Business
        fields = ['name', 'business_num']  # Only include fields that exist in the DB
        
    # Add any additional fields manually
    business_type = forms.ChoiceField(choices=BUSINESS_TYPES)
    legal_structure = forms.ChoiceField(choices=LEGAL_STRUCTURE_CHOICES)
    date_founded = forms.DateField(required=False)
    country = CountryField().formfield()
    
    def save(self, commit=True):
        business = super().save(commit=commit)
        if commit:
            # Create or update BusinessDetails
            details, created = BusinessDetails.objects.get_or_create(business=business)
            details.business_type = self.cleaned_data['business_type']
            details.legal_structure = self.cleaned_data['legal_structure']
            details.date_founded = self.cleaned_data['date_founded']
            details.country = self.cleaned_data['country']
            details.save()
        return business