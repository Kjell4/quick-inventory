"""
Миграция: добавляет поле barcode в модель Product
================================================
Запусти: python manage.py migrate inventory
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    # Укажи последнюю миграцию своего проекта!
    # Судя по файлам в архиве, последняя это 0014_dailysale_closed_day
    dependencies = [
        ('inventory', '0014_dailysale_closed_day'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='barcode',
            field=models.CharField(
                max_length=100,
                blank=True,
                null=True,
                unique=True,
                verbose_name='Баркод',
                help_text='Штрих-код или QR-код товара'
            ),
        ),
    ]
