window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();
var audioStream = null;
var audioStreamNode = null;
// to workaround Safari recording glitch, I set bigger buffer
var intercept = audioCtx.createScriptProcessor(2048);
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
var yourRecording = document.getElementById('yourRecording');

var isHttps = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

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
  showResultByUrlHash();
}

function tryToGetRecorder() {
  var needs = {
    "audio": {
    }
  };

  function onSuccess(stream) {
    try {
      audioStream = stream;
      audioStreamNode = audioCtx.createMediaStreamSource(stream.clone());
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
        alert("您的瀏覽器不允許使用 UserMedia");
        break;
      case "NotAllowedError":
        alert("您不允許瀏覽器使用麥克風\n(您可以重新整理後再試一次)");
        break;
      case "OverconstrainedError":
        alert("您的裝置似乎沒有麥克風，或者您的瀏覽器無法支援麥克風");
        break;
      default:
        alert("發生錯誤: " + err);
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
    else if (!isHttps) {
      alert('本網頁需使用 HTTPS 安全連線方可使用麥克風進行搜尋');
    } else {
      alert("您的瀏覽器不支援錄音");
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
  ctx.fillStyle = 'black';
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
    // use rect, because lineTo looks ugly in Safari
    ctx.rect(x, h * (1 - y), 1, h * 2 * y);
  }
  ctx.fill();
  visualizeX = x;
  rafId = requestAnimationFrame(visualize);
}

function stopRecord() {
  if (recording) {
    cancelAnimationFrame(rafId);
    btnStop.disabled = true;
    recording = false;
    if (bufferPos < audioCtx.sampleRate*5) {
      alert('查詢太短! 請錄音至少5秒鐘');
      ended();
      return;
    }
    showProgress('編碼中', '25%');
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
  showProgress('上傳中', '50%');
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
      showProgress('上傳中', (50+percentComplete) + '%');
    };
  }
  xhr.onload = function () {
    if (xhr.status == 200) {
      console.log(xhr.response);
      showProgress('處理結果中', '100%');
      waitId = xhr.response;
      waitResult(xhr.response, +new Date());
    }
    else {
      alert('伺服器錯誤: ' + xhr.status + ' ' + xhr.statusText);
      ended();
    }
  };
  xhr.onerror = function () {
    alert('上傳失敗');
    ended();
  };
  xhr.send(formData);
}

function waitResult(id, startTime) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'qbsh/result/' + id);
  xhr.send();
  yourRecording.src = '../savedQueries/' + id + '.flac';
  xhr.onload = function () {
    if (xhr.status == 200) {
      try {
        queryResult = JSON.parse(xhr.response);
        console.log(queryResult);
        if (queryResult.progress == 100) {
          try {
            showResult(queryResult);
            location.hash = '#queryid=' + id;
            if (yourRecording.scrollIntoView) {
              yourRecording.scrollIntoView({behavior:'smooth'});
            } else {
              // your browser doesn't support scroll???
            }
          }
          catch (x) {
            alert('用戶端異常: ' + x);
            console.error(x);
          }
          ended();
        }
        else if (queryResult.progress == 'error') {
          alert('伺服器錯誤! 原因: ' + queryResult.reason);
          ended();
        }
        else {
          setTimeout(waitResult.bind(this, id, startTime), 100);
        }
      }
      catch (x) {
        alert('伺服器異常: ' + x);
        console.log(xhr.response);
        ended();
      }
    }
    else if (xhr.status == 404) {
      if (new Date() - startTime > 10000) {
        alert('伺服器回應逾時');
        ended();
      }
      else {
        setTimeout(waitResult.bind(this, id, startTime), 100);
      }
    }
    else {
      alert('伺服器錯誤: ' + xhr.status + ' ' + xhr.statusText);
      ended();
    }
  };
  xhr.onerror = function () {
    alert('伺服器已關閉!');
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
  while (table.rows.length > 0) {
    table.rows[0].remove();
  }
  for (var i = 0; i < songs.length; i++) {
    var row = table.insertRow(i);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var a = document.createElement('a');
    a.href = 'songList/' + songs[i].file + '#qbshfrom=' + songs[i].From + '&qbshto=' + songs[i].To;
    a.textContent = songs[i].name;
    cell1.appendChild(a);
    cell2.textContent = songs[i].singer;
    cell3.textContent = songs[i].score;
    cell3.style.textAlign = 'center';
  }
  var noResult = document.getElementById('noResult');
  var sopResult = document.getElementById('sopResult');
  if (songs.length == 0) {
    noResult.style.display = 'block';
    sopResult.style.display = 'none';
  } else {
    noResult.style.display = 'none';
    sopResult.style.display = 'block';
  }
}

Flac.on('ready', function(event){
  startup();
});

function uploadFile() {
  if (inFile.files.length > 0) {
    showProgress('上傳中', '50%');
    uploadWav(inFile.files[0], 'upload');
  }
  else alert('請選擇一個檔案!');
}

function setQueryTime() {
  var result = prompt('請輸入查詢長度的秒數: (5~20)', querySecs);
  var secs = parseInt(result);
  if (secs >= 5 && secs <= 20) querySecs = secs;
  else if (result != '' && result != null) {
    alert("輸入必須是 5 到 20 之間");
  }
}

function showResultByUrlHash() {
  var hash = location.hash;
  var match = hash.match(/#queryid=(\w+)/);
  if (match) {
    waitId = match[1];
    var xhr = new XMLHttpRequest();
    yourRecording.src = '../savedQueries/' + waitId + '.flac';
    xhr.open('GET', 'qbsh/result/' + waitId);
    xhr.send();
    xhr.onload = function () {
      if (xhr.status == 200) {
        queryResult = JSON.parse(xhr.response);
        showResult(queryResult);
      }
      else {
        console.log('Server error: ' + xhr.status + ' ' + xhr.statusText);
      }
    };
  }
}

addEventListener('hashchange', showResultByUrlHash);
