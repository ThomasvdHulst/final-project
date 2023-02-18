from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_duration
from .models import User, Event, Day, EventOnDay
from django.db import IntegrityError
from django.shortcuts import render
from django.urls import reverse
from datetime import datetime
from planner import views
from django import forms
import calendar
import json

#Constant colors to ensure form-manipulation is not possible
COLOR_NAMES = ['Red', 'Blue', 'Yellow', 'Green']
COLOR_CODES = ['#FFCCCB', '#ADD8E6', '#FFFFE0', '#90EE90']

#Form for creating a new event
class NewEventForm(forms.Form):
    event_name = forms.CharField(label="", max_length=30, required=True, widget=forms.TextInput(attrs={'placeholder': "e.g. Football Practice", 'class': 'form-control', 'id': 'create-event-name'}))
    
    CHOICES = [
        ('Red', 'Red'),
        ('Blue', 'Blue'),
        ('Yellow', 'Yellow'),
        ('Green', 'Green')
    ]

    event_color = forms.ChoiceField(label="", choices=CHOICES, required=True, widget=forms.Select(attrs={'class': 'form-control', 'id':'create-event-color'}))
    event_hours = forms.IntegerField(label="", required=False, widget=forms.NumberInput(attrs={'class':'form-control', 'min': '0', 'max':'23', 'id':'create-event-hours'}))
    event_minutes = forms.IntegerField(label="", required=False, widget=forms.NumberInput(attrs={'class':'form-control', 'min': '0', 'max':'60', 'id':'create-event-minutes'}))

#Main index page
def index(request):
    #If user not logged-in, send to login page
    if not request.user.is_authenticated:
        return HttpResponseRedirect(reverse("login"))

    #Get info on current date
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


#Events page
@csrf_exempt
@login_required
def events(request):
    all_events = Event.objects.filter(event_user=request.user).order_by('event_name')

    #Post request for creating new event
    if request.method == 'POST':
        form = NewEventForm(request.POST)
        if form.is_valid():
            event_name = form.cleaned_data['event_name']

            for event in all_events:
                if event.event_name.lower() == event_name.lower():
                    return render(request, 'planner/events.html', {
                        'form': form,
                        'events': all_events,
                        'colors': COLOR_NAMES,
                        'error_msg': 'This event already exists.'
                    })

            #Find corresponding color-code for selected color
            event_color = form.cleaned_data['event_color']
            event_color = event_color[0]
            new_event_color = COLOR_CODES[0]
            for i in range(len(COLOR_NAMES)):
                if event_color == COLOR_NAMES[i]:
                    new_event_color = COLOR_CODES[i]

            #Ensure duration of event is in right format
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


#View for retrieving, or editing data on a single event
@login_required
@csrf_exempt
def get_event(request, event_id):
    all_events = Event.objects.filter(event_user = request.user)

    # Try to find the given event
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(event.serialize(), safe=False)

    #For editing a event
    elif request.method == "PUT":
        data = json.loads(request.body)
        if data.get("event_name") is not None:
            new_event_name = data["event_name"]

            for every_event in all_events:
                if every_event.event_name.lower() == new_event_name.lower() and new_event_name != event.event_name:
                    return JsonResponse({
                        "error": "This event already exists."
                    }, status=201)
            event.event_name = new_event_name

        #Ensure filled in duration is valid
        if data.get("event_duration") is not None:
            time_valid = True

            new_time = data["event_duration"]

            if new_time:
                if new_time.find(':') == -1:
                    time_valid = False
                else:
                    new_time_split = new_time.split(':')

                    if len(new_time_split) <= 2:
                        time_valid = False

                    try:
                        new_time_hours = int(new_time_split[0])
                    except ValueError:
                        time_valid = False

                    try:
                        new_time_minutes = int(new_time_split[1])
                    except ValueError:
                        time_valid = False


                    if(time_valid):
                        if new_time_hours >=0 and new_time_hours <= 23 and new_time_minutes >=0 and new_time_minutes <= 60:
                            event.event_default_time = parse_duration(data["event_duration"])
                        else:
                            time_valid = False
                    else:
                        time_valid = False
            else:
                time_valid = False

            if not time_valid:
                return JsonResponse({
                    "error": "Please fill in a valid duration."
                }, status=201)

        if data.get("event_color") is not None and data["event_color"] != 'default':
            new_color = data["event_color"]
            for i in range(len(COLOR_NAMES)):
                if COLOR_NAMES[i] == new_color:
                    chosen_color = COLOR_CODES[i]
            event.event_color = chosen_color

        event.save()
        return JsonResponse({
            "message": "Event edited succesfully"
        }, status=201)

    else:
        return JsonResponse({
            "error": "GET or PUT request required."
        }, status=400)


