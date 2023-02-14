from django.contrib import admin
from .models import User, Event, Day, EventOnDay

admin.site.register(User)
admin.site.register(Event)
admin.site.register(Day)
admin.site.register(EventOnDay)
