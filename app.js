var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var jianpuRouter = require('./routes/jianpu');
var qbshRouter = require('./routes/qbsh');
var pastQueriesRouter = require('./routes/pastQueries');
var songListRouter = require('./routes/songList');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// set MIME type
express.static.mime.define({'application/wasm': ['wasm']});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
  useTempFiles : true,
  tempFileDir : '/tmp/'
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/jianpu', jianpuRouter);
app.use('/qbsh', qbshRouter);
app.use('/pastQueries', pastQueriesRouter);
app.use('/songList', songListRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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
