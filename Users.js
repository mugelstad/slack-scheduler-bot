var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;
if(!process.env.MONGODB_URI) throw new Error('uri missing');
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true})
var userSchema = new Schema({
  slack_id: {
    type: String
  },
  googleCalenderFields: {},// will have Access Token, Refresh Token, Google+ Profile ID, etc.
  token: {},
  slackUsername: {
    type: String
  },
  slackEmail: {
    type: String
  },
  SlackDMIds: {
  },
  setting: {
    meetingLength: {
      type: Number,
      default: 30
    }
  }
});
var taskSchema = new Schema({
  subject:                { type: String, required: true },
  day:                    { type: Date, required: true },
  googleCalenderEventId:  { type: String },
  requesterId :           { type: String }
})
var meetingSchema = new Schema({
  time:           { type: String, required: true },
  day:            { type: Date, required: true },
  invitees:       { type: Array, required: true },
  subject:        { type: String },
  location:       { type: String },
  meetingLength:  { type: Number },
  googleCalenderFields: {},
  status:         { type: String }, //pending or scheduled
  createdAt:      { type: Date },
  requesterId :   { type: String }
})
var inviteRequestSchema = new Schema({
  googleCalenderEventId: { type: String },
  inviteeId:             { type: String },
  RequesterId:           { type: String },
  status:                { type: String } //pending or scheduled
})
var User = mongoose.model('User', userSchema);
var Task = mongoose.model('Task', taskSchema);
var Meeting = mongoose.model('Meeting', meetingSchema);
var InviteRequest = mongoose.model('InviteRequest', inviteRequestSchema);
module.exports = {
  User,
  Task,
  Meeting,
  InviteRequest
};
