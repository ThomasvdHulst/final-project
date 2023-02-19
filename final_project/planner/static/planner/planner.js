
document.addEventListener('DOMContentLoaded', () => {
    //Redirect user to the right function based on url
    const URL = window.location.pathname.split('/')[1];
    if(URL === ''){
        mainpage();
    }else if(URL === 'events'){
        eventspage();
    }else if(URL === 'view-day'){
        daypage();
    }
})

//Function for page on a given date
function daypage(){
    //Function to add a given event to a day
    function add_event_to_day(input_event_id){
        //Set a limit on the maximum amount of events on a single day
        if(parseInt(document.querySelector('#amount-events').innerHTML) >= 6){
            document.querySelector('#event_err').style.display = 'block';
        }else{ 
            fetch(`/get-event/${parseInt(input_event_id)}`)
            .then(response => response.json())
            .then(event => {
                //Let an user set the times for an event to take place
                document.querySelector('#confirm-event').innerHTML = `<h3>Are you sure you want to add '${event.name}'?</h3><br>
                <button id='yes-event' style='width:120px' class='btn btn-primary'>Yes</button>
                <br><br><button id='no-event' style='width:120px' class='btn btn-primary'>No</button>`;
    
                document.querySelector('#confirm-event').style.display = 'block';
    
                document.querySelector('#no-event').onclick = () => {
                    document.querySelector('#confirm-event').style.display = 'none';
                }
    
                document.querySelector('#yes-event').onclick = () => {
                    document.querySelector('#starting-time').value = '';
                    document.querySelector('#ending-time').value = '';
    
                    document.querySelector('#confirm-event').style.display = 'none';
                    document.querySelector('#set-times').style.display = 'block';
                    document.querySelector('#cancel-times').onclick = () => {
                        document.querySelector('#set-times').style.display = 'none';
                    }
    
                    document.querySelector('#starting-time').onchange = () => {
                        //When the start time is set, automatically fill the end time with the duration of the event
                        const current_starting_value = document.querySelector('#starting-time').value;
                        const current_hour = parseInt(current_starting_value.substring(0,2));
                        const current_minute = parseInt(current_starting_value.substring(3,5));
                        const duration_hour = parseInt(event.duration.substring(4,6));
                        const duration_minute = parseInt(event.duration.substring(7,9));
    
                        let filler_ending_hour = current_hour + duration_hour;
                        if(filler_ending_hour >= 24){
                            filler_ending_hour -= 24;
                        }
    
                        let filler_ending_minute = current_minute + duration_minute;
                        if(filler_ending_minute >= 60){
                            if(filler_ending_hour == 23){
                                filler_ending_hour = 00;
                            }else{
                                filler_ending_hour++;
                            }  
                            filler_ending_minute -= 60;
                        }
    
                        if(filler_ending_hour < 10){
                            filler_ending_hour = `0${filler_ending_hour}`;
                        }
                        if(filler_ending_minute < 10){
                            filler_ending_minute = `0${filler_ending_minute}`;
                        }
    
                        const filler_ending_time = `${filler_ending_hour}:${filler_ending_minute}`; 
                        document.querySelector('#ending-time').value = filler_ending_time;
                    }
    
                    //When times are set, send a post request to add the event to the day
                    document.querySelector('#set-times-form').onsubmit = () => {
                        let starting_time = document.querySelector('#starting-time').value;
                        let ending_time = document.querySelector('#ending-time').value;
                        let added_event_id;
    
                        fetch('/confirm-event', {
                            method: 'POST',
                            body: JSON.stringify({
                                event_id: input_event_id,
                                day_id: parseInt(document.querySelector('#day_id').innerHTML),
                                ending_time: ending_time,
                                starting_time: starting_time
                            })
                          })
                          .then(response => response.json())
                          .then(result => {
                            //If all data is valid, visually add the event to the day
                            added_event_id = result["event_id"];
    
                            document.querySelector('#set-times').style.display = 'none';
        
                            let new_event = document.createElement('div');
                            new_event.className = 'calendar-object';
                            new_event.style.backgroundColor = event.color;
                            new_event.id = `event-container-${added_event_id}`;
                            new_event.dataset.start_time = starting_time;
            
                            new_event.innerHTML = `<h5 data-event='${added_event_id}' class='delete-event' style='float:right;margin-right:10px'>x</h5><p class='times'>${starting_time} - ${ending_time}</p><p class='event-name'>${event.name}</p>`;
            
                            document.querySelector('#calendar').append(new_event);
                            
                            document.querySelector('#amount-events').innerHTML = parseInt(document.querySelector('#amount-events').innerHTML) + 1;
                            order_events();
                            daypage();
                          });
                          
                        return false
                    }
                }
            });  
        }
    }


    //Ensure that all events are draggable to be dragged in the calendar
    document.querySelectorAll('.draggable').forEach((calendar_event) => {
        calendar_event.draggable = 'true';
        calendar_event.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData("text", e.target.id);
        })
    })


    //Ensure that an event can be dragged to the calendar
    document.querySelector('#calendar').addEventListener('dragover', (e) => {
        e.preventDefault();
    })


    //When event is dropped in the calendar, add the event to the day with add_event_to_day function
    document.querySelector('#calendar').addEventListener('drop', (e) => {
        e.preventDefault();
        let data = e.dataTransfer.getData('text');
        add_event_to_day(data);
    })


    //Create the possibility to delete an event from a given day
    document.querySelectorAll('.delete-event').forEach((delete_btn) => {
        delete_btn.onclick = () => {
            event_id = parseInt(delete_btn.dataset.event);
            fetch('/delete-event-from-day', {
                method: 'POST',
                body: JSON.stringify({
                    event_id: event_id
                })
              })

            document.querySelector(`#event-container-${event_id}`).style.display = 'none';

            document.querySelector('#event_err').style.display = 'none';

            document.querySelector('#amount-events').innerHTML = parseInt(document.querySelector('#amount-events').innerHTML) - 1;
            daypage();
        }
    })


    //Create the possiblity to quickly create an event when viewing a day, without going to the events page
    document.querySelector('#create-event-btn').onclick = () => {
        document.querySelector('#create-event-popup').style.display = 'block';

        document.querySelector('#cancel-create-event').onclick = () => {
            document.querySelector('#create-event-popup').style.display = 'none';
        }

        //When form is submitted, send post request to add event as an event
        document.querySelector('#create-event-form').onsubmit = () => {
            fetch('/create-event', {
                method: 'POST',
                body: JSON.stringify({
                    event_name: document.querySelector('#create-event-name').value,
                    event_color: document.querySelector('#create-event-color').value,
                    event_hours: document.querySelector('#create-event-hours').value,
                    event_minutes: document.querySelector('#create-event-minutes').value,
                })
              })
              .then(response => response.json())
              .then(result => {
                if(result["error"]){
                    document.querySelector('#existing_event_err').innerHTML = result['error'];
                }else{
                    //Visually add the event to the selectable events list
                    const created_event_id = result["event_id"];
                    document.querySelector('#create-event-popup').style.display = 'none';
    
                    const created_event_duration = result["event_duration"];
                    const created_event_duration_hour = parseInt(created_event_duration.substring(4,6));
                    const created_event_duration_minute = parseInt(created_event_duration.substring(7,9));
    
                    const created_event_div = document.createElement('div');
                    created_event_div.className = 'event draggable';
                    created_event_div.id = created_event_id;
                    created_event_div.style.backgroundColor = result["event_color"];
                    created_event_div.style.border = `1px solid ${result["event_color"]}`;
                    created_event_div.innerHTML = `<h4>${document.querySelector('#create-event-name').value}</h4><p>Duration: ${created_event_duration_hour}:${created_event_duration_minute}:00</p>`;
    
                    document.querySelector('#events').append(created_event_div);
    
                    //Add the event to the day with add_event_to_day function
                    add_event_to_day(created_event_id);
                }
              });

            return false;
        }
    }


    //Function to order all events based on starting time
    function order_events(){
        let div_order = [];
        document.querySelectorAll('.calendar-object').forEach((calendar_object) => {
            let start_time = calendar_object.dataset.start_time;
            let hour = parseInt(start_time.substring(0,2));
            let minute = parseInt(start_time.substring(3,5));
            if(div_order.length >= 1){
                let inserted = false;
                for(let i = 0; i < div_order.length; i++){
                    let contender_start_time = document.querySelector(`#${div_order[i]}`).dataset.start_time;
                    let contender_hour = parseInt(contender_start_time.substring(0,2));
                    let contender_minute = parseInt(contender_start_time.substring(3,5));
    
                    if((hour < contender_hour) || (hour == contender_hour && minute <= contender_minute)){
                        div_order.splice(i, 0, calendar_object.id);
                        inserted = true;
                        break;
                    }
                }
    
                if(!inserted){
                    div_order.push(calendar_object.id);
                }
            }else{
                div_order.push(calendar_object.id);
            }
        })

        let calendar_div = document.querySelector('#calendar');
        for(let i = 0; i < div_order.length; i++){
            let appending_div_id = div_order[i];
            let appending_div = document.querySelector(`#${appending_div_id}`);
            calendar_div.appendChild(appending_div);
    
        }
    }

    //Automatically start with ordering all events on starting time
    order_events();
}


