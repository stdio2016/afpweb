function createSVG(name, attr) {
	var elt = document.createElementNS("http://www.w3.org/2000/svg", name);
	for (var a in attr) {
		elt.setAttributeNS(null, a, attr[a]);
	}
	return elt;
}

function createSVGText(text, attr) {
	var elt = createSVG('text', attr);
	elt.textContent = text;
	return elt;
}

var baseSvg = null;
var textWidthCache = {};
function getTextWidth(text, fontSize) {
	if (text in textWidthCache) {
		return textWidthCache[text];
	}
	if (baseSvg == null) {
		baseSvg = createSVG('svg', {width: 0, height: 0});
		document.body.appendChild(baseSvg);
	}
	var elt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	baseSvg.appendChild(elt);
	elt.textContent = text;
	elt.style.fontSize = fontSize;
	var bbox = elt.getBBox();
	elt.remove();
	textWidthCache[text] = bbox.width;
	return bbox.width;
}

function Pitch(step, accidental, octave) {
	this.step = step;
	this.accidental = accidental;
	this.octave = octave;
}

Pitch.prototype.getWidth = function () {
	return this.accidental.length * 6 + 12;
};

Pitch.prototype.render = function (x, y) {
	var g = createSVG('g');
	var elt;
	var accid = this.accidental.length;
	var rect = createSVG('rect', {x:x-6, y:y-15, width: 12, height: 18, class:'play-mark'});
	g.appendChild(rect);
	if (this.accidental) {
		elt = createSVGText(this.accidental, {x:x-6, y:y-7, class:'accidental', textLength:accid*6});
		g.appendChild(elt);
	}
	elt = createSVGText(this.step, {x:x + Math.max(accid-0.7,0) * 3, y:y});
	g.appendChild(elt);
	return g;
}

function parsePitch(ctx) {
	var i = ctx.i;
	var ch = ctx.text[ctx.i];
	var sharp = '';
	if (ch == '#') {
		++ctx.i;
		sharp = '♯';
		if (ctx.text[ctx.i] == '#') {
			++ctx.i;
			sharp += '♯';
		}
	}
	else if (ch == 'n') {
		++ctx.i;
		sharp = '♮';
	}
	else if (ch == 'b') {
		++ctx.i;
		sharp = '♭';
		if (ctx.text[ctx.i] == 'b') {
			++ctx.i;
			sharp += '♭';
		}
	}
	var num = ctx.text[ctx.i];
	if ((num > '7' || num < '0') && num != '-') {
		ctx.i = i;
		return null;
	}
	ch = ctx.text[++ctx.i];
	var octave = 0;
	if (ch == '\'') while (ch == '\'') {
		++octave;
		ch = ctx.text[++ctx.i];
	}
	else if (ch == ',') while (ch == ',') {
		--octave;
		ch = ctx.text[++ctx.i];
	}
	return new Pitch(num, sharp, octave);
}

function Note(pitch, duration) {
	this.pitch = pitch;
	this.duration = duration;
	this.lyrics = '';
}

Note.prototype.getWidth = function () {
	var w = this.pitch.getWidth() * (1 + 0.5 * this.duration.dots);
	var dot = 2 - Math.pow(0.5, this.duration.dots);
	if (this.duration.type == 1) {
		w = Math.max(w, 15 * dot);
	}
	if (this.duration.type == 0) {
		w = Math.max(w, 30 * dot);
	}
	var wbase = w;
	if (this.lyrics != '') {
		w = Math.max(w, getTextWidth(this.lyrics)+2);
	}
	return w + wbase * (this.duration.mul - 1);
};

