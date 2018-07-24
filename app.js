var express = require('express');
var app = express();

const { RTMClient, WebClient } = require('@slack/client');

// Get an API token by creating an app at <https://api.slack.com/apps?new_app=1>
// It's always a good idea to keep sensitive data like the token outside your source code. Prefer environment variables.
const token = process.env.SLACK_API_TOKEN || '';
if (!token) { console.log('You must specify a token to use this example'); process.exitCode = 1; }

// Initialize an RTM API client
const rtm = new RTMClient(token);
const web = new WebClient(token);
// Start the connection to the platform
rtm.start();

// Log all incoming messages
rtm.on('message', (event) => {
 console.log(event)
 var conversationId = event.channel
 if (event.subtype) { return; }

 web.chat.postMessage({
   channel: conversationId,
   text: 'app reminder confirmation',
   attachments: [{
     text: 'Would you like to set reminder for laundry at 10am on Saturday?',
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

  let text = event.text;
  fetch('/query', {
    method: 'POST',
    Headers: {
      Authorization: process.env.CLIENT_ACCESS_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(text)

  }).then((res) =>{
    console.log('response from fetching', res)
  })
  .catch((err) => {
    console.log('error', err)
  })

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

app.listen(process.env.PORT || 3000)
