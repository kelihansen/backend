const { assert } = require('chai');
const Plan = require('../../lib/models/Shareable');
const { Types } = require('mongoose');

describe('Shareable model test', () => {
  it('Valid and good model', () => {
    const data = {
      description:  'Get coffee',
      type: 'giving',
      owner: Types.ObjectId()
    };

    const plan = new Plan(data);

    assert.deepEqual(plan.toJSON(), {
      _id: plan._id,
      ...data
    });

    assert.isUndefined(plan.validateSync());
  });
});