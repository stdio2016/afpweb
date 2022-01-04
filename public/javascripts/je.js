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
	return w * this.duration.mul;
};

Note.prototype.render = function (x, y, connectLeft, connectRight) {
	var g = createSVG('g');
	var w = this.pitch.getWidth();
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
		for (var i = 1; i < this.duration.mul; i++) {
			p_svg.appendChild(createSVGText('-', {x: x + i * 30 + 5, y: y}));
		}
	}
	var x1 = 1, x2 = w - 1;
	if (connectLeft) x1 = 0;
	if (connectRight) x2 = this.getWidth();
	for (var i = 0; i < this.duration.type; i++) {
		g.appendChild(createSVG('line', {x1: x+x1, y1: y+3+3*i, x2: x+x2, y2: y+3+3*i, stroke:'black'}));
	}
	for (var i = 0; i < this.duration.dots; i++) {
		p_svg.appendChild(createSVG('circle', {cx: x+w+3 + i*4, cy: y - 6, r: 1.5}));
	}
	return g;
}

Note.prototype.getMaxY = function () {
	return this.duration.type*3 + 4*Math.max(0, -this.pitch.octave) + 4;
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
	var ctx = {text: txt, i: 0};
	var meas = [];
	var sco = [meas];
	var nodeN = 0;
	var fromMeas = -1, toMeas = -1;
	while (ctx.i < txt.length) {
		var item;
		item = parseNote(ctx);
		if (!item) item = parseBar(ctx);

		if (item instanceof Bar) {
			meas.push(item);
			meas = [];
			sco.push(meas);
		}
		else if (item) {
			if (item instanceof Note && item.pitch.step >= '1' && item.pitch.step <= '7') {
				if (nodeN >= from && nodeN < to) {
					item.mark = true;
					if (fromMeas == -1) fromMeas = sco.length;
					toMeas = sco.length;
				}
				nodeN++;
			}
			meas.push(item);
		}
		else ctx.i++;
	}
	if (from != null) {
		sco = sco.slice(Math.max(fromMeas - 2, 0), toMeas + 1);
	}
	return sco;
}

function renderJianpu(hack) {
	var t = hack.innerText;
	var from = hack.dataset.from;
	var to = hack.dataset.to;
	t = parseJianpu(t, from, to);
	hack.innerHTML = '';
	for (var i = 0; i < t.length; i++) {
		var meas = t[i];
		var img = createSVG('svg', {width: meas.length * 15, height:57});
		var x = 0;
		var beat = 0;
		var connect = false;
		var y = 0;
		for (var j = 0; j < meas.length; j++) {
			if (meas[j] instanceof Note) {
				beat = beat + meas[j].duration.getBeat();
				var connectR = beat - Math.floor(beat) != 0
				var render = meas[j].render(x, 34, connect, connectR);
				if (meas[j].mark) render.classList.add('playing');
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
		hack.appendChild(img);
	}
	return t;
}
