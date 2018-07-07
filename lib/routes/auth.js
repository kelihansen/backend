const router = require('express').Router();
const Account = require('../models/Account');
const User = require('../models/User');
const ensureAuth = require('../auth/ensure-auth')();
const { sign } = require('../auth/token-service');

function hasEmailAndPassword(req, res, next) {
  const user = req.body;
  if(!user || !user.email || !user.password) {
    return next({
      code: 400,
      error: 'Name, email, and password must be provided'
    });
  }
  next();
}

router
  .get('/verify', ensureAuth, (req, res) => {
    res.json({ verified: true });
  })

  .post('/signup', hasEmailAndPassword, (req, res, next) => {
    const { email, password, firstName, lastName } = req.body;
    delete req.body.password;

    Account.find({ email })
      .count()
      .then(count => {
        if (count) { throw { status: 400, error: 'Email already in use.' }; }
        const account = new Account({ email });
        account.generateHash(password);
        return account.save();
      })
      .then(account => {
        const user = new User({ firstName, lastName, _id: account._id });
        return [account, user.save()];
      })
      .then(([account, user]) => {
        res.json({ token: sign(account), name: user.firstName });
      })
      .catch(next);
  })

  .post('/signin', (req, res, next) => {
    const { email, password } = req.body;
    delete req.body.password;

    Account.findOne({ email })
      .then(account => {
        if(!account || !account.comparePassword(password)) throw {
          status: 401,
          error: 'Invalid email or password.'
        };
        const token = sign(account);
        return Promise.all([token, User.findOne({ _id: account._id })]);
      })
      .then(([token, user]) => {
        res.json({ token, name: user.firstName });
      }) 
      .catch(next);
  });

module.exports = router;