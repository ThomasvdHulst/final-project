from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("register", views.register_account, name="register"),
    path("login", views.login_account, name="login"),
    path("logout", views.logout_account, name="logout"),

    path("events", views.events, name="events"),
    path("order/<str:action>", views.order_events, name="order_events"),
    path("get-event/<int:event_id>", views.get_event, name="get_event"),
    path("add-event/<str:date>", views.add_event, name="add_event"),
    path("confirm-event", views.confirm_event, name="confirm_event"),
    path("delete-event-from-day", views.delete_event_from_day, name="delete_event_from_day"),
    path("events-on-date/<str:date>", views.get_events_on_date, name="get_events_on_date"),
    path('delete-event/<int:event_id>', views.delete_event, name="delete_event")
]