Note.prototype.render = function (x, y, connectLeft, connectRight) {
	var g = createSVG('g');
	var w = this.pitch.getWidth();
	var w2 = w;
	if (this.lyrics) {
		w = Math.max(w, getTextWidth(this.lyrics)+2);
	}
	var p_svg = this.pitch.render(x+w/2, y);
	g.appendChild(p_svg);
	this.note_svg = p_svg;
	for (var i = 0; i < this.pitch.octave; i++) {
		p_svg.appendChild(createSVG('circle', {cx: x+w/2, cy: y - 12 - 4 - 4*i, r: 1.5}));
	}
	for (var i = 0; i < -this.pitch.octave; i++) {
		p_svg.appendChild(createSVG('circle', {cx: x+w/2, cy: y + this.duration.type*3 + 4 + 4*i, r: 1.5}));
	}
	
	if (this.duration.mul > 1) {
		var off = x + Math.max(0, w-30);
		for (var i = 1; i < this.duration.mul; i++) {
			p_svg.appendChild(createSVG('rect', {x: off + i * 30 - 1, y:y-15, width: 12, height: 18, class:'play-mark'}));
			p_svg.appendChild(createSVGText('-', {x: off + i * 30 + 5, y: y}));
		}
	}
	var x1 = (w-w2)/2 + 1, x2 = (w+w2)/2 - 1;
	if (connectLeft) x1 = 0;
	if (connectRight) x2 = this.getWidth();
	for (var i = 0; i < this.duration.type; i++) {
		g.appendChild(createSVG('line', {x1: x+x1, y1: y+3+3*i, x2: x+x2, y2: y+3+3*i, stroke:'black'}));
	}
	for (var i = 0; i < this.duration.dots; i++) {
		p_svg.appendChild(createSVG('circle', {cx: x+(w+w2)/2+3 + i*4, cy: y - 6, r: 1.5}));
	}
	return g;
}

Note.prototype.renderLyrics = function (x, y) {
	var w = this.pitch.getWidth();
	if (this.lyrics) {
		w = Math.max(w, getTextWidth(this.lyrics)+2);
	}
	return createSVGText(this.lyrics, {x: x+w/2, y: y});
};

Note.prototype.getMaxY = function () {
	var y = this.duration.type*3 + 4*Math.max(0, -this.pitch.octave) + 4;
	if (this.lyrics != '') {
		y += 16;
	}
	return y;
};

function Duration(type, dots, mul=1) {
	this.type = type;
	this.dots = dots;
	this.mul = mul;
}

Duration.prototype.getBeat = function () {
	return Math.pow(0.5, this.type) * this.mul * (2 - Math.pow(0.5, this.dots));
};

function parseDuration(ctx) {
	var mul = 1;
	var type = 0;
	var ch = ctx.text[ctx.i];
	if (ch == '-') {
		while (ch == '-') {
			mul += 1;
			ch = ctx.text[++ctx.i];
		}
	}
	else {
		while (ch == '=') {
			type += 2;
			ch = ctx.text[++ctx.i];
		}
		if (ch == '_') {
			type += 1;
			ch = ctx.text[++ctx.i];
		}
	}
	var dots = 0;
	if (ctx.text[ctx.i] == '.') {
		dots = 1;
		++ctx.i;
		if (ctx.text[ctx.i] == '.') {
			dots = 2;
			++ctx.i;
		}
	}
	return new Duration(type, dots, mul);
}

function parseNote(ctx) {
	var pitch = parsePitch(ctx);
	if (!pitch) return null;
	var du = parseDuration(ctx);
	return new Note(pitch, du);
}

function Bar(value) {
	this.value = value;
}

Bar.prototype.render = function (x, y) {
	return createSVG('line', {x1: x+4, y1: y+3, x2: x+4, y2: y-17, stroke:'black'});
};

Bar.prototype.getWidth = function () {return 8;};

function parseBar (ctx) {
	var ch = ctx.text[ctx.i];
	if (ch == '|') {
		ch = ctx.text[++ctx.i];
		if (ch == '|' || ch == ']') {
			++ctx.i;
			return new Bar('|'+ch);
		}
		return new Bar('|');
	}
	return null;
}

function parseJianpu(txt, from, to) {
	var ctx = {text: txt, i: 0, score: [], lyrics: []};
	var meas = [];
	var sco = [meas];
	var nodeN = 0;
	var fromMeas = -1, toMeas = -1;
	var lines = txt.split('\n');
	for (var i = 0; i < lines.length; i++) {
		ctx.text = lines[i];
		if (lines[i].startsWith('L:')) {
			ctx.i = 2;
			parseLyrics(ctx);
		} else {
			ctx.i = 0;
			parseJianpuLine(ctx);
		}
	}
	var sco = ctx.score;
	for (var i = 0; i < sco.length; i++) {
		for (var j = 0; j < sco[i].length; j++) {
			var item = sco[i][j];
			if (item instanceof Note && item.pitch.step >= '1' && item.pitch.step <= '7') {
				if (nodeN >= from && nodeN < to) {
					item.mark = true;
					if (fromMeas == -1) fromMeas = i+1;
					toMeas = i+1;
				}
				item.lyrics = ctx.lyrics[nodeN] || '';
				nodeN++;
			}
		}
	}
	if (from != null) {
		sco = sco.slice(Math.max(fromMeas - 2, 0), toMeas + 1);
	}
	return sco;
}

