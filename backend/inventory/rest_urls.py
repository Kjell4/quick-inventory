from django.urls import path
from . import rest_api

urlpatterns = [
    # Auth
    path('auth/login/',   rest_api.auth_login,   name='rest_login'),
    path('auth/signup/',  rest_api.auth_signup,  name='rest_signup'),
    path('auth/refresh/', rest_api.auth_refresh, name='rest_refresh'),
    path('auth/me/',      rest_api.auth_me,      name='rest_me'),

    # Products
    path('products/',          rest_api.products_list,  name='rest_products'),
    path('products/<int:product_id>/', rest_api.product_detail, name='rest_product_detail'),

    # Sales
    path('sales/',             rest_api.sales_list,    name='rest_sales'),
    path('sales/today/',       rest_api.sales_today,   name='rest_sales_today'),
    path('sales/<int:sale_id>/delete/', rest_api.sale_delete, name='rest_sale_delete'),
    path('sales/close-day/',   rest_api.close_day,     name='rest_close_day'),

    # Dashboard
    path('dashboard/',         rest_api.dashboard_stats, name='rest_dashboard'),

    # Categories
    path('categories/',        rest_api.categories_list, name='rest_categories'),

    # Receipts (closed days)
    path('receipts/',                      rest_api.receipts_list,   name='rest_receipts'),
    path('receipts/<int:receipt_id>/',     rest_api.receipt_detail,  name='rest_receipt_detail'),
]
