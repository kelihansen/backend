const router = require('express').Router();
const User = require('../models/User');
const Shareable = require('../models/Shareable');
const errorHandler = require('../utils/error-handler');
const ensureAuth = require('../auth/ensure-auth')();

module.exports = router
  // retrieve own profile
  // requires 'Authorization' in the header as a signed TOKEN
  // requires 'userId' in the header as the user's id
  .get('/profile', ensureAuth, (req, res) => {
    const userId = req.get('userId');

    User.findById(userId)
      .lean()
      .populate('shareables')
      .then(user => res.json(user))
      .catch(err => errorHandler(err, req, res));
  })

  // update profile
  .put('/profile', ensureAuth, (req, res) => {
    const userId = req.get('userId');

    return User.findByIdAndUpdate(userId, req.body, {new: true})
      .then(updated => res.json(updated))
      .catch(err => errorHandler(err, req, res));
  })

  // send someone a friend request
  // expects the EMAIL OF THE FRIEND who is receiving the request in the BODY OF THE REQUEST as email
  // expects ID OF THE USER in the BODY OF THE REQUEST as .id
  .put('/profile/friends/', ensureAuth, (req, res) => {
    const query = { email: req.body.email };
    return User.findOneAndUpdate(query, {
      $push: {pendingFriends: req.body.id}
    }, {new: true})
      .then(updated => res.json(updated))
      .catch(err => errorHandler(err, req, res));
  })

  // confirm a friend request
  // expects the ID OF THE FRIEND as the PARAMS.ID
  // expects the ID OF THE USER as the .id PROPERTY ON THE BODY
  .put('/profile/friends/:id/confirm', ensureAuth, (req, res) => {
    return User.findByIdAndUpdate(req.params.id, {
      $push: {friends: req.body.userId},
    }, {new: true})
      .then(() => {
        return User.findByIdAndUpdate(req.body.userId, {
          $push: {friends: req.params.id},
          $pull: {pendingFriends: req.params.id},
        }, {new: true})
          .then(updated => res.json(updated))
          .catch(err => errorHandler(err, req, res));  
      })
      .then(updated => res.json(updated))
      .catch(err => errorHandler(err, req, res));
  })

  // get all friends with minimal detail
  .get('/profile/friends', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    User.findById(userId)
      .populate('friends', 'firstName lastName pictureUrl')
      .lean()
      .then(body => res.json(body.friends))
      .catch(err => errorHandler(err, req, res));
  })

  // populate a single friend's profile
  // expects the FRIEND ID as THE PARAMATER :id
  // expects USER ID as a part of the HEADER AS 'userId'
  // returns an empty object if user is not friends with params.id profile
  .get('/profile/friends/:id', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    const friendId = req.params.id;
    User.findById(userId)
      .populate('friends')
      .then((body) => {
        body.friends.forEach((friend) => {
          if(friend._id.toString() === friendId) {
            return User.findById(friendId)
              .lean()
              .select('firstName lastName pictureUrl email contact callOrText availability shareables')            
              .then(user => res.json(user))
              .catch(err => errorHandler(err, req, res));
          }
        });
      })
      .catch(err => errorHandler(err, req, res));
  })

  // add a new Shareable
  .post('/profile/shareables', ensureAuth, (req, res) => {
    const shareable = req.body;
    const userId = req.get('userId');
    return new Shareable(shareable).save()
      .then(shareable => {
        const { _id } = shareable;
        return Promise.all([shareable, User.findByIdAndUpdate(userId, {
          $push: { shareables: _id }
        }, {new: true})]);
      })
      .then(([shareable]) => res.json(shareable))
      .catch(err => errorHandler(err, req, res));
  })

  // get all personal shareables
  .get('/profile/shareables', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    User.findById(userId)
      .populate('shareables')
      .lean()
      .then(body => res.json(body.shareables))
      .catch(err => errorHandler(err, req, res));
  })

  // update own shareable
  // expects an OBJECT with KEYS AND VALUES OF SHAREABLE TO BE UPDATED
  .put('/profile/shareables/:id', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    const shareableId = req.params.id;
    return User.findById(userId)
      .populate('shareables')
      .then((body) => {
        body.shareables.forEach((shareable) => {
          if(shareable._id.toString() === shareableId) {
            return Shareable.findByIdAndUpdate(req.params.id, req.body, {new: true})
              .then(updated => res.json(updated))
              .catch(err => errorHandler(err, req, res));                  
          }
        });
      });
  })

  // get all feed shareables
  // returns an ARRAY OF OBJECTS
  .get('/profile/feed', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    const feed = [];
    User.findById(userId)
      .populate({
        path: 'friends',
        populate: {
          path: 'shareables',
          select: 'confirmed date expiration groupSize name participants priority repeats type'
        }
      })
      .lean()
      .then(body => {
        body.friends.forEach((friend) => {
          friend.shareables.forEach((shareable) => {
            if(shareable.priority === 2
              && (shareable.type === 'giving' || shareable.type === 'requesting'))
            { feed.push(shareable); }
          });
        });
        res.json(feed);
      })        
      .catch(err => errorHandler(err, req, res));
  })

  // delete a shareable
  .delete('/profile/shareables/:id', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    const shareableId = req.params.id;
    return User.findById(userId)
      .populate('shareables')
      .then((body) => {
        body.shareables.forEach((shareable) => {
          if(shareable._id.toString() === shareableId) {
            Shareable.findByIdAndRemove(shareableId)
              .then(() => {
                return User.findByIdAndUpdate(userId, {
                  $pull:{ shareables: shareableId },
                }, {new: true});
              })
              .then(updated => res.json(updated))
              .catch(err => errorHandler(err, req, res));                  
          }
        });
      });
  })

  // delete a friend
  // expects the ID OF THE FRIEND as a PARAM
  // expects the ID OF THE USER as the id PROPERTY ON THE BODY
  .delete('/profile/friends/:id', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    const friendId = req.params.id;
    User.findById(userId)
      .populate('friends')
      .then((body) => {
        body.friends.forEach((friend) => {
          if(friend._id.toString() === friendId) {
            return User.findByIdAndUpdate(userId, {
              $pull:{ friends: friendId }
            })
              .then(() => {
                return User.findByIdAndUpdate(friendId, {
                  $pull:{ friends: userId }
                });
              });
          }
        });
      })
      .then(removed => res.json(removed))
      .catch(err => errorHandler(err, req, res));
  })

  // delete a profile
  .delete('/profile', ensureAuth, (req, res) => {
    const userId = req.get('userId');
    User.findByIdAndRemove(userId)
      .then(removed => res.json(removed))
      .catch(err => errorHandler(err, req, res));
  });