function parseJianpuLine(ctx) {
	var meas = [];
	var sco = [meas];
	var prevI = 0;
	while (ctx.i < ctx.text.length) {
		var item;
		item = parseNote(ctx);
		if (!item) item = parseBar(ctx);

		if (item instanceof Bar) {
			meas.push(item);
			meas.src = ctx.text.substring(prevI, ctx.i);
			prevI = ctx.i;
			meas = [];
			sco.push(meas);
		}
		else if (item) {
			meas.push(item);
		}
		else ctx.i++;
	}
	for (var i = 0; i < sco.length; i++) {
		if (sco[i].length > 0) ctx.score.push(sco[i]);
	}
}

function parseLyrics(ctx) {
	var txt = ctx.text.slice(ctx.i);
	var tokens = txt.split(/(\s+|[-_*])/);
	var lyrics = [];
	for (var i = 0; i < tokens.length; i++) {
		if (i % 2 == 0) {
			// normal word
			lyrics.push(tokens[i]);
		} else if (tokens[i] == '*') {
			lyrics.push('*');
		} else if (tokens[i] == '_') {
			lyrics.push('_');
		} else if (tokens[i] == '-') {
			lyrics[lyrics.length-1] += '-';
		}
	}
	for (var i = 0; i < lyrics.length; i++) {
		if (lyrics[i] == '*') {
			ctx.lyrics.push('');
		} else if (lyrics[i] != '') {
			ctx.lyrics.push(lyrics[i]);
		}
	}
}

function renderJianpu(hack) {
	var t = hack.innerText;
	var from = hack.dataset.from;
	var to = hack.dataset.to;
	var qbshfrom = (hack.dataset.qbshfrom || 0) / 8;
	var qbshto = (hack.dataset.qbshto || -1) / 8;
	t = parseJianpu(t, from, to);
	hack.innerHTML = '';
	var play = document.createElement('button');
	play.type = 'button';
	play.textContent = '播放';
	play.classList.add('button', 'blue');
	var stop = document.createElement('button');
	stop.type = 'button';
	stop.textContent = '停止';
	stop.classList.add('button', 'red');
	hack.appendChild(play);
	hack.appendChild(stop);
	hack.appendChild(document.createElement('br'));
	var time = 0;
	var svgs = [];
	var maxH = 0;
	for (var i = 0; i < t.length; i++) {
		var meas = t[i];
		var img = createSVG('svg', {width: meas.length * 15, height:57});
		// accessibility
		var title = createSVG('title', {});
		title.textContent = meas.src;
		img.appendChild(title);
		var x = 0;
		var beat = 0;
		var connect = false;
		var y = 0;
		for (var j = 0; j < meas.length; j++) {
			if (meas[j] instanceof Note) {
				beat = beat + meas[j].duration.getBeat();
				var connectR = meas[j].duration.type > 0 && beat - Math.floor(beat) != 0
					&& meas[j+1] instanceof Note && meas[j+1].duration.type > 0;
				var render = meas[j].render(x, 34, connect, connectR);
				if (meas[j].mark) render.classList.add('matched');
				var nexttime = time + meas[j].duration.getBeat();
				if (qbshfrom < nexttime && time <= qbshto) render.classList.add('matched');
				time = nexttime;
				img.appendChild(render);
				connect = connectR;
				y = Math.max(y, meas[j].getMaxY());
			}
			else {
				img.appendChild(meas[j].render(x, 34));
			}
			x += meas[j].getWidth();
		}
		img.width.baseVal.value = x;
		img.height.baseVal.value = 34+y;
		svgs.push(img);
		maxH = Math.max(maxH, y);
		hack.appendChild(img);
	}
	// render lyrics after notes are settled
	for (var i = 0; i < t.length; i++) {
		var meas = t[i];
		var img = svgs[i];
		var x = 0;
		for (var j = 0; j < meas.length; j++) {
			if (meas[j] instanceof Note && meas[j].lyrics) {
				var elt = meas[j].renderLyrics(x, maxH+32);
				img.appendChild(elt);
			}
			x += meas[j].getWidth();
		}
		img.height.baseVal.value = 38+maxH;
	}
	var player = null;
	play.onclick = function () {
		if (player != null) player.stop();
		player = playJianpu(t);
	};
	stop.onclick = function () {
		if (player != null) player.stop();
		player = null;
	};
	hack.play = play.onclick;
	hack.stop = stop.onclick;
	return t;
}

if (typeof module !== 'undefined') {
	module.exports = {parseJianpu, Note};
}
