const express = require('express');
const app = express();
const morgan = require('morgan');
const errorHandler = require('./utils/error-handler');
const ensureAuth = require('./auth/ensure-auth')();

app.use(morgan('dev'));
app.use(express.static('./public'));
app.use(express.json());

const auth = require('./routes/auth');
const me = require('./routes/me');

app.use('/api/auth', auth);
app.use('/api/me', ensureAuth, me);

app.use((req, res) => {
  res.sendFile('index.html', { root: './public'} );
});

app.use(errorHandler());

module.exports = app;