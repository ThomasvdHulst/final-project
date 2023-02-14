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
    path("confirm-event", views.confirm_event, name="confirm_event")
]