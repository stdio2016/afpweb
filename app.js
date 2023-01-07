var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const MongoStore = require('connect-mongo');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var jianpuRouter = require('./routes/jianpu');
var qbshRouter = require('./routes/qbsh');
var pastQueriesRouter = require('./routes/pastQueries');
var songListRouter = require('./routes/songList');
var todoRouter = require('./routes/todo');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', process.env.TRUST_PROXY);

// set MIME type
express.static.mime.define({'application/wasm': ['wasm']});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    mongoUrl: process.env.MONGO_URL,
    dbName: process.env.MONGO_DB
  }),
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 600 * 1000 }
}));
app.use(fileUpload({
  useTempFiles : true,
  tempFileDir : '/tmp/'
}));

// remove trailing slash
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    var query = req.url.substring(req.path.length);
    var path = req.path;
    for (var i = path.length-1; i > 0; i--) {
      if (path[i] != '/') break;
    }
    return res.redirect(req.path.slice(0, i+1) + query);
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

// catch 404 and forward to error handler
app.use(function(req, res, next) {
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
