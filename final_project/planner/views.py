from django.shortcuts import render
from .models import User, Event, Day, EventOnDay
from django.db import IntegrityError
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django import forms
from django.utils.dateparse import parse_duration
from datetime import datetime
import calendar
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import json


#Constant colors to ensure form-manipulation is not possible
COLOR_NAMES = ['Red', 'Blue', 'Yellow', 'Green']
COLOR_CODES = ['#FFCCCB', '#ADD8E6', '#FFFFE0', '#90EE90']

class NewEventForm(forms.Form):
    event_name = forms.CharField(label="", max_length=30, required=True, widget=forms.TextInput(attrs={'placeholder': "e.g. Football Practice", 'class': 'form-control'}))
    
    CHOICES = [
        ('Red', 'Red'),
        ('Blue', 'Blue'),
        ('Yellow', 'Yellow'),
        ('Green', 'Green')
    ]

    event_color = forms.MultipleChoiceField(label="", choices=CHOICES, required=True, widget=forms.CheckboxSelectMultiple(attrs={'class': 'form-check-inline checkbox'}))
    event_hours = forms.IntegerField(label="", required=False, widget=forms.NumberInput(attrs={'class':'form-control', 'min': '0'}))
    event_minutes = forms.IntegerField(label="", required=False, widget=forms.NumberInput(attrs={'class':'form-control', 'min': '0', 'max':'60'}))

def index(request):
    current_day = datetime.now().day
    current_month_number = datetime.now().month
    current_month = calendar.month_name[current_month_number]
    current_year = datetime.now().year

    day_info = calendar.monthrange(current_year, current_month_number)
    day_amount = day_info[1]
    day_start = day_info[0]

    if current_month_number == 0:
        prev_month_day_info = calendar.monthrange(current_year - 1, 12)
    else:
        prev_month_day_info = calendar.monthrange(current_year, current_month_number - 1)
    prev_month_amount_days = prev_month_day_info[1]

    prev_month_days = []
    for i in range(day_start):
        prev_month_days.append(prev_month_amount_days - day_start + i + 1)


    if current_month_number < 10:
        current_month_number = f'0{current_month_number}'

    
    events_on_days = EventOnDay.objects.filter(event__event_user = request.user, day__day_date__contains = f'{current_year}-{current_month_number}')

    return render(request, "planner/index.html", {
        'current_month': current_month,
        'current_month_number':current_month_number,
        'current_day': current_day,
        'current_year': current_year,
        'day_amount': day_amount,
        'day_start': day_start,
        'prev_month_days': prev_month_days,
        'events_on_days': events_on_days,
    })


def events(request):
    all_events = Event.objects.filter(event_user=request.user).order_by('event_name')

    if request.method == 'POST':
        form = NewEventForm(request.POST)
        if form.is_valid():
            event_name = form.cleaned_data['event_name']
            event_color = form.cleaned_data['event_color']
            event_color = event_color[0]
            new_event_color = COLOR_CODES[0]
            for i in range(len(COLOR_NAMES)):
                if event_color == COLOR_NAMES[i]:
                    new_event_color = COLOR_CODES[i]

            event_hours = form.cleaned_data['event_hours']
            if event_hours:
                if event_hours < 10:
                    event_hours = f"0{event_hours}"
            else:
                event_hours= '00'

            event_minutes = form.cleaned_data['event_minutes']
            if event_minutes:
                if event_minutes < 10:
                    event_minutes = f"0{event_minutes}"
            else:
                event_minutes= '00'

            event_duration = f"{event_hours}:{event_minutes}:00"
            event_duration = parse_duration(event_duration)

            new_event = Event(event_name=event_name, event_default_time=event_duration, event_color=new_event_color, event_user = request.user)
            new_event.save()

            all_events = Event.objects.filter(event_user=request.user).order_by('event_name')
        else:
            return render(request, 'planner/events.html', {
                'form': form,
                'events': all_events,
                'colors': COLOR_NAMES
            })

    return render(request, 'planner/events.html', {
        'form': NewEventForm(),
        'events': all_events,
        'colors': COLOR_NAMES
    })

