var express = require('express');
var app = express();

var fetch = require('node-fetch')

const { RTMClient, WebClient } = require('@slack/client');

// Get an API token by creating an app at <https://api.slack.com/apps?new_app=1>
// It's always a good idea to keep sensitive data like the token outside your source code. Prefer environment variables.
const token = process.env.SLACK_API_TOKEN || '';
if (!token) { console.log('You must specify a token to use this example'); process.exitCode = 1; }

const dialogflow = require('dialogflow')
const google = require('googleapis')

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


      web.chat.postMessage({
        channel: conversationId,
        text: 'app reminder confirmation',
        attachments: [{
          text: result.fulfillmentText,
          attachment_type: 'default',
          callback_id: "reminderConfirm",
          actions: [{
              'name': 'choice',
              'text': 'confirm',
              'type': 'button',
              'value': 'confirm',
              "confirm": {
                "title": "Are you sure?",
                'ok_text': "yes",
                'dismiss_text': 'no'
              }
            }]
        }]
      })
      .catch(console.error)

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

// Log all reactions
rtm.on('reaction_added', (event) => {
 // Structure of `event`: <https://api.slack.com/events/reaction_added>
 console.log(`Reaction from ${event.user}: ${event.reaction}`);
});
rtm.on('reaction_removed', (event) => {
 // Structure of `event`: <https://api.slack.com/events/reaction_removed>
 console.log(`Reaction removed by ${event.user}: ${event.reaction}`);
});

// Send a message once the connection is ready
rtm.on('ready', (event) => {
});

app.post('/schedule', (req, res) => {
 console.log('schedule route', req)
})

const sessionId = 'nem-bot-sessionId';
const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath(process.env.DIALOGFLOW_PROJECT_ID, sessionId);





app.listen(process.env.PORT || 3000)
