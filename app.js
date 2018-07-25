var {User} = require('./Users.js')
var express = require('express');
var mongoose = require('mongoose')
var app = express();
var fetch = require('node-fetch')
var bodyParser = require('body-parser');


const { RTMClient, WebClient } = require('@slack/client');

// Get an API token by creating an app at <https://api.slack.com/apps?new_app=1>
// It's always a good idea to keep sensitive data like the token outside your source code. Prefer environment variables.
const slackToken = process.env.SLACK_API_TOKEN || '';
if (!slackToken) { console.log('You must specify a token to use this example'); process.exitCode = 1; }

const dialogflow = require('dialogflow')

//CONNECT GOOGLE CALENDAR
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

let text;

// Initialize an RTM API client
const rtm = new RTMClient(slackToken);
const web = new WebClient(slackToken);
// Start the connection to the platform
rtm.start();


// https://developers.google.com/calendar/quickstart/nodejs
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
)

var link = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  state: 'DEMIMAGIC_ID', // meta-data for DB
  scope: [
    'https://www.googleapis.com/auth/calendar'
  ]
})

// ask user for access to their calendar
console.log('open URI:', link)



rtm.on('message', (event) => {
 const conversationId = event.channel
 if (event.subtype) { return; }

  text = event.text;

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
      // console.log('Detected intent', result.parameters.fields);
      // console.log(`  Query: ${result.queryText}`);
      // console.log(`  Response: ${result.fulfillmentText}`);


      //confirm only after required parameter complete
  if (result.action === 'create_reminder' && result.allRequiredParamsPresent) {
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
          "no": {}
        }]
      }]
    })
  .catch(console.error)

  } else {
    web.chat.postMessage({ channel: conversationId, text: result.fulfillmentText});
  }

    //inputs for google calendar
    var subject = result.parameters.fields.Subject.stringValue;
    var date = result.parameters.fields.date.stringValue;


    if (result.intent) {
      // console.log(`  Intent: ${result.intent.displayName}`);
    } else {
      console.log(`  No intent matched.`);
    }
  })
  .catch(err => {
    console.error('ERROR:', err);
  });
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
  //determines which button the user clicked
 var parsedPayload = JSON.parse(req.body.payload)
 var valueClicked = parsedPayload.actions[0].value
 if (valueClicked === 'yes'){
   //create google calendar reminder
   console.log('Clicked YES')
   //if credentials are not there, generate a URL for user
   User.findOne({slack_id: parsedPayload.user.id}, (err, user) => {
      if (err) { console.log('error in finding user in /schedule', err) }
      if (user) {
        if (user.token) {
          console.log('userfound in /schedule', users)
          oAuth2Client.setCredentials(credentials);
          listEvents(oAuth2Client);
          web.chat.postMessage({ channel: parsedPayload.channel.id, text: 'event created on google' });
        }
      } else { //no user
        //generate authUrl

        console.log('no user found in /schedule')
        var link = authorize(credentials, addEvent, parsedPayload.user.id)

        web.chat.postMessage({
          channel: parsedPayload.channel.id,
          text: "Authorize Google Calendar: " + link
        })
        // var googleToken = '';
        //
        // //make a user with generated token
        // new User({slack_id: parsedPayload.user.id, token: googleToken);
      }
   })
 } else {//clicked NO
   web.chat.postMessage({
     channel: JSON.parse(req.body.payload).channel.id,
     text: 'Okay. Event will not be added to Calendar.'
   })
 }
})//end of post schedule end point

app.get('/google', (req, res) => {
  oAuth2Client.getToken(req.query.code, (err, token) => {
    if (err) console.error(err)
    oAuth2Client.setCredentials(token);

    //create user in mongoDB
    new User({slack_id: req.query.slack_id, token: token}).save()
    .then()
    .catch((err) => {
      console.error(err);
    })
    //save a token and slack_id
  });
})

const sessionId = 'nem-bot-sessionId';
const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath(process.env.DIALOGFLOW_PROJECT_ID, sessionId);


//GOOGLE CALENDAR
// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 */
function authorize(credentials, callback, slack_id) {
  var link = getAccessToken(oAuth2Client, slack_id);
  console.log('authorize link', link)

  // oAuth2Client.setCredentials(credentials);
  // callback(oAuth2Client);
  return link;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 */
function getAccessToken(oAuth2Client, slack_id) {
  const authUrl = oAuth2Client.generateAuthUrl({
  //  access_type: 'offline',
    scope: SCOPES,
    state: encodeURIComponent(JSON.stringify({slack_id: slack_id}))
  });

  // const rl = readline.createInterface({
  //   input: process.stdin,
  //   output: process.stdout,
  // });
  // rl.question('Enter the code from that page here: ', (code) => {
  //   rl.close();

  // });
  return authUrl;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 */
function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}

function addEvent(auth){
  const calendar = google.calendar({version: 'v3', auth});
  console.log('AUTH', auth)
  console.log('hello, creating a new event')
  calendar.events.quickAdd({
    calendarId: 'primary',
    text: text
  })
}


app.listen(process.env.PORT || 3000)
