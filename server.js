//Import MongoDB Models
var {User, Task, Meeting, InviteRequest} = require('./Users.js')
var mongoose = require('mongoose')

var express = require('express');
var app = express();
var fetch = require('node-fetch')
var bodyParser = require('body-parser');

//Connect Slack API
const { RTMClient, WebClient } = require('@slack/client');
// Get an API token by creating an app at <https://api.slack.com/apps?new_app=1>
const slackToken = process.env.SLACK_API_TOKEN || '';
if (!slackToken) { console.log('You must specify a token to use this example'); process.exitCode = 1; }
// Initialize an RTM API client
const rtm = new RTMClient(slackToken);
const web = new WebClient(slackToken);

//Import dialogflow (trained bot)
const dialogflow = require('dialogflow')

//Connect Google Calendar API
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// Start the connection to the platform
rtm.start();

let text;
var subject, date, time, duration, invitees;
var calendarType;
var calendar;

//Set necessary Google credentials
// https://developers.google.com/calendar/quickstart/nodejs
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
)

//When user sends a message to our bot
rtm.on('message', (event) => {
 const conversationId = event.channel
 if (event.subtype) { return; }

  //Text that user sends to our bot
  text = event.text;

  //for Nicole
  console.log(text);

  //@@dialogflow
  fetch('https://api.dialogflow.com/v1/?v=20150910', {
    method: 'POST',
    Headers: {
      Authorization: process.env.CLIENT_ACCESS_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "lang": "en",
      "query": text,
      "sessionId": "1234567890",
    })

  }).then((res) =>{
    //console.log('response from fetching from dialog flow', res)
  })
  .catch((err) => {
    console.log('error', err)
  })

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: text,
        languageCode: 'en-US',
      },
    },
  };

  sessionClient.detectIntent(request)
  .then(responses => {
    const result = responses[0].queryResult;

    if(result.action === 'create_reminder') calendarType = 'reminder'
    else if (result.action === 'create_meeting') calendarType = 'meeting'
    //confirm only after required parameter complete
    if (result.allRequiredParamsPresent && (result.action === 'create_reminder'
      || result.action === 'create_meeting')) {
    web.chat.postMessage({
      channel: conversationId,
      text: 'app reminder confirmation',
      attachments: [{
        text: result.fulfillmentText,
        attachment_type: 'default',
        callback_id: "reminderConfirm",
        actions: [{
            'name': 'yes',
            'text': 'yes',
            'type': 'button',
            'value': 'yes',
            "yes": {}//give access to calendar
          },
          {
            'name': 'no',
            'text': 'no',
            'type': 'button',
            'value': 'no',
            "no": {}//send message to exit out
          }]
        }]
      })
    .catch(console.error)
    } else {
      web.chat.postMessage({ channel: conversationId, text: result.fulfillmentText});
    }
      //inputs for google calendar
      subject = result.parameters.fields.Subject.stringValue;
      date = result.parameters.fields.date.stringValue;

      if(result.parameters.fields.duration) duration = result.parameters.fields.duration
      if(result.parameters.fields.time.stringValue) time = result.parameters.fields.time.stringValue
      if (result.parameters.fields.Invitees) invitees = result.parameters.fields.Invitees

      if (result.intent) {
        // console.log(`  Intent: ${result.intent.displayName}`);
      } else {
        console.log(`  No intent matched.`);
      }
    })
    .catch(err => {
      console.error('ERROR:', err);
    });//end of dialogflow
})

