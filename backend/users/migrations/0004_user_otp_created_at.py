# Generated by Django 4.2.7 on 2025-04-08 07:42

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_notification"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="otp_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
