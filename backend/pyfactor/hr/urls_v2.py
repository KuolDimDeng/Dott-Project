from django.urls import path
from . import api_v2

# Employee Management v2 URL patterns
urlpatterns = [
    # Employee endpoints
    path('employees/', api_v2.employee_list_v2, name='employee-list-v2'),
    path('employees/<uuid:employee_id>/', api_v2.employee_detail_v2, name='employee-detail-v2'),
    path('employees/stats/', api_v2.employee_stats_v2, name='employee-stats-v2'),
]