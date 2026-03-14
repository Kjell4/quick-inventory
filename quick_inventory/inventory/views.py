from datetime import date
from django.shortcuts import render
from .models import DailySale, Product, Transaction

from django.shortcuts import render
from .models import ClosedDay, Product, Transaction

from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from django.utils.timezone import now
from datetime import timedelta

def dashboard(request):
    # Существующие данные
    products = Product.objects.all()
    transactions = Transaction.objects.all()
    closed_days = ClosedDay.objects.all()

    # Вычисление доходов, расходов и прибыли за текущий месяц
    today = now().date()
    start_of_month = today.replace(day=1)  # Первое число текущего месяца
    end_of_month = (today.replace(day=1) + timedelta(days=31)).replace(day=1) - timedelta(days=1)  # Последний день месяца

    # Продажи за текущий месяц
    sales = DailySale.objects.filter(sale_date__range=(start_of_month, end_of_month))

    # Расчет данных
    total_income = sales.aggregate(total_income=Sum(F('quantity') * F('product__sale_price')))['total_income'] or 0
    total_expenses = sales.aggregate(total_expenses=Sum(F('quantity') * F('product__purchase_price')))['total_expenses'] or 0
    total_profit = total_income - total_expenses

    # Передача всех данных в контекст
    context = {
        'products': products,
        'transactions': transactions,
        'closed_days': closed_days,
        'total_income': total_income,
        'total_expenses': total_expenses,
        'total_profit': total_profit,
    }

    return render(request, 'inventory/dashboard.html', context)


from django.shortcuts import render
from .models import Product, Category

from django.contrib.auth.decorators import login_required
from .decorators import manager_only
@login_required
@manager_only
def product_list(request):
    category_id = request.GET.get('category')
    categories = Category.objects.all()
    
    if category_id:
        products = Product.objects.filter(category_id=category_id)
    else:
        products = Product.objects.all()
    
    return render(request, 'inventory/product_list.html', {
        'products': products,
        'categories': categories,
    })


from .forms import ProductForm

from django.shortcuts import render, redirect
from .models import Category, Product

@login_required
@manager_only
def add_product(request):
    if request.method == 'POST':
        name = request.POST['name']
        category_id = request.POST['category']
        quantity = int(request.POST['quantity'])
        purchase_price = float(request.POST['purchase_price'])
        sale_price = float(request.POST['sale_price'])
        barcode = request.POST.get('barcode', '')  # ← добавить

        category = Category.objects.get(id=category_id)
        Product.objects.create(
            name=name,
            category=category,
            quantity=quantity,
            purchase_price=purchase_price,
            sale_price=sale_price,
            barcode=barcode  # ← добавить
        )
        return redirect('dashboard')

    categories = Category.objects.all()
    return render(request, 'inventory/add_product.html', {'categories': categories})


