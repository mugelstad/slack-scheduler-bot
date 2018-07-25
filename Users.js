var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

if(!process.env.MONGODB_URI) throw new Error('uri missing');

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true})

var userSchema = new Schema({
  slack_id: {
    type: String
  },
  token: {

  },
  currentReminder: {
    subject: {
      type: String
    },
    date: {
      type: String
    }
  }
});

var User = mongoose.model('User', userSchema);
module.exports = {
  User : User
};
