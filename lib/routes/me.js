const router = require('express').Router();
const User = require('../models/User');
const Account = require('../models/Account');
const Shareable = require('../models/Shareable');
const { updateOptions } = require('../utils/mongoose-helpers');

module.exports = router
  .get('/', (req, res, next) => {
    const { id } = req.account;
    Promise.all([
      User.findById(id)
        .lean(),
      Shareable.find({ owner: id })
        .lean()
    ])
      .then(([user, shareables]) => {
        user.shareables = shareables;
        res.json(user);
      })
      .catch(next);
  })

  .put('/', (req, res, next) => {
    const { body, account: { id } } = req;
    delete body.friends;
    delete body.pendingFriends;

    User.findByIdAndUpdate(id, body, updateOptions)
      .then(updated => res.json(updated))
      .catch(next);
  })

  .put('/friend-requests', (req, res, next) => {
    const { account: { id: userId }, body: { email } } = req;
    let friendId;
    Account.findOne({ email })
      .then(({ _id }) => {
        friendId = _id;
        if(friendId.toString() === userId) throw {
          status: 403,
          error: 'Cannot add yourself as a friend.'
        };
        return User.find({ _id: friendId, friends: userId })
          .count();
      })
      .then(count => {
        if(count) throw {
          status: 403,
          error: 'Cannot add someone who is already a friend.'
        };
        return User.findByIdAndUpdate(friendId, {
          $addToSet: { pendingFriends: userId }
        }, updateOptions);
      })
      .then(() => res.json({ requestReceived: true }))
      .catch(next);
  })

  .put('/friends/:id', (req, res, next) => {
    const { params: { id: friendId }, account: { id: userId } } = req;
    User.find({ _id: userId, pendingFriends: friendId })
      .count()
      .then(count => {
        if(!count) throw {
          status: 400,
          error: 'No pending friend request found.'
        };
        return Promise.all([
          User.findByIdAndUpdate(userId, {
            $addToSet: { friends: friendId },
            $pull: { pendingFriends: friendId }
          }, updateOptions),
          User.findByIdAndUpdate(friendId, {
            $addToSet: { friends: userId }
          }, updateOptions)
        ]);
      })
      .then(([user]) => res.json(user))
      .catch(next);
  })

  .get('/friends', (req, res, next) => {
    User.findById(req.account.id)
      .select('friends pendingFriends')
      .populate('friends', 'firstName lastName pictureUrl')
      .populate('pendingFriends', 'firstName lastName pictureUrl')
      .lean()
      .then(({ friends, pendingFriends }) => res.json({ friends, pendingFriends }))
      .catch(next);
  })

  .get('/friends/:id', (req, res, next) => {
    const { params: { id: friendId }, account: { id: userId } } = req;
    User.find({ _id: userId, friends: friendId })
      .count()
      .then(count => {
        if(!count) throw {
          status: 403,
          error: 'Not your friend!'
        };
        return Promise.all([
          User.findById(friendId)
            .lean(),
          Shareable.find({ owner: friendId })
            .lean()
        ]);
      })
      .then(([friend, friendShareables]) => {
        friend.shareables = friendShareables;
        res.json(friend);
      })
      .catch(next);
  })

  .post('/shareables', (req, res, next) => {
    const { body, account: { id } } = req;
    body.owner = id;
    Shareable.create(body)
      .then(shareable => res.json(shareable))
      .catch(next);
  })

  .get('/shareables', (req, res, next) => {
    Shareable.find({ owner: req.account.id })
      .lean()
      .then(shareables => res.json(shareables))
      .catch(next);
  })

  .put('/shareables/:id', (req, res, next) => {
    const { params: { id: shareableId }, account: { id: userId }, body } = req;
    Shareable.findOneAndUpdate({ _id: shareableId, owner: userId }, body, updateOptions)
      .then(found => {
        if(!found) throw {
          status: 400,
          error: 'You do not own a shareable with that ID.'
        };
        res.json(found);
      })
      .catch(next);   
  })

  .get('/feed', (req, res, next) => {
    const { id } = req.account;
    User.findById(id)
      .then(({ friends }) => {
        return Shareable.find({ owner: { $in: friends } }, { urgent: true })
          .populate('owner', 'firstName')
          .lean();
      })
      .then(shareables => res.json(shareables))
      .catch(next);
  })

  .delete('/shareables/:id', (req, res, next) => {
    const { params: { id: shareableId }, account: { id: userId } } = req; 
    Shareable.findOneAndRemove({ _id: shareableId, owner: userId })
      .then(found => {
        if(!found) throw {
          status: 400,
          error: 'You do not own a shareable with that ID.'
        };
        res.json({ deleted: true });
      })
      .catch(next);   
  })

  .delete('/friends/:id', (req, res, next) => {
    const { params: { id: friendId }, account: { id: userId } } = req;
    Promise.all([
      User.findOneAndUpdate({ _id: userId, friends: friendId }, {
        $pull: { friends: friendId }
      }, updateOptions),
      User.findOneAndUpdate({ _id: friendId, friends: userId }, {
        $pull: { friends: userId }
      }, updateOptions)
    ])
      .then(([you, friend]) => {
        if(!you || !friend) throw {
          status: 400,
          error: 'No friendship found.'
        };
        res.json({ deleted: true });
      })
      .catch(next);  
  });