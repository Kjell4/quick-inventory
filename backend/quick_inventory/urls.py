from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('inventory.urls')),
    path('api/', include('inventory.api_urls')),
    path('api/v2/', include('inventory.rest_urls')),
]

