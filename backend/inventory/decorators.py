from django.shortcuts import render
from django.http import HttpResponseForbidden

def manager_only(view_func):
    def wrapper(request, *args, **kwargs):
        if request.user.is_authenticated and request.user.role == 'manager':
            return view_func(request, *args, **kwargs)
        return render(request, 'inventory/access_denied.html')
    return wrapper

def seller_only(view_func):
    def wrapper(request, *args, **kwargs):
        if request.user.is_authenticated and request.user.role == 'seller':
            return view_func(request, *args, **kwargs)
        return render(request, 'inventory/access_denied.html')
    return wrapper
