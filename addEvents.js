//Add reminder in user's Google Calendar when user tells our bot 'remind me to...'
function addReminder(token, requesterId){
  const oauth2Client = new google.auth.OAuth2(
   process.env.CLIENT_ID,
   process.env.CLIENT_SECRET,
   process.env.REDIRECT_URL
  )
  oauth2Client.setCredentials(token)


  //Reformat date for proper use
  var useDate = date.slice(0, 10)

  //Object to pass to insert a reminder in Google Calendar
  var event = {
    'summary': subject,
    'start': {
      'date': useDate,
      'timeZone': 'America/Los_Angeles',
    },
    'end': {
      'date': useDate,
      'timeZone': 'America/Los_Angeles',
    },
  };

  //Insert an event in user's Google Calendar
  const calendar = google.calendar({version: 'v3', auth: oauth2Client})
  calendar.events.insert({
    calendarId: 'primary',
    resource: event
  }, (err, {data}) => {
    if(err) console.error(err);
    var googleCalenderEventId = '' + data.id;

    //@@MongoDB Add Task to MongoDB
    new Task({
      subject: subject,
      day: useDate,
      googleCalenderEventId: googleCalenderEventId,
      requesterId: requesterId
    })
    .save()
    .then(event => console.log(event))
    .catch((err) => {
      console.error(err);
    })
  })
}



function setReminder() {
  Task.find({/*everything*/}, (err, taskArray) => {
    if (err) console.log(err);
    taskArray.filter(task => task.day.date === new Date())
    .map(task => {
      web.chat.postMessage({
        channel: task.requesterId, //for slack
        text: `Reminder to ${task.subject} today.`
      })
    })
  })
};



//Add meeting when user tells our bot to 'schedule a meeting with...'
function addMeeting(token){
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  )

//Redefine date to accommodate the proper time
  date = date.slice(0, 10)
  time = time.slice(11)
  var dateTime = '' + date + 'T' +  time
  dateTime = new Date(dateTime);

//Object to pass to insert an event in Google Calendar
  var event = {
    'summary': subject,
    'description': subject,
    'start': {
      'dateTime': dateTime,
      'timeZone': 'America/Los_Angeles',
    },
    'end': {
      'dateTime': dateTime,
      'timeZone': 'America/Los_Angeles',
    },
    'attendees': [
      {'email': 'lpage@example.com'},
      {'email': 'sbrin@example.com'},
    ],
  };

  //Insert an event in user's Google Calendar
  calendar.events.insert({
    calendarId: 'primary',
    resource: event
  })
}

//Listen on port 1337
app.listen(process.env.PORT || 1337)