@login_required
@manager_only
def delete_product(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    product.delete()
    return redirect('product_list')

from django.shortcuts import render, redirect, get_object_or_404
from .models import Product, Category

def edit_product(request, product_id):
    product = get_object_or_404(Product, id=product_id)

    if request.method == 'POST':
        product.name = request.POST['name']
        category_id = request.POST['category']
        product.category = Category.objects.get(id=category_id)
        product.quantity = int(request.POST['quantity'])
        product.purchase_price = float(request.POST['purchase_price'])
        product.sale_price = float(request.POST['sale_price'])
        product.barcode = request.POST.get('barcode', '')  # ← добавить эту строку
        product.save()
        return redirect('dashboard')

    categories = Category.objects.all()
    return render(request, 'inventory/edit_product.html', {'product': product, 'categories': categories})

from django.shortcuts import render
from .models import Transaction

def transaction_list(request):
    transactions = Transaction.objects.all()
    return render(request, 'inventory/transaction_list.html', {'transactions': transactions})

from django.shortcuts import render

def profile(request):
    return render(request, 'inventory/profile.html')


from django.shortcuts import render, redirect
from .models import Product, DailySale
from .forms import DailySaleForm
from django.utils.timezone import now

from django.shortcuts import render
from django.utils.timezone import now
from .models import DailySale
from django.db.models import Sum, F, ExpressionWrapper, DecimalField


def daily_sales(request):
    today = now().date()  # Текущая дата

    # Фильтруем продажи по сегодняшней дате
    sales = DailySale.objects.filter(sale_date=today)

    # Обработка формы при добавлении продажи
    if request.method == 'POST':
        form = DailySaleForm(request.POST)
        if form.is_valid():
            sale = form.save(commit=False)
            sale.sale_date = today  # Устанавливаем сегодняшнюю дату
            sale.total_price = sale.quantity * sale.product.sale_price  # Считаем общую сумму продажи
            sale.save() 

            # Обновляем количество товара в модели Product
            product = sale.product
            if product.quantity >= sale.quantity:
                product.quantity -= sale.quantity  # Уменьшаем количество товара
                product.save()  # Сохраняем изменения в базе данных
            else:
                form.add_error(None, "Недостаточно товара на складе")
                return render(request, 'inventory/daily_sales.html', {'form': form, 'sales': sales})

            return redirect('daily_sales')  # Перезагружаем страницу, чтобы увидеть обновления
    else:
        form = DailySaleForm()

    # Считаем итоговые доходы и прибыль
    total_income = sales.aggregate(total_income=Sum(F('quantity') * F('product__sale_price')))['total_income'] or 0
    total_profit = sales.aggregate(
        total_profit=Sum(
            ExpressionWrapper(
                F('quantity') * (F('product__sale_price') - F('product__purchase_price')),
                output_field=DecimalField(max_digits=10, decimal_places=2)
            )
        )
    )['total_profit'] or 0

    return render(request, 'inventory/daily_sales.html', {
        'sales': sales,
        'total_income': total_income,
        'total_profit': total_profit,
        'form': form,
        'today': today,  # Добавляем текущую дату в контекст
    })


from django.shortcuts import redirect
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from django.utils.timezone import now
from .models import DailySale, ClosedDay

def close_day(request):
    today = now().date()  # Текущая дата

    # Получаем все продажи за сегодняшний день
    sales = DailySale.objects.filter(sale_date=today)

    # Если продажи отсутствуют, выводим сообщение
    if not sales:
        print(f'Нет продаж для дня {today}')  # Выводим сообщение для отладки

    # Считаем общий доход и прибыль за день
    total_income = sales.aggregate(total=Sum(F('quantity') * F('product__sale_price')))['total'] or 0
    total_profit = sales.aggregate(
        total_profit=Sum(
            ExpressionWrapper(
                F('quantity') * (F('product__sale_price') - F('product__purchase_price')),
                output_field=DecimalField(max_digits=10, decimal_places=2)
            )
        )
    )['total_profit'] or 0

    # Создаем объект ClosedDay
    closed_day = ClosedDay.objects.create(
        date=today,
        total_income=total_income,
        total_profit=total_profit
    )

    # Обновляем продажи, добавляя связь с ClosedDay и помечаем их как закрытые
    sales.update(closed_day=closed_day, is_closed=True)

    # Обновляем количество товара в модели Product
    for sale in sales:
        product = sale.product
        product.quantity -= sale.quantity  # Уменьшаем количество товара
        product.save()

    # Перенаправляем на страницу, где отображаются закрытые дни
    return redirect('dashboard')




def closed_day_detail(request, closed_day_id):
    closed_day = get_object_or_404(ClosedDay, id=closed_day_id)

    # Получаем все продажи, связанные с этим закрытым днем
    sales = closed_day.dailysale_set.all()  # Используем обратную связь для получения связанных продаж

    # Считаем общую сумму дохода и прибыли, если продажи есть
    total_income = sales.aggregate(total=Sum(F('quantity') * F('product__sale_price')))['total'] or 0
    total_profit = sales.aggregate(
        total_profit=Sum(
            ExpressionWrapper(
                F('quantity') * (F('product__sale_price') - F('product__purchase_price')),
                output_field=DecimalField(max_digits=10, decimal_places=2)
            )
        )
    )['total_profit'] or 0

    return render(request, 'inventory/closed_day_detail.html', {
        'closed_day': closed_day,
        'sales': sales,
        'total_income': total_income,
        'total_profit': total_profit,
    })

from django.shortcuts import get_object_or_404, redirect
from .models import DailySale

def delete_sale(request, sale_id):
    # Получаем продажу по ID
    sale = get_object_or_404(DailySale, id=sale_id)
    
    # Увеличиваем количество товара в модели Product (возвращаем товар на склад)
    product = sale.product
    product.quantity += sale.quantity
    product.save()

    # Удаляем продажу
    sale.delete()

    # Перенаправляем на страницу с продажами
    return redirect('daily_sales')

from django.contrib.auth import login, authenticate
from django.shortcuts import render, redirect
from .forms import UserRegistrationForm
from django.contrib.auth.decorators import login_required

def signup(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # Авторизуем пользователя после регистрации
            return redirect('dashboard')
    else:
        form = UserRegistrationForm()
    return render(request, 'inventory/signup.html', {'form': form})

from django.contrib.auth.forms import AuthenticationForm

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            # Вход пользователя
            login(request, form.get_user())
            return redirect('dashboard')
    else:
        form = AuthenticationForm()
    
    return render(request, 'inventory/login.html', {'form': form})

def barcode_scanner_view(request):
    return render(request, 'inventory/barcode_scanner.html')