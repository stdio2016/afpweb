var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const i18n = require('i18n');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var jianpuRouter = require('./routes/jianpu');
var qbshRouter = require('./routes/qbsh');
var pastQueriesRouter = require('./routes/pastQueries');
var songListRouter = require('./routes/songList');
var todoRouter = require('./routes/todo');
var clientPromise = require('./mongo/mongoConnect').client;
var dbPromise = require('./mongo/mongoConnect').db;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', process.env.TRUST_PROXY);

// set MIME type
express.static.mime.define({'application/wasm': ['wasm']});

i18n.configure({
  locales: ['en', 'zh-tw'],
  fallbacks: {
    'zh-*': 'zh-tw',
  },
  directory: path.join(__dirname, 'locales'),
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    clientPromise,
    dbName: process.env.MONGO_DB
  }),
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  }
}));
app.use(i18n.init);
app.use(fileUpload({
  useTempFiles : true,
  tempFileDir : '/tmp/'
}));

app.use((req, res, next) => {
  // locale detection
  res.locals.optLocale = '';
  var part = req.url.match(/^\/(zh-tw|en)(\/.*)/);
  if (part && ['en', 'zh-tw'].includes(part[1])) {
    res.setLocale(part[1]);
    req.url = part[2];
    res.locals.optLocale = part[1];
  }
  // remove trailing slash
  var reqpath = req.path;
  if (req.path.length > 1 && req.path.endsWith('/')) {
    var query = req.url.substring(req.path.length);
    for (var i = reqpath.length-1; i > 0; i--) {
      if (reqpath[i] != '/') break;
    }
    return res.redirect(req.path.slice(0, i+1) + query);
  }
  res.locals.pagelink = req.url;
  // bot detection
  var ua = req.headers['user-agent'] || '';
  if (/[Bb]ot\b|CensysInspect/.test(ua)) {
    res.locals.bot = true;
  } else if (ua.startsWith('Mozilla/5.0')) {
    res.locals.bot = false;
  } else {
    res.locals.bot = true;
  }
  if (req.method == 'GET' && !res.locals.bot) {
    // TODO: better hit counter
    dbPromise.then(db => {
      db.collection('hitcount').updateOne(
        {_id: reqpath},
        {$inc: {views: 1}},
        {upsert: true},
      );
    });
  }
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/jianpu', jianpuRouter);
app.use('/qbsh', qbshRouter);
app.use('/pastQueries', pastQueriesRouter);
app.use('/songList', songListRouter);
app.use('/TODO', todoRouter);
app.use('/youplayed', function (req, res, next) {
  res.status(200).send('OK');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  if (req.path.endsWith('.php')) {
    res.status(403).render('forbidden');
    return;
  }
  res.status(404);
  res.render('notFound');
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
