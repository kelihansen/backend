const mongoose = require('mongoose');
const { Schema } = mongoose;
const { RequiredString } = require('../utils/mongoose-helpers');

const schema = new Schema({
  firstName:  RequiredString,
  lastName:  RequiredString,
  pictureUrl: String,
  contact: String,
  availability: {
    notes: String,
    days: [{ type: String, enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']}]
  },
  friends: [{type: Schema.Types.ObjectId, ref: 'User'}],
  pendingFriends: [{type: Schema.Types.ObjectId, ref: 'User'}]
});

module.exports = mongoose.model('User', schema);