from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta

from .models import (
    Equipment, Driver, Route, Load, 
    Expense, Maintenance, Compliance
)
from .serializers import (
    EquipmentSerializer, EquipmentDetailSerializer,
    DriverSerializer, DriverDetailSerializer,
    RouteSerializer, RouteDetailSerializer,
    LoadSerializer, LoadDetailSerializer,
    ExpenseSerializer,
    MaintenanceSerializer,
    ComplianceSerializer
)

class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['equipment_type', 'status', 'year']
    search_fields = ['name', 'make', 'model', 'vin', 'license_plate']
    ordering_fields = ['name', 'equipment_type', 'year', 'purchase_date', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EquipmentDetailSerializer
        return EquipmentSerializer
    
    @action(detail=True, methods=['get'])
    def maintenance_records(self, request, pk=None):
        equipment = self.get_object()
        maintenance_records = Maintenance.objects.filter(equipment=equipment)
        serializer = MaintenanceSerializer(maintenance_records, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def compliance_records(self, request, pk=None):
        equipment = self.get_object()
        compliance_records = Compliance.objects.filter(equipment=equipment)
        serializer = ComplianceSerializer(compliance_records, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def expenses(self, request, pk=None):
        equipment = self.get_object()
        expenses = Expense.objects.filter(equipment=equipment)
        serializer = ExpenseSerializer(expenses, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def loads(self, request, pk=None):
        equipment = self.get_object()
        loads = Load.objects.filter(equipment=equipment)
        serializer = LoadSerializer(loads, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_equipment = Equipment.objects.count()
        equipment_by_type = Equipment.objects.values('equipment_type').annotate(count=Count('id'))
        equipment_by_status = Equipment.objects.values('status').annotate(count=Count('id'))
        
        # Equipment requiring maintenance soon
        maintenance_due = Equipment.objects.filter(
            maintenance_records__next_maintenance_date__lte=timezone.now() + timedelta(days=30)
        ).distinct().count()
        
        # Equipment with expiring compliance documents
        compliance_expiring = Equipment.objects.filter(
            compliance_records__expiration_date__lte=timezone.now() + timedelta(days=30)
        ).distinct().count()
        
        return Response({
            'total_equipment': total_equipment,
            'equipment_by_type': equipment_by_type,
            'equipment_by_status': equipment_by_status,
            'maintenance_due': maintenance_due,
            'compliance_expiring': compliance_expiring
        })

class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'license_state']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'license_number']
    ordering_fields = ['first_name', 'last_name', 'license_expiration', 'hire_date', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DriverDetailSerializer
        return DriverSerializer
    
    @action(detail=True, methods=['get'])
    def compliance_records(self, request, pk=None):
        driver = self.get_object()
        compliance_records = Compliance.objects.filter(driver=driver)
        serializer = ComplianceSerializer(compliance_records, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def loads(self, request, pk=None):
        driver = self.get_object()
        loads = Load.objects.filter(driver=driver)
        serializer = LoadSerializer(loads, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_drivers = Driver.objects.count()
        drivers_by_status = Driver.objects.values('status').annotate(count=Count('id'))
        
        # Drivers with expiring licenses
        licenses_expiring = Driver.objects.filter(
            license_expiration__lte=timezone.now() + timedelta(days=30)
        ).count()
        
        # Drivers with expiring compliance documents
        compliance_expiring = Driver.objects.filter(
            compliance_records__expiration_date__lte=timezone.now() + timedelta(days=30)
        ).distinct().count()
        
        return Response({
            'total_drivers': total_drivers,
            'drivers_by_status': drivers_by_status,
            'licenses_expiring': licenses_expiring,
            'compliance_expiring': compliance_expiring
        })

class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'start_location', 'end_location']
    ordering_fields = ['name', 'distance', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RouteDetailSerializer
        return RouteSerializer
    
    @action(detail=True, methods=['get'])
    def loads(self, request, pk=None):
        route = self.get_object()
        loads = Load.objects.filter(route=route)
        serializer = LoadSerializer(loads, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_routes = Route.objects.count()
        avg_distance = Route.objects.aggregate(avg_distance=Avg('distance'))['avg_distance'] or 0
        
        # Most used routes
        most_used_routes = Route.objects.annotate(
            load_count=Count('loads')
        ).order_by('-load_count')[:5]
        
        most_used_data = [{
            'id': route.id,
            'name': route.name,
            'start_location': route.start_location,
            'end_location': route.end_location,
            'load_count': route.load_count
        } for route in most_used_routes]
        
        return Response({
            'total_routes': total_routes,
            'avg_distance': avg_distance,
            'most_used_routes': most_used_data
        })

class LoadViewSet(viewsets.ModelViewSet):
    queryset = Load.objects.all()
    serializer_class = LoadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'driver', 'equipment']
    search_fields = ['reference_number', 'pickup_location', 'delivery_location', 'cargo_description']
    ordering_fields = ['pickup_date', 'delivery_date', 'created_at', 'status']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LoadDetailSerializer
        return LoadSerializer
    
    @action(detail=True, methods=['get'])
    def expenses(self, request, pk=None):
        load = self.get_object()
        expenses = Expense.objects.filter(load=load)
        serializer = ExpenseSerializer(expenses, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_loads = Load.objects.count()
        loads_by_status = Load.objects.values('status').annotate(count=Count('id'))
        
        # Upcoming pickups
        upcoming_pickups = Load.objects.filter(
            pickup_date__gte=timezone.now(),
            pickup_date__lte=timezone.now() + timedelta(days=7),
            status__in=['pending', 'assigned']
        ).count()
        
        # Upcoming deliveries
        upcoming_deliveries = Load.objects.filter(
            delivery_date__gte=timezone.now(),
            delivery_date__lte=timezone.now() + timedelta(days=7),
            status='in_transit'
        ).count()
        
        # Total revenue
        total_revenue = Load.objects.aggregate(total=Sum('rate'))['total'] or 0
        
        return Response({
            'total_loads': total_loads,
            'loads_by_status': loads_by_status,
            'upcoming_pickups': upcoming_pickups,
            'upcoming_deliveries': upcoming_deliveries,
            'total_revenue': total_revenue
        })

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['expense_type', 'load', 'equipment', 'created_by']
    search_fields = ['description', 'load__reference_number', 'equipment__name']
    ordering_fields = ['date', 'amount', 'created_at']
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0
        expenses_by_type = Expense.objects.values('expense_type').annotate(
            count=Count('id'),
            total=Sum('amount')
        )
        
        # Expenses by month (last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        expenses_by_month = Expense.objects.filter(
            date__gte=six_months_ago
        ).extra(
            select={'month': "to_char(date, 'YYYY-MM')"}
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        return Response({
            'total_expenses': total_expenses,
            'expenses_by_type': expenses_by_type,
            'expenses_by_month': expenses_by_month
        })

class MaintenanceViewSet(viewsets.ModelViewSet):
    queryset = Maintenance.objects.all()
    serializer_class = MaintenanceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['maintenance_type', 'equipment']
    search_fields = ['description', 'performed_by', 'equipment__name']
    ordering_fields = ['date_performed', 'next_maintenance_date', 'cost', 'created_at']
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        upcoming_maintenance = Maintenance.objects.filter(
            next_maintenance_date__gte=timezone.now(),
            next_maintenance_date__lte=timezone.now() + timedelta(days=30)
        ).order_by('next_maintenance_date')
        
        serializer = self.get_serializer(upcoming_maintenance, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_maintenance_cost = Maintenance.objects.aggregate(total=Sum('cost'))['total'] or 0
        maintenance_by_type = Maintenance.objects.values('maintenance_type').annotate(
            count=Count('id'),
            total_cost=Sum('cost')
        )
        
        # Upcoming maintenance
        upcoming_count = Maintenance.objects.filter(
            next_maintenance_date__gte=timezone.now(),
            next_maintenance_date__lte=timezone.now() + timedelta(days=30)
        ).count()
        
        # Overdue maintenance
        overdue_count = Maintenance.objects.filter(
            next_maintenance_date__lt=timezone.now()
        ).count()
        
        return Response({
            'total_maintenance_cost': total_maintenance_cost,
            'maintenance_by_type': maintenance_by_type,
            'upcoming_count': upcoming_count,
            'overdue_count': overdue_count
        })

class ComplianceViewSet(viewsets.ModelViewSet):
    queryset = Compliance.objects.all()
    serializer_class = ComplianceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['document_type', 'equipment', 'driver']
    search_fields = ['document_number', 'issuing_authority', 'equipment__name', 'driver__first_name', 'driver__last_name']
    ordering_fields = ['issue_date', 'expiration_date', 'created_at']
    
    @action(detail=False, methods=['get'])
    def expiring(self, request):
        expiring_docs = Compliance.objects.filter(
            expiration_date__gte=timezone.now(),
            expiration_date__lte=timezone.now() + timedelta(days=30)
        ).order_by('expiration_date')
        
        serializer = self.get_serializer(expiring_docs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        expired_docs = Compliance.objects.filter(
            expiration_date__lt=timezone.now()
        ).order_by('expiration_date')
        
        serializer = self.get_serializer(expired_docs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_documents = Compliance.objects.count()
        docs_by_type = Compliance.objects.values('document_type').annotate(count=Count('id'))
        
        # Expiring soon
        expiring_soon = Compliance.objects.filter(
            expiration_date__gte=timezone.now(),
            expiration_date__lte=timezone.now() + timedelta(days=30)
        ).count()
        
        # Already expired
        expired = Compliance.objects.filter(
            expiration_date__lt=timezone.now()
        ).count()
        
        return Response({
            'total_documents': total_documents,
            'docs_by_type': docs_by_type,
            'expiring_soon': expiring_soon,
            'expired': expired
        })
