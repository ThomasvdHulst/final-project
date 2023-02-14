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
                document.querySelector('#confirm-event').style.display = 'none';
                document.querySelector('#set-times').style.display = 'block';
                document.querySelector('#cancel-times').onclick = () => {
                    document.querySelector('#set-times').style.display = 'none';
                }

                document.querySelector('#set-times-form').onsubmit = () => {
                    let starting_time = document.querySelector('#starting-time').value;
                    let ending_time = document.querySelector('#ending-time').value;

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
                      });

                    document.querySelector('#set-times').style.display = 'none';
    
                    let new_event = document.createElement('div');
                    new_event.className = 'calendar-object';
                    new_event.style.backgroundColor = event.color;
    
                    new_event.innerHTML = `<p class='times'>${starting_time} - ${ending_time}</p><p class='event-name'>${event.name}</p>`;
    
                    document.querySelector('#calendar').append(new_event);
                    daypage();

                    return false
                }
            }
        });  
    })

    document.querySelector('#calendar').addEventListener('dragover', (e) => {
        e.preventDefault();
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
            document.querySelector('.days').innerHTML = document.querySelector('.days').innerHTML + `<li data-date="${year}-${month_number + 1}-${i + 1}" style='margin-left:3px;'><strong>${i + 1}</strong></li>`;
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
            document.querySelector('.days').innerHTML = document.querySelector('.days').innerHTML + `<li data-date="${year}-${month_number + 1}-${i + 1}" style='margin-left:3px;'><strong>${i + 1}</strong></li>`;
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
}