//Funcion of index page, when calendar is visible
function mainpage(){
    //All months, to get the names of a given month later on
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    let current_month =  document.querySelector('#month').innerHTML;
    let year = parseInt(document.querySelector('#year').innerHTML);

    //Start by ordering all events
    order_events();

    //When clicked on <, show data for previous month
    document.querySelector('#previous-month').onclick = () => {
        let previous_month;
        let month_number;
        if(current_month == 'January'){
            previous_month = 'December';
            month_number = months.indexOf(previous_month);
            year--;
            document.querySelector('#year').innerHTML = year;
        }else{
            const index = months.indexOf(current_month);
            month_number = index - 1;
            previous_month = months[month_number];
        } 

        amount_days = new Date(year, month_number + 1, 0).getDate();
        starting_day = new Date(year, month_number, 0).getDay();

        let amount_days_prev_month;
        if(month_number == 0){
            amount_days_prev_month = new Date(year - 1, 12, 0).getDate();
        }else{
            amount_days_prev_month = new Date(year, month_number, 0).getDate();
        }

        document.querySelector('.days').innerHTML = '';
        for(let i = 0; i < starting_day; i++){
            document.querySelector('.days').innerHTML = document.querySelector('.days').innerHTML + `<li data-date="${year}-${month_number}-${(amount_days_prev_month - starting_day) + i + 1}" style='margin-left:3px;'>${ (amount_days_prev_month - starting_day) + i + 1}</li>`;
        }


        for(let i = 0; i < amount_days; i++){
            const day_li = document.createElement('li');
            day_li.style.marginLeft = '3px';
            day_li.dataset.date = `${year}-${month_number + 1}-${i + 1}`;
            day_li.innerHTML = `<strong>${i + 1}</strong>`;
            day_li.id = `li-${year}-${month_number + 1}-${i + 1}`;

            fetch(`/events-on-date/${year}-${month_number + 1}-${i + 1}`)
            .then(response => response.json())
            .then(events => {
                if(events){
                    events.forEach((event) => {
                        let event_on_day_div = document.createElement('div');
                        event_on_day_div.className = `event-in-calendar div-${year}-${month_number + 1}-${i + 1}`;
                        event_on_day_div.style.backgroundColor = event.color;
                        event_on_day_div.style.border = `1px solid ${event.color}`;
                        event_on_day_div.id = `event-${event.id}`;
                        event_on_day_div.dataset.start_time = `${event.start_time}`;

                        event_on_day_div.innerHTML = event_on_day_div.innerHTML + `<p style='float:left;margin:auto'>${event.start_time}-${event.end_time}</p><p style='display:inline'><strong>${event.event_name}</strong></p>`;

                        day_li.append(event_on_day_div);
                    })
                }
            });  
            document.querySelector('.days').append(day_li);
        }

        document.querySelector('#month').innerHTML = previous_month;
        mainpage();
    }


    //When clicked on >, show data for next month
    document.querySelector('#next-month').onclick = () => {
        let next_month;
        let month_number;
        if(current_month == 'December'){
            next_month = 'January';
            month_number = months.indexOf(next_month);
            year++;
            document.querySelector('#year').innerHTML = year;
        }else{
            const index = months.indexOf(current_month);
            month_number = index + 1;
            next_month = months[month_number];
        } 

        amount_days = new Date(year, month_number + 1, 0).getDate();
        starting_day = new Date(year, month_number, 0).getDay();

        let amount_days_prev_month;
        if(month_number == 0){
            amount_days_prev_month = new Date(year - 1, 12, 0).getDate();
        }else{
            amount_days_prev_month = new Date(year, month_number, 0).getDate();
        }

        document.querySelector('.days').innerHTML = '';
        for(let i = 0; i < starting_day; i++){
            document.querySelector('.days').innerHTML = document.querySelector('.days').innerHTML + `<li data-date="${year}-${month_number}-${(amount_days_prev_month - starting_day) + i + 1}" style='margin-left:3px;'>${ (amount_days_prev_month - starting_day) + i + 1}</li>`;
        }

        for(let i = 0; i < amount_days; i++){
            const day_li = document.createElement('li');
            day_li.style.marginLeft = '3px';
            day_li.dataset.date = `${year}-${month_number + 1}-${i + 1}`;
            day_li.innerHTML = `<strong>${i + 1}</strong>`;
            day_li.id = `li-${year}-${month_number + 1}-${i + 1}`;

            fetch(`/events-on-date/${year}-${month_number + 1}-${i + 1}`)
            .then(response => response.json())
            .then(events => {
                if(events){
                    events.forEach((event) => {
                        let event_on_day_div = document.createElement('div');
                        event_on_day_div.className = `event-in-calendar div-${year}-${month_number + 1}-${i + 1}`;
                        event_on_day_div.style.backgroundColor = event.color;
                        event_on_day_div.style.border = `1px solid ${event.color}`;
                        event_on_day_div.id = `event-${event.id}`;
                        event_on_day_div.dataset.start_time = `${event.start_time}`;

                        event_on_day_div.innerHTML = event_on_day_div.innerHTML + `<p style='float:left;margin:auto'>${event.start_time}-${event.end_time}</p><p style='display:inline'><strong>${event.event_name}<strong></p>`;

                        day_li.append(event_on_day_div);
                    })
                }
            });  
            document.querySelector('.days').append(day_li);
        }
        document.querySelector('#month').innerHTML = next_month;
        mainpage()
    }

    //Function to order the events based on starting time
    function order_events(){
        current_month_number = months.indexOf(current_month) + 1;
        if(current_month_number < 10){
            current_month_number = `0${current_month_number}`;
        }
        
        for(let i = 1; i < 32; i++){
            let day = i;

            let date = `li-${year}-${current_month_number}-${day}`;
            let date_li = document.querySelector(`#${date}`);

            if(date_li != null){
                let div_order = [];
                document.querySelectorAll(`.div-${year}-${current_month_number}-${day}`).forEach((event_div) => {
                    let start_time = event_div.dataset.start_time;
                    let hour = parseInt(start_time.substring(0,2));
                    let minute = parseInt(start_time.substring(3,5));
                    if(div_order.length >= 1){
                        let inserted = false;
                        for(let i = 0; i < div_order.length; i++){
                            let contender_start_time = document.querySelector(`#${div_order[i]}`).dataset.start_time;
                            let contender_hour = parseInt(contender_start_time.substring(0,2));
                            let contender_minute = parseInt(contender_start_time.substring(3,5));
    
                            if((hour < contender_hour) || (hour == contender_hour && minute <= contender_minute)){
                                div_order.splice(i, 0, event_div.id);
                                inserted = true;
                                break;
                            }
                        }
    
                        if(!inserted){
                            div_order.push(event_div.id);
                        }
                    }else{
                        div_order.push(event_div.id);
                    }
                })

                for(let i = 0; i < div_order.length; i++){
                    let appending_div_id = div_order[i];
                    let appending_div = document.querySelector(`#${appending_div_id}`);
                    date_li.appendChild(appending_div);
                }
            }
        }
    }

    //When clicked on a given day, send user to the view-day page for that given day
    let ul = document.getElementById("days");
    let items = ul.getElementsByTagName("li");
    for (let i = 0; i < items.length; i++) {
      items[i].onclick = () => {
        let date = items[i].dataset.date;
        window.location.href = `http://127.0.0.1:8000/view-day/${date}`;
      }
    }
}


