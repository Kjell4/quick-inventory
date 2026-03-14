from django.contrib import admin
from .models import Category, Product, Transaction, CustomUser, ClosedDay, DailySale

# Регистрация моделей в админке
admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Transaction)
admin.site.register(CustomUser)
admin.site.register(ClosedDay)
admin.site.register(DailySale)

#username: useradmin      password: 12345