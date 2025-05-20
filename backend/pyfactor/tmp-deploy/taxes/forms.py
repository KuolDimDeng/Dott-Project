# taxes/forms.py
from django import forms
from .models import IncomeTaxRate, State

class IncomeTaxRateForm(forms.ModelForm):
    class Meta:
        model = IncomeTaxRate
        fields = ['state', 'tax_year', 'effective_date', 'is_flat_rate', 
                 'rate_value', 'income_min', 'income_max', 'filing_status']
                 
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['state'].queryset = State.objects.all().order_by('name')
        
        # Add custom widgets and help text
        self.fields['effective_date'].widget = forms.DateInput(attrs={'type': 'date'})
        self.fields['rate_value'].help_text = "Enter as decimal (e.g., 0.05 for 5%)"
        
        # Make certain fields conditional
        self.fields['income_min'].required = False
        self.fields['income_max'].required = False
        
    def clean(self):
        cleaned_data = super().clean()
        is_flat_rate = cleaned_data.get('is_flat_rate')
        income_min = cleaned_data.get('income_min')
        income_max = cleaned_data.get('income_max')
        
        if not is_flat_rate and income_min is None:
            self.add_error('income_min', "Income minimum is required for progressive tax rates")
            
        if income_min is not None and income_max is not None and income_min >= income_max:
            self.add_error('income_max', "Maximum income must be greater than minimum income")
            
        return cleaned_data

class BulkTaxRateUpdateForm(forms.Form):
    state = forms.ModelChoiceField(queryset=State.objects.all().order_by('name'))
    tax_year = forms.IntegerField(min_value=2000, max_value=2050)
    csv_file = forms.FileField(help_text="CSV file with tax rate data")