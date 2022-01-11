window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();
var audioStream = null;
var audioStreamNode = null;
var intercept = audioCtx.createScriptProcessor();
var recording = false;
var querySecs = 10;
var buffer = new Float32Array(audioCtx.sampleRate * querySecs);
var canvas = document.querySelector('canvas.visualizer');
var bufferPos = 0;
var rafId;
var visualizeX = 0;
var wavFile = null;
var waitId = '';
var queryResult;

intercept.onaudioprocess = function (e) {
  if (recording) {
    var dat = e.inputBuffer.getChannelData(0);
    var pos = bufferPos;
    var nonzero = false;
    for (var i = 0; i < dat.length; i++) {
      buffer[pos] = dat[i];
      pos += 1;
      if (dat[i]) nonzero = true;
    }
    if (nonzero || bufferPos > 0) {
      bufferPos = pos;
    }
    if (bufferPos >= buffer.length) setTimeout(stopRecord, 0);
  }
};

intercept.connect(audioCtx.destination);

function startup() {
  btnRecord.disabled = false;
  btnRecord.onclick = startRecord;
  btnStop.disabled = true;
}

function tryToGetRecorder() {
  var needs = {
    "audio": {
    }
  };

  function onSuccess(stream) {
    try {
      audioStream = stream;
      audioStreamNode = audioCtx.createMediaStreamSource(stream);
      audioStreamNode.connect(intercept);
      startRecord();
    }
    catch (e) {
      alert(e);
    }
  }

  function onFailure(err) {
    switch (err.name) {
      case "SecurityError":
        alert("Your browser does not allow the use of UserMedia");
        break;
      case "NotAllowedError":
        alert("You don't allow browser to access microphone.\n(You can refresh this page and try again)");
        break;
      case "OverconstrainedError":
        alert("It seems that your device doesn't have a mic, or the browser just doesn't support it.");
        break;
      default:
        alert("The following error occured: " + err);
    }
  }

  navigator.mediaDevices.getUserMedia(needs).then(onSuccess, onFailure);
};

function startRecord() {
  audioCtx.resume();
  if (!audioStream) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      tryToGetRecorder();
    }
    else {
      alert("Your browser does not support audio recording");
    }
    return;
  }
  btnStop.disabled = false;
  btnStop.onclick = stopRecord;
  btnRecord.disabled = true;
  recording = true;
  bufferPos = 0;
  buffer = new Float32Array(audioCtx.sampleRate * querySecs);
  visualizeX = 0;
  rafId = requestAnimationFrame(visualize);

  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function visualize() {
  var ctx = canvas.getContext('2d');
  var h = canvas.height * 0.5;
  var w = canvas.width;
  ctx.beginPath();
  var x;
  for (x = visualizeX; x < w; x++) {
    var pos = Math.floor(buffer.length * x / w);
    var pos2 = Math.floor(buffer.length * (x+1) / w);
    if (pos2 > bufferPos) break;
    var y = 0;
    for (var i = pos; i < pos2; i++) {
      y = Math.max(y, Math.abs(buffer[i]));
    }
    ctx.moveTo(x, h * (1 - y));
    ctx.lineTo(x, h * (1 + y));
  }
  ctx.stroke();
  visualizeX = x;
  rafId = requestAnimationFrame(visualize);
}

function stopRecord() {
  if (recording) {
    cancelAnimationFrame(rafId);
    btnStop.disabled = true;
    recording = false;
    if (bufferPos < audioCtx.sampleRate*2) {
      alert('Query is too short! Please record at least 5 seconds');
      ended();
      return;
    }
    showProgress('Encoding', '25%');
    setTimeout(function () {
      try {
        encodeWav();
      }
      catch (x) {
        alert(x);
        ended();
      }
    }, 4);
  }
}

function showProgress(msg, percent) {
  var pro = document.querySelector('.progress');
  pro.style.visibility = 'visible';
  prom = document.getElementById('progressMessage');
  prom.textContent = msg;
  pc = document.querySelector('.progress-bar');
  pc.style.width = percent;
}

