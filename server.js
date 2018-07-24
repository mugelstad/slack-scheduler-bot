var express = require('express');
var app = express();

var fetch = require('node-fetch')

var bodyParser = require('body-parser')

const { RTMClient, WebClient } = require('@slack/client');

// Get an API token by creating an app at <https://api.slack.com/apps?new_app=1>
// It's always a good idea to keep sensitive data like the token outside your source code. Prefer environment variables.
const token = process.env.SLACK_API_TOKEN || '';
if (!token) { console.log('You must specify a token to use this example'); process.exitCode = 1; }

const dialogflow = require('dialogflow')

// Initialize an RTM API client
const rtm = new RTMClient(token);
const web = new WebClient(token);
// Start the connection to the platform
rtm.start();

// Log all incoming messages
let text;
rtm.on('message', (event) => {
 console.log(event)
 var conversationId = event.channel
 if (event.subtype) { return; }

//What dialogflow sends back
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
    console.log('response from fetching', res)
    console.log('RESPONSE', res.Response)

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
      console.log('Detected intent', result.parameters.fields);
      console.log(`  Query: ${result.queryText}`);
      console.log(`  Response: ${result.fulfillmentText}`);


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
        console.log(`  Intent: ${result.intent.displayName}`);
      } else {
        console.log(`  No intent matched.`);
      }
    })
    .catch(err => {
      console.error('ERROR:', err);
    });

})

web.channels.list()
 .then((res) => {
   // `res` contains information about the channels
   res.channels.forEach(c => console.log(c.name));
 })
 .catch(console.error);
// rtm.on('ready', (event) => {
//   console.log('Elaine is ready')
//   web.
// })
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
 var valueClicked = JSON.parse(req.body.payload).actions[0].value
 if (valueClicked === 'yes'){
   //create google calendar reminder
   calendar.events.insert()
 } else {
   //shut it down
 }
})

// app.get('/schedule', )

const sessionId = 'nem-bot-sessionId';
const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath(process.env.DIALOGFLOW_PROJECT_ID, sessionId);

//CONNECT GOOGLE CALENDAR
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), listEvents);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */

 const authUrl = oAuth2Client.generateAuthUrl({
   access_type: 'offline',
   scope: SCOPES,
 });

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authUrl);

  // Send a message once the connection is ready
  rtm.on('ready', (event) => {
    web.chat.postMessage({
      channel: conversationId,
      text: "Hello! I am nem bot. To connect to  Google Calendar, please click on this url: ",
      attachments: [{
        text: authUrl,
        attachment_type: 'default',
        callback_id: "authorizeGC",
      }]
    }).catch(console.error)
    console.log('Nicole is ready!')
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
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





app.listen(process.env.PORT || 3000)
