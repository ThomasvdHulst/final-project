# Generated by Django 4.0.6 on 2023-02-13 12:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0007_alter_eventonday_day'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='eventonday',
            name='duration',
        ),
        migrations.AddField(
            model_name='eventonday',
            name='end_time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='eventonday',
            name='start_time',
            field=models.TimeField(blank=True, null=True),
        ),
    ]
