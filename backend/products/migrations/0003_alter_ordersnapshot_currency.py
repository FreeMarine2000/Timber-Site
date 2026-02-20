from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0002_order_snapshot"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ordersnapshot",
            name="currency",
            field=models.CharField(
                choices=[("USD", "USD"), ("INR", "INR")],
                default="USD",
                max_length=3,
            ),
        ),
    ]