//Function for the events page
function eventspage(){
    //Declare all colors with corresponding color codes, to be referenced later on
    const COLOR_NAMES = ['Red', 'Blue', 'Yellow', 'Green']
    const COLOR_CODES = ['#FFCCCB', '#ADD8E6', '#FFFFE0', '#90EE90']

    document.querySelector('#add-event-btn').onclick = () => {
        if(document.querySelector('.add-event').style.display == 'block'){
            document.querySelector('.add-event').style.display = 'none';
        }else{
            document.querySelector('.add-event').style.display = 'block';
        }
    }

    
    //Let the user order all events based on asc, color or duration
    document.querySelector('#order-events').onchange = () => {
        const action = document.querySelector('#order-events').value;

        fetch(`/order/${action}`)
        .then(response => response.json())
        .then(events => {
            document.querySelector('.all-events').innerHTML = '';
            events.forEach(event => {
                const event_div = document.createElement('div');
                event_div.className = 'event';
                event_div.style.backgroundColor = event.color;
                event_div.style.border = `1px solid ${event.color}`;
                event_div.id = `display-event-container-${event.id}`;

                const event_info = document.createElement('div');
                event_info.id = `event-info-${event.id}`;

                let event_duration = event.duration;
                event_duration = `${event_duration.substring(4,6)}:${event_duration.substring(7,9)}:${event_duration.substring(10,12)}`;

                event_info.innerHTML = `
                <p class='edit-event-btn' style="float:right;color:blue" data-event="${event.id}">Edit</p>
                <p class="delete-event-btn" style="float:right;color:blue" data-event="${event.id}">Delete&nbsp;&nbsp;</p>
                <h4 id='display-event-name-${event.id}' style='display:inline'>${event.name}</h4>
                <p id='display-event-duration-${event.id}'>Duration: ${event_duration}</p>`;

                event_div.append(event_info);

                const event_edit = document.createElement('div');
                event_edit.id = `event-edit-${event.id}`;
                event_edit.style.display = 'none';

                event_edit.innerHTML = `
                <form method='post' id='edit-event-form-${event.id}'>
                    <h4 id="event-error-${event.id}" class='error_msg'></h4>
                    <h4>Event Name:</h4>
                    <input class="form-control" id="event-name-${event.id}" type="text" value="${event.name}"></input>
                    <br>
                    <h4>Event Duration:</h4>
                    <input class="form-control" id="event-duration-${event.id}" type="text" value="${event_duration}">
                    <br>
                    <h4>Event Color:</h4>
                    <select class="form-control" id="event-color-${event.id}">
                        <option value="" selected>Event color:</option>
                        <option value="Red">Red</option>
                        <option value="Blue">Blue</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Green">Green</option>
                    </select>
                    <br><br>
                    <input type="submit" class="btn btn-primary" value="Save Event">
                </form>`;

                event_div.append(event_edit);

                document.querySelector('.all-events').append(event_div);
                eventspage();
            })
        });  
    }


    //Let the user edit a created event
    document.querySelectorAll('.edit-event-btn').forEach((button) => {
        button.onclick = () => {
            const event_id = button.dataset.event;

            document.querySelector(`#event-edit-${event_id}`).style.display = 'block';
            document.querySelector(`#event-info-${event_id}`).style.display = 'none';
    
            document.querySelector(`#edit-event-form-${event_id}`).onsubmit = () => {
                const event_name = document.querySelector(`#event-name-${event_id}`).value;
                if(event_name == ''){
                    document.querySelector(`#event-error-${event_id}`).innerHTML = 'Please give your event a name.';
                }else{
                    //Ensure that no faulty data can be filled in, by checking everything on already existing or invalid data
                    const event_duration = document.querySelector(`#event-duration-${event_id}`).value;
                    let event_color = 'default';
                    if(document.querySelector(`#event-color-${event_id}`).value != ''){
                        event_color = document.querySelector(`#event-color-${event_id}`).value;
                    }
    
                    let error_msg = '';
                    fetch(`/get-event/${event_id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            event_name: event_name,
                            event_duration: event_duration,
                            event_color: event_color
                        })
                    })
                    .then(response => response.json())
                    .then(result => {
                        if(result['error']){
                            error_msg = result['error'];
                        }
                        if(error_msg != ''){
                            document.querySelector(`#event-error-${event_id}`).innerHTML = error_msg;
                        }else{
                            document.querySelector(`#display-event-name-${event_id}`).innerHTML = event_name;
                            document.querySelector(`#display-event-duration-${event_id}`).innerHTML = `Duration: ${event_duration}`;
            
                            for(let i = 0; i < COLOR_NAMES.length; i++){
                                if(COLOR_NAMES[i] == event_color){
                                    document.querySelector(`#display-event-container-${event_id}`).style.backgroundColor = COLOR_CODES[i];
                                }
                            }
            
                            document.querySelector(`#event-edit-${event_id}`).style.display = 'none';
                            document.querySelector(`#event-info-${event_id}`).style.display = 'block';
                        }
                    });
                }
                return false;
            }
        }
    })


    //Let an user delete a created event
    document.querySelectorAll('.delete-event-btn').forEach((button) => {
        button.onclick = () => {
            event_id = button.dataset.event;
            fetch(`/delete-event/${event_id}`, {
                method: 'POST',
                body: JSON.stringify({
                    event_id: event_id
                })
            })

            document.querySelector(`#display-event-container-${event_id}`).style.display = 'none';
            eventspage();
        }
    })
}