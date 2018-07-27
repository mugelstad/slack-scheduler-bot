var express = require('express');
var app = express();

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


        if(calendarType === 'reminder') addReminder(user.token, parsedPayload.channel.id);
        else if (calendarType === 'meeting') addMeeting(user.token);
        web.chat.postMessage({ channel: parsedPayload.channel.id, text: 'event created on google' });
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
    gmail = google.gmail({ version: 'v1', auth: oauth2Client})
    gmail.users.getProfile({userId: 'me'}, (err, profile) => {
      console.log('Gmail inside getToken', profile.data.emailAddress);
      //@@mongoDB create user in mongoDB
      new User({
        slack_id: req.query.state,
        token: token,
        gmail: profile.data.emailAddress,
      })
      .save()
      .then()
      .catch((err) => {
        console.error(err);
      })
    })
  });
})//end of get /oauthcallback