#Get all events of a user in a given day
@login_required
def get_events_on_date(request, date):
    try:
        events = EventOnDay.objects.filter(event__event_user = request.user, day__day_date = date)
    except EventOnDay.DoesNotExist:
        return JsonResponse({"error": "No events on this day."}, status=404)

    if request.method == "GET":
        return JsonResponse([event.serialize() for event in events], safe=False)


#View for creating an event when viewing a calendar day
@csrf_exempt
@login_required
def create_event(request):
    all_events = Event.objects.filter(event_user=request.user)

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    #Retrieve data sent by the post request
    data = json.loads(request.body)

    event_name = data.get("event_name", "")
    event_color = data.get("event_color", "")
    event_hours = data.get("event_hours", "")
    event_minutes = data.get("event_minutes", "")

    for event in all_events:
        if event.event_name.lower() == event_name.lower():
            return JsonResponse({"error": "This event already exists.",}, status=201)

    new_event_color = COLOR_CODES[0]
    for i in range(len(COLOR_NAMES)):
        if event_color == COLOR_NAMES[i]:
            new_event_color = COLOR_CODES[i]

    #Ensure event duration is valid
    if event_hours:
        event_hours = int(event_hours)
        if event_hours < 10:
            event_hours = f"0{event_hours}"
    else:
        event_hours= '00'

    if event_minutes:
        event_minutes = int(event_minutes)
        if event_minutes < 10:
            event_minutes = f"0{event_minutes}"
    else:
        event_minutes= '00'

    event_duration = f"{event_hours}:{event_minutes}:00"
    event_duration = parse_duration(event_duration)

    new_event = Event(event_name=event_name, event_default_time=event_duration, event_color=new_event_color, event_user = request.user)
    new_event.save()

    return JsonResponse({"message": "Event created successfully.",
    "event_id":new_event.id,
    "event_color": new_event.event_color,
    "event_duration": new_event.event_default_time}, status=201)


#Add a given event to a day
@csrf_exempt
@login_required
def confirm_event(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    #Retrieve data from post request
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


#Delete a given event
@csrf_exempt
@login_required
def delete_event(request, event_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    #Retrieve data from post request
    data = json.loads(request.body)
    event_id = data.get("event_id", "")

    try:
        event = Event.objects.get(id=event_id)
        event.delete()
    except Event.DoesNotExist:
         return JsonResponse({"error": "Event does not exist"}, status=400)

    return JsonResponse({"message": "Event deleted successfully."}, status=201)


#Delete an event from a given day
@csrf_exempt
@login_required
def delete_event_from_day(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    #Retrieve data from post request
    data = json.loads(request.body)
    event_id = data.get("event_id", "")

    try:
        event_on_day = EventOnDay.objects.get(id=event_id)
        event_on_day.delete()
    except Event.DoesNotExist:
         return JsonResponse({"error": "Event does not exist"}, status=400)

    return JsonResponse({"message": "Event deleted from day successfully."}, status=201)


#View events on a given date
@login_required
def view_day(request, date):
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
        "all_events": all_events,
        "form": NewEventForm()
    })


#Filter all events of a user asc, on duration or on color of events
@login_required
@csrf_exempt
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

    if request.method == "GET":
        return JsonResponse([event.serialize() for event in events], safe=False)


#Register account of an user
def register_account(request):
    if request.method == "POST":
        username = request.POST["username"]

        password = request.POST["password"]
        password_check = request.POST["password_check"]
        if password != password_check:
            return render(request, "planner/register.html", {
                "error_msg": "Passwords are not the same."
            })

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


#Login an user
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


#Logout an user
def logout_account(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))