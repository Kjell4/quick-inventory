from django.urls import path
from . import api_views

urlpatterns = [
    path('ping/',         api_views.ping,         name='api_ping'),
    path('scans/',        api_views.scans_endpoint, name='api_scans'),
    path('scans/sell/',   api_views.scans_sell,   name='api_scans_sell'),
    path('scans/create/', api_views.scans_create, name='api_scans_create'),
    path('barcode/lookup/', api_views.barcode_lookup, name='api_barcode_lookup'),
]