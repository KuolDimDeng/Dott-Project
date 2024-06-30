from rest_framework import viewsets
from .models import FinancialData, ChartConfiguration
from .serializers import FinancialDataSerializer, ChartConfigurationSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.db.models.functions import TruncMonth, TruncYear

class FinancialDataViewSet(viewsets.ModelViewSet):
    queryset = FinancialData.objects.all()
    serializer_class = FinancialDataSerializer

    @action(detail=False, methods=['GET'])
    def get_chart_data(self, request):
        x_axis = request.query_params.get('x_axis', 'date')
        y_axis = request.query_params.get('y_axis', 'sales')
        time_granularity = request.query_params.get('time_granularity', 'month')

        if time_granularity == 'month':
            trunc_func = TruncMonth
        elif time_granularity == 'year':
            trunc_func = TruncYear
        else:
            trunc_func = TruncMonth

        data = FinancialData.objects.annotate(
            period=trunc_func(x_axis)
        ).values('period').annotate(
            total=Sum(y_axis)
        ).order_by('period')

        return Response(data)

class ChartConfigurationViewSet(viewsets.ModelViewSet):
    queryset = ChartConfiguration.objects.all()
    serializer_class = ChartConfigurationSerializer