function encodeWav() {
  var sampleRate = audioCtx.sampleRate;
  var channels = 1;
  var bps = 16;
  var compression = 5;
  var verify = false;
  var blockSize = 0;
  var buf_length = Math.min(buffer.length, bufferPos);
  var flac_encoder = Flac.create_libflac_encoder(sampleRate, channels, bps, compression, buf_length, verify, blockSize);
  var result = [];

  function write_callback_fn(encodedData, bytes, samples, current_frame) {
    result.push(encodedData);
  }
  function metadata_callback_fn() {
    
  }
  Flac.init_encoder_stream(flac_encoder,
    write_callback_fn,    //required callback(s)
    metadata_callback_fn  //optional callback(s)
  );
  var buffer_i32 = new Int32Array(buf_length);
  var view = new DataView(buffer_i32.buffer);
  for (var i = 0; i < buf_length; i++) {
    view.setInt32(i*4, buffer[i] * 0x7fff, true);
  }
  Flac.FLAC__stream_encoder_process_interleaved(flac_encoder, buffer_i32, buf_length);
  Flac.FLAC__stream_encoder_finish(flac_encoder);
  Flac.FLAC__stream_encoder_delete(flac_encoder);
  wavFile = new File(result, 'blob.flac', {type:'audio/flac'});
  console.log(wavFile.size);
  showProgress('Uploading', '50%');
  uploadWav(wavFile);
}

function uploadWav(blob, queryType) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'qbsh/query');
  var formData = new FormData();
  formData.append('file', blob);
  if (queryType) formData.append('querytype', queryType);
  if(xhr.upload) {
    xhr.upload.onprogress = function (evt) {
      var percentComplete = Math.ceil((evt.loaded / evt.total) * 50);
      showProgress('Uploading', (50+percentComplete) + '%');
    };
  }
  xhr.onload = function () {
    if (xhr.status == 200) {
      console.log(xhr.response);
      showProgress('Processing result', '100%');
      waitId = xhr.response;
      waitResult(xhr.response, +new Date());
    }
    else {
      alert('Server error: ' + xhr.status + ' ' + xhr.statusText);
      ended();
    }
  };
  xhr.onerror = function () {
    alert('upload failed');
    ended();
  };
  xhr.send(formData);
}

function waitResult(id, startTime) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'queryResult/' + id);
  xhr.send();
  xhr.onload = function () {
    if (xhr.status == 200) {
      try {
        queryResult = JSON.parse(xhr.response);
        console.log(queryResult);
        if (queryResult.progress == 100) {
          try {
            showResult(queryResult);
            ended();
          }
          catch (x) {
            alert('client malfunction: ' + x);
            console.error(x);
          }
        }
        else if (queryResult.progress == 'error') {
          alert('Server error! Reason: ' + queryResult.reason);
          ended();
        }
        else {
          setTimeout(waitResult.bind(this, id, startTime), 100);
        }
      }
      catch (x) {
        alert('Server malfunction: ' + x);
        console.log(xhr.response);
        ended();
      }
    }
    else if (xhr.status == 404) {
      if (new Date() - startTime > 10000) {
        alert('Server timeout');
        ended();
      }
      else {
        setTimeout(waitResult.bind(this, id, startTime), 100);
      }
    }
    else {
      alert('Server error: ' + xhr.status + ' ' + xhr.statusText);
      ended();
    }
  };
  xhr.onerror = function () {
    alert('Server is down!');
    ended();
  };
}

function ended() {
  showProgress('', '0%');
  btnRecord.disabled = false;
}

function showResult(json) {
  var songs = json.songs;
  var table = document.querySelector('.query-results table tbody');
  console.log(table);
  while (table.rows.length > 0) {
    table.rows[0].remove();
  }
  for (var i = 0; i < songs.length; i++) {
    var row = table.insertRow(i);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    cell1.textContent = songs[i].name;
    cell2.textContent = songs[i].score;
    cell2.style.textAlign = 'center';
    var audio = new Audio();
    audio.preload = 'none';
    if (songs[i].file)
      audio.src = songs[i].file;
    else
      audio.src = '/finddup/audio/' + songs[i].name;
    if (songs[i].time)
      audio.currentTime = songs[i].time;
    audio.controls = true;
    cell3.append(audio);
  }
}

Flac.on('ready', function(event){
  startup();
});

function uploadFile() {
  if (inFile.files.length > 0) {
    showProgress('Uploading', '50%');
    uploadWav(inFile.files[0], 'upload');
  }
  else alert('Please choose a file!');
}

function setQueryTime() {
  var result = prompt('Enter query length in seconds: (5~20)', querySecs);
  var secs = parseInt(result);
  if (secs >= 5 && secs <= 20) querySecs = secs;
  else if (result != '' && result != null) {
    alert("Input must be between 5 and 20");
  }
}