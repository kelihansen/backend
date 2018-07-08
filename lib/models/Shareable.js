const mongoose = require('mongoose');
const { Schema } = mongoose;
const { RequiredString } = require('../utils/mongoose-helpers');

const schema = new Schema({
  description: RequiredString,
  expiration: Date,
  urgent: Boolean,
  type: { ...RequiredString, enum: ['requesting', 'giving'] },
  owner: { type: Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Shareable', schema);