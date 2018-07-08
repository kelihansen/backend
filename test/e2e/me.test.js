const { assert } = require('chai');
const request = require('./request');
const { dropCollection } = require('./db');
const jwt = require('jsonwebtoken');

describe.only('Me API', () => {
  before(() => dropCollection('users'));
  before(() => dropCollection('shareables'));
  before(() => dropCollection('accounts'));

  let token = null;
  let tokenDany = null;
  let tokenSansa = null;

  let jonId = null;
  let danyId = null;
  let sansaId = null;

  before(() => {
    const users = [
      { firstName: 'Jon', lastName: 'Snow', email: 'jon@thewall.com', password: 'honor'},
      { firstName: 'Dany', lastName: 'Targaryan', email: 'dany@dragons.com', password: 'dragons' },
      { firstName: 'Sansa', lastName: 'Stark', email: 'sansa@winterfell.com', password: 'whyme'}
    ];
    
    return Promise.all(
      users.map(user => request
        .post('/api/auth/signup')
        .send(user)
        .then(({ body: { token } }) => ({ token, id: jwt.decode(token).id }))
      )
    )
      .then(([ jon, dany, sansa ]) => {
        token = jon.token;
        jonId = jon.id;
        tokenDany = dany.token;
        danyId = dany.id;
        tokenSansa = sansa.token;
        sansaId = sansa.id;
      });
  });

  let shareableMeet = {
    description:  'Meet for the first time',
    urgent: true,
    expiration: new Date,
    type: 'requesting'
  };

  let shareableRule = {
    description:  'Take everything over',
    urgent: true,
    type: 'giving'
  };

  let shareableGetHome = {
    description:  'Get back to Winterfell',
    urgent: true,
    type: 'requesting'
  };

  let shareableEatASandwich = {
    description:  'Eat a sandwich',
    type: 'giving'
  };

  before(() => {
    return Promise.all([
      request.post('/api/me/shareables')
        .set('Authorization', tokenDany)
        .send(shareableRule)
        .then(({ body }) => {
          shareableRule._id = body._id;
          shareableRule.owner = danyId;
        }),
      request.post('/api/me/shareables')
        .set('Authorization', tokenSansa)
        .send(shareableGetHome)
        .then(() => {
          shareableGetHome.owner = sansaId;
        }),
      request.post('/api/me/shareables')
        .set('Authorization', tokenSansa)
        .send(shareableEatASandwich)
        .then(() => {
          shareableEatASandwich.owner = sansaId;
        }),
    ]);
  });

  it('Retrieves a user\'s profile by id', () => {
    return request.get('/api/me')
      .set('Authorization', token)
      .then(({ body }) => {
        assert.equal(body.__v, 0);
        assert.ok(body.firstName);
        assert.ok(body.lastName);
      });
  });

  it('Updates own profile information', () => {
    return request.put('/api/me')
      .set('Authorization', token)
      .send({ lastName: 'Targaryen' })
      .then(({ body }) => {
        assert.equal(body.lastName, 'Targaryen');
      });
  });

  it('Adds a friend request', () => {
    return request.put('/api/me/friend-requests')
      .set('Authorization', token)
      .send({email: 'dany@dragons.com'})
      .then(({ body }) => {
        assert.deepEqual(body, { requestReceived: true });
      });
  });

  it('Can\'t duplicate a friend request', () => {
    return request.put('/api/me/friend-requests')
      .set('Authorization', token)
      .send({email: 'dany@dragons.com'})
      .then(() => {
        return request.get('/api/me')
          .set('Authorization', tokenDany);
      })
      .then(({ body }) => {
        assert.equal(body.pendingFriends.length, 1);
      });
  });

  it('Can\'t send self a friend request', () => {
    return request.put('/api/me/friend-requests')
      .set('Authorization', token)
      .send({email: 'jon@thewall.com'})
      .then(response => {
        assert.equal(response.status, 403);
        assert.include(response.body.error,  'yourself');
      });
  });
  
  it('Confirms a pending friend', () => {
    return request.put(`/api/me/friends/${jonId}`)
      .set('Authorization', tokenDany)
      .then(({ body }) => {
        assert.equal(body.friends.length, 1);
        assert.equal(body.pendingFriends.length, 0);
      });
  });
  
  it('Can\'t add an already friend', () => {
    return request.put('/api/me/friend-requests')
      .set('Authorization', token)
      .send({email: 'dany@dragons.com'})
      .then(response => {
        assert.equal(response.status, 403);
        assert.include(response.body.error,  'already');
      });
  });

  it('Populates a friend list', () => {
    return request.get('/api/me/friends')
      .set('Authorization', token)
      .then(({ body }) => {
        assert.ok(body.friends);
        assert.ok(body.pendingFriends);
      });
  });

  it('Retrieves a single friend\'s profile', () => {
    return request.get(`/api/me/friends/${danyId}`)
      .set('Authorization', token)
      .then(({ body }) => {
        assert.equal(body.firstName, 'Dany');
        assert.ok(Array.isArray(body.shareables));
      });
  });

  it('Will not retrieve a profile if not friends', () => {
    return request.get(`/api/me/friends/${sansaId}`)
      .set('Authorization', token)
      .then(response => {
        assert.equal(response.status, 403);
        assert.include(response.body.error,  'Not');
      });
  });

  it('Saves a new shareable', () => {
    return request.post('/api/me/shareables')
      .set('Authorization', token)
      .send(shareableMeet)
      .then(({ body }) => {
        shareableMeet._id = body._id;
        assert.equal(body.type, 'requesting');
      });
  });

  it('Gets all personal shareables on a list', () => {
    return request.get('/api/me/shareables')
      .set('Authorization', token)
      .then(({ body }) => {
        assert.equal(body[0].description, 'Meet for the first time');
      });
  });

  it('Updates an owned shareable', () => {
    const oldDate = shareableMeet.expiration;
    return request.put(`/api/me/shareables/${shareableMeet._id}`)
      .set('Authorization', token)
      .send({ expiration: new Date })
      .then(({ body }) => {
        assert.notEqual(oldDate, body.expiration);
      });
  });

  it('Retrieves all feed shareables', () => {
    return request.get('/api/me/feed')
      .set('Authorization', token)
      .then(({ body }) => {
        assert.equal(body.length, 1);
        assert.equal(body[0].owner._id, danyId);
      });
  });

  it('Deletes a shareable', () => {
    return request.delete(`/api/me/shareables/${shareableMeet._id}`)
      .set('Authorization', token)
      .then(({ body }) => {
        assert.ok(body.deleted);
        return request.get('/api/me/shareables')
          .set('Authorization', token);
      })
      .then(({ body }) => {
        assert.deepEqual(body, []);
      });
  });

  it('Deletes a friend', () => {
    return request.delete(`/api/me/friends/${danyId}`)
      .set('Authorization', token)
      .then(() => {
        return request.get('/api/me')
          .set('Authorization', token);
      })
      .then(({ body }) => {
        assert.equal(body.friends.length, 0);
      });
  });
});