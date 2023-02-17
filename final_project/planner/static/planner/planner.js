//Function that waits a given amount of miniseconds, to ensure all calls to the database are done.
function wait(milliseconds) {
    const this_date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - this_date < milliseconds);
  }

document.addEventListener('DOMContentLoaded', () => {
    const URL = window.location.pathname.split('/')[1];
    if(URL === ''){
        mainpage();
    }else if(URL === 'events'){
        eventspage();
    }else if(URL === 'add-event'){
        daypage();
    }
})

function daypage(){

    document.querySelectorAll('.draggable').forEach((calendar_event) => {
        calendar_event.draggable = 'true';
        calendar_event.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData("text", e.target.id);
        })
    })

    document.querySelector('#calendar').addEventListener('drop', (e) => {
        e.preventDefault();
        if(parseInt(document.querySelector('#amount-events').innerHTML) >= 6){
            document.querySelector('#event_err').style.display = 'block';

            document.querySelector('#calendar-container').append(event_err);
        }else{
            let data = e.dataTransfer.getData('text'); 
        
            fetch(`/get-event/${parseInt(data)}`)
            .then(response => response.json())
            .then(event => {
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
    
                    document.querySelector('#set-times-form').onsubmit = () => {
                        let starting_time = document.querySelector('#starting-time').value;
                        let ending_time = document.querySelector('#ending-time').value;
                        let added_event_id;
    
                        fetch('/confirm-event', {
                            method: 'POST',
                            body: JSON.stringify({
                                event_id: data,
                                day_id: parseInt(document.querySelector('#day_id').innerHTML),
                                ending_time: ending_time,
                                starting_time: starting_time
                            })
                          })
                          .then(response => response.json())
                          .then(result => {
                            console.log(result);
                            added_event_id = result["event_id"];
    
                            document.querySelector('#set-times').style.display = 'none';
        
                            let new_event = document.createElement('div');
                            new_event.className = 'calendar-object';
                            new_event.style.backgroundColor = event.color;
                            new_event.id = `event-container-${added_event_id}`;
            
                            new_event.innerHTML = `<h5 data-event='${added_event_id}' class='delete-event' style='float:right;margin-right:10px'>x</h5><p class='times'>${starting_time} - ${ending_time}</p><p class='event-name'>${event.name}</p>`;
            
                            document.querySelector('#calendar').append(new_event);
                            
                            document.querySelector('#amount-events').innerHTML = parseInt(document.querySelector('#amount-events').innerHTML) + 1;
                            daypage();
                          });
                          
                        return false
                    }
                }
            });  
        }
    })

    document.querySelector('#calendar').addEventListener('dragover', (e) => {
        e.preventDefault();
    })

    document.querySelectorAll('.delete-event').forEach((delete_btn) => {
        delete_btn.onclick = () => {
            event_id = parseInt(delete_btn.dataset.event);
            fetch('/delete-event-from-day', {
                method: 'POST',
                body: JSON.stringify({
                    event_id: event_id
                })
              })
              .then(response => response.json())
              .then(result => {
                console.log(result);
              });

            document.querySelector(`#event-container-${event_id}`).style.display = 'none';

            document.querySelector('#event_err').style.display = 'none';

            document.querySelector('#amount-events').innerHTML = parseInt(document.querySelector('#amount-events').innerHTML) - 1;
            daypage();
        }
    })
}

function mainpage(){
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    const date = new Date();
    let current_month =  document.querySelector('#month').innerHTML;
    let year = parseInt(document.querySelector('#year').innerHTML);

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

            fetch(`/events-on-date/${year}-${month_number + 1}-${i + 1}`)
            .then(response => response.json())
            .then(events => {
                if(events){
                    events.forEach((event) => {
                        let event_on_day_div = document.createElement('div');
                        event_on_day_div.className = 'event-in-calendar';
                        event_on_day_div.style.backgroundColor = event.color;
                        event_on_day_div.style.border = `1px solid ${event.color}`;

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

            fetch(`/events-on-date/${year}-${month_number + 1}-${i + 1}`)
            .then(response => response.json())
            .then(events => {
                if(events){
                    events.forEach((event) => {
                        let event_on_day_div = document.createElement('div');
                        event_on_day_div.className = 'event-in-calendar';
                        event_on_day_div.style.backgroundColor = event.color;
                        event_on_day_div.style.border = `1px solid ${event.color}`;

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

    let ul = document.getElementById("days");
    let items = ul.getElementsByTagName("li");
    for (let i = 0; i < items.length; i++) {
      items[i].onclick = () => {
        let date = items[i].dataset.date;
        window.location.href = `http://127.0.0.1:8000/add-event/${date}`;
      }
    }
}

function eventspage(){
    const COLOR_NAMES = ['Red', 'Blue', 'Yellow', 'Green']
    const COLOR_CODES = ['#FFCCCB', '#ADD8E6', '#FFFFE0', '#90EE90']

    document.querySelector('#add-event-btn').onclick = () => {
        if(document.querySelector('.add-event').style.display == 'block'){
            document.querySelector('.add-event').style.display = 'none';
        }else{
            document.querySelector('.add-event').style.display = 'block';
        }
    }

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

                let event_duration = event.duration;
                event_duration = `${event_duration.substring(4,6)}:${event_duration.substring(7,9)}:${event_duration.substring(10,12)}`;

                event_div.innerHTML = event_div.innerHTML + (`<h4>${event.name}</h4><p>Duration: ${event_duration}</p>`);

                document.querySelector('.all-events').append(event_div);
            })
        });  
    }

    document.querySelectorAll('.edit-event-btn').forEach((button) => {
        button.onclick = () => {
            const event_id = button.dataset.event;

            document.querySelector(`#event-edit-${event_id}`).style.display = 'block';
            document.querySelector(`#event-info-${event_id}`).style.display = 'none';
    
            document.querySelector(`#edit-event-form-${event_id}`).onsubmit = () => {
                const event_name = document.querySelector(`#event-name-${event_id}`).value;
                const event_duration = document.querySelector(`#event-duration-${event_id}`).value;
                let event_color = 'default';
                if(document.querySelector(`#event-color-${event_id}`).value != ''){
                    event_color = document.querySelector(`#event-color-${event_id}`).value;
                }

                fetch(`/get-event/${event_id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        event_name: event_name,
                        event_duration: event_duration,
                        event_color: event_color
                    })
                  })

                document.querySelector(`#display-event-name-${event_id}`).innerHTML = event_name;
                document.querySelector(`#display-event-duration-${event_id}`).innerHTML = event_duration;

                for(let i = 0; i < COLOR_NAMES.length; i++){
                    if(COLOR_NAMES[i] == event_color){
                        document.querySelector(`#display-event-container-${event_id}`).style.backgroundColor = COLOR_CODES[i];
                    }
                }

                document.querySelector(`#event-edit-${event_id}`).style.display = 'none';
                document.querySelector(`#event-info-${event_id}`).style.display = 'block';
                return false;
            }
        }
    })

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