// Log all reactions
rtm.on('reaction_added', (event) => {
 // Structure of `event`: <https://api.slack.com/events/reaction_added>
 console.log(`Reaction from ${event.user}: ${event.reaction}`);
});
rtm.on('reaction_removed', (event) => {
 // Structure of `event`: <https://api.slack.com/events/reaction_removed>
 console.log(`Reaction removed by ${event.user}: ${event.reaction}`);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

app.post('/schedule', (req, res) => {

 var parsedPayload = JSON.parse(req.body.payload)

 var valueClicked = parsedPayload.actions[0].value
 if (valueClicked === 'yes'){
   console.log('Clicked YES')

   User.findOne({slack_id: parsedPayload.user.id}, (err, user) => {
    if (err) { console.log('error in finding user in /schedule', err) }
    if (user) {
      if (user.token) { //clicked Yes and have user token
        console.log('userfound in /schedule', user)
        if (!user.token.refresh_token) {
          console.log('NO REFRESH TOKEN FOUND', user.token.refresh_token) //MADE IT HERE
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${user.token.access_token}`)
          .then(res => {
            console.log(res)
            User.findByIdAndRemove(user._id, (err, user) => {
              if (err) console.log(err);
              console.log('FOUND BY ID AND REMOVED')
              web.chat.postMessage({channel: parsedPayload.channel.id,
                 text: 'click above link again to reauthenticate'})
            })
          })
        }
        else {
          if(calendarType === 'reminder') addReminder(user.token, parsedPayload.channel.id);
          else if (calendarType === 'meeting') addMeeting(user.token, parsedPayload.channel.id);
          web.chat.postMessage({ channel: parsedPayload.channel.id, text: 'event created on google' });
        }
      }
    } else { //clicked Yes but no user token
      console.log('no user found in /schedule')
      var link = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        state: parsedPayload.user.id, // meta-data for DB
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/userinfo.email'
        ]
      })

      web.chat.postMessage({
        channel: parsedPayload.channel.id,
        text: "Authorize Google Calendar: " + link
      })
    }

  })
 } else {//clicked NO
   web.chat.postMessage({
     channel: parsedPayload.channel.id,
     text: 'Okay. Event will not be added to Calendar.'
   })
 }
})//end of post /schedule



app.get('/oauthcallback', (req, res) => {

  //@@google getToken
  oauth2Client.getToken(req.query.code, (err, token) => {
    if (err){
      console.error(err)
      res.send('we had an error :(')
      return;
    }

    oauth2Client.setCredentials(token);
    res.send('congratulations. authorized')

    oauth2Client.setCredentials(token)
    calendar = google.calendar({version: 'v3', auth: oauth2Client})
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client})
    gmail.users.getProfile({userId: 'me'}, (err, profile) => {
      // console.log('Gmail inside getToken', profile.data.emailAddress);
      //@@slackemail
      web.users.info({'user': req.query.state}).then((res)=> {
        var realName = res.user.profile.real_name
        var displayName = res.user.profile.display_name
        var email = res.user.profile.email
        // console.log('REALNAME', realName.split(' ')[0]);
        var firstName = realName.split(' ')[0];
        new User({
          slack_id: req.query.state,
          token: token,
          gmail: profile.data.emailAddress,
          slackUsername: firstName
        })
        .save()
        .then(event => console.log(event))
        .catch(err => console.log(err))
      })
    })
  });

})//end of get /oauthcallback

const sessionId = 'nem-bot-sessionId';
const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath(process.env.DIALOGFLOW_PROJECT_ID, sessionId);

function addReminder(token, requesterId){
  const oauth2Client = new google.auth.OAuth2(
   process.env.CLIENT_ID,
   process.env.CLIENT_SECRET,
   process.env.REDIRECT_URL
  )
  oauth2Client.setCredentials(token)

  var useDate = date.slice(0, 10)

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

  calendar = google.calendar({version: 'v3', auth: oauth2Client})
  calendar.events.insert({
    calendarId: 'primary',
    resource: event
  }, (err, {data}) => {
    if(err) console.error(err);
    var googleCalenderEventId = '' + data.id;

    //@@MongoDB
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
  console.log('made it to set reminder')
  Task.find({/*everything*/}, (err, taskArray) => {
    if (err) console.log(err);
    taskArray.filter(task => {
      task.day.toString().slice(0,10) === new Date().toString().slice(0,10)
    })

    taskArray
    .forEach(task => {
      web.chat.postMessage({
        channel: task.requesterId, //for slack
        text: `Reminder to ${task.subject} today.`
      }).catch((err) => console.error(err))
    })
  })
};

//Remind user once a day every day at the time the server started
var timerId = setInterval(() => setReminder(), 43200000)


//Add meeting when user tells our bot to 'schedule a meeting with...'
function addMeeting(token, channelId){
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  )

  oauth2Client.setCredentials(token)

  // console.log('INVITEES', invitees.listValue.values);
  //Search through Users for Attendees
  invitees.listValue.values.map(inviteeObj => {
    console.log('NAME', inviteeObj.stringValue);
    User.findOne({slackUsername: inviteeObj.stringValue}, (err, user) => {
      if (err) console.log(err);
      if (user){
        var inviteeEmails = [];
        inviteeEmails.push({'email': user.gmail})
        //Redefine date to accommodate the proper time
          var dateTime = '' + date.slice(0, 10) + time.slice(10)
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
            'attendees': inviteeEmails
          };

          //Insert an event in user's Google Calendar
          calendar = google.calendar({version: 'v3', auth: oauth2Client})
          calendar.events.insert({
            calendarId: 'primary',
            resource: event
          }, (err, data) => {
            if (err) console.error(err);
            new Meeting({
               time: time.slice(11),
               day: date.slice(0, 10),
               invitees: inviteeEmails,
               subject: subject,
               createdAt: new Date()
             })
             .save()
             .then(res => console.log('RESPONSE', res))
             .catch(err => console.error(err))
          })


      } else {
        web.chat.postMessage({
          channel: channelId,
          text: 'User has not been found. Please try scheduling a meeting with a user by writing their first name.'
        })
      }
    })
  })
}

//Listen on port 1337
app.listen(process.env.PORT || 1337)


//refresh token: https://accounts.google.com/o/oauth2/revoke?token=${token.access_token}
