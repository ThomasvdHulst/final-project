from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    pass

class Event(models.Model):
    event_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="events")
    event_name = models.CharField(max_length=30)
    event_color = models.CharField(max_length=7, default='#FF0000')
    event_default_time = models.DurationField(default='1:00:00')

    def __str__(self):
        return f"Event '{self.event_name}' by {self.event_user}"

    def serialize(self):
        return {
            "id": self.id,
            "name": self.event_name,
            "color": self.event_color,
            "duration": self.event_default_time
    }

class Day(models.Model):
    day_date = models.DateField()
    day_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="days")

    def __str__(self):
        return f"{self.day_date} by {self.day_user}"

class EventOnDay(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="events_on_day")
    day = models.ForeignKey(Day, on_delete=models.CASCADE, related_name="events")
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.event.event_name} on {self.day}"
