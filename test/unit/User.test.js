const { assert } = require('chai');
const User = require('../../lib/models/User');

describe('User model test', () => {
  it('Valid and good model', () => {
    const data = {
      firstName:  'Don',
      lastName:  'Jon',
      availability: {
        days: []
      },
      friends: [],
      pendingFriends: []
    };

    const user = new User(data);

    assert.deepEqual(user.toJSON(), {
      _id: user._id,
      ...data
    });

    assert.isUndefined(user.validateSync());
  });
});