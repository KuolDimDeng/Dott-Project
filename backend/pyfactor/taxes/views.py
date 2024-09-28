from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from .tax_data_manager import update_tax_data, get_federal_tax_data, get_state_tax_data, get_fred_data

def update_tax_info(request):
    update_tax_data()
    return JsonResponse({"message": "Tax data updated successfully"})

def get_federal_taxes(request):
    data = get_federal_tax_data()
    return JsonResponse(data)

def get_state_taxes(request, state):
    data = get_state_tax_data(state)
    return JsonResponse(data)

def get_economic_data(request, series_id):
    data = get_fred_data(series_id)
    return JsonResponse(data)