@csrf_exempt
def get_event(request, event_id):
    # Try to find the given event
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(event.serialize(), safe=False)

    elif request.method == "PUT":
        data = json.loads(request.body)
        if data.get("event_name") is not None:
            event.event_name = data["event_name"]
        if data.get("event_duration") is not None:
            event.event_default_time = parse_duration(data["event_duration"])
        if data.get("event_color") is not None and data["event_color"] != 'default':
            new_color = data["event_color"]
            for i in range(len(COLOR_NAMES)):
                if COLOR_NAMES[i] == new_color:
                    chosen_color = COLOR_CODES[i]
            event.event_color = chosen_color
        event.save()
        return HttpResponse(status=204)

    else:
        return JsonResponse({
            "error": "GET or PUT request required."
        }, status=400)


def get_events_on_date(request, date):
    try:
        events = EventOnDay.objects.filter(event__event_user = request.user, day__day_date = date)
    except EventOnDay.DoesNotExist:
        return JsonResponse({"error": "No events on this day."}, status=404)

    if request.method == "GET":
        return JsonResponse([event.serialize() for event in events], safe=False)

@csrf_exempt
@login_required
def confirm_event(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body)

    event_id = data.get("event_id", "")
    day_id = data.get("day_id", "")
    starting_time = data.get("starting_time", "")
    ending_time = data.get("ending_time", "")

    try:
        day = Day.objects.get(id=day_id)
    except Day.DoesNotExist:
        return JsonResponse({"error": "Day does not exist"}, status=400)

    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
         return JsonResponse({"error": "Event does not exist"}, status=400)

    event_on_day = EventOnDay(event=event, day=day, start_time=starting_time, end_time=ending_time)
    event_on_day.save()

    return JsonResponse({"message": "Event added to day successfully.",
    "event_id":event.id}, status=201)

@csrf_exempt
@login_required
def delete_event(request, event_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body)

    event_id = data.get("event_id", "")

    try:
        event = Event.objects.get(id=event_id)
        event.delete()
    except Event.DoesNotExist:
         return JsonResponse({"error": "Event does not exist"}, status=400)

    return JsonResponse({"message": "Event deleted successfully."}, status=201)

@csrf_exempt
@login_required
def delete_event_from_day(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body)

    event_id = data.get("event_id", "")

    try:
        event_on_day = EventOnDay.objects.get(id=event_id)
        event_on_day.delete()
    except Event.DoesNotExist:
         return JsonResponse({"error": "Event does not exist"}, status=400)

    return JsonResponse({"message": "Event deleted from day successfully."}, status=201)

def add_event(request, date):
    try:
        day = Day.objects.get(day_date = date)
    except Day.DoesNotExist:
        day = Day(day_date = date, day_user = request.user)
        day.save()

    events_on_day = EventOnDay.objects.filter(day=day)
    all_events = Event.objects.filter(event_user=request.user).order_by('event_name')

    return render(request, 'planner/add_events.html', {
        'day':day,
        "events_on_day":events_on_day,
        "all_events": all_events
    })

def order_events(request, action):
    # Try to find the given events
    try:
        if action == 'asc':
            events = Event.objects.filter(event_user = request.user).order_by('event_name')
        elif action == 'color':
            events = Event.objects.filter(event_user = request.user).order_by('event_color')
        elif action == 'duration':
            events = Event.objects.filter(event_user = request.user).order_by('event_default_time')
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found."}, status=404)

    # Give posts' content
    if request.method == "GET":
        return JsonResponse([event.serialize() for event in events], safe=False)

def register_account(request):
    if request.method == "POST":
        username = request.POST["username"]

        password = request.POST["password"]
        password_check = request.POST["password_check"]
        if password != password_check:
            return render(request, "planner/register.html", {
                "error_msg": "Passwords are not the same."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username=username, password=password)
            user.save()
        except IntegrityError:
            return render(request, "planner/register.html", {
                "error_msg": "This user already exists."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "planner/register.html")

def login_account(request):
    if request.method == "POST":

        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "planner/login.html", {
                "error_msg": "Username and/or password do not match."
            })
    else:
        return render(request, "planner/login.html")

def logout_account(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))