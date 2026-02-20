from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0003_alter_ordersnapshot_currency"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExchangeRateCache",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("pair", models.CharField(default="USD_INR", max_length=16, unique=True)),
                ("rate", models.DecimalField(decimal_places=6, max_digits=12)),
                ("fetched_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
