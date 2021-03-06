import fs from 'fs';
import test from 'ava';
import frame from '../lib/frame';

const DEFAULT_IMAGE = fs.readFileSync('./test/assets/Solid_black.jpg');
const DEFAULT_TS = new Date().getTime();

test('getTimeStamp returns the right timestamps', t => {
	const f = frame.create(DEFAULT_IMAGE, DEFAULT_TS);
	t.is(f.getTimeStamp(), DEFAULT_TS);
});

test('getHistogram get the right histogram for black pixel', async t => {
	const res = await frame.create(DEFAULT_IMAGE, DEFAULT_TS).getHistogram();

	for (const x of res) {
		t.true(x[0] > 0, 'Lowest pixel doesn\'t match with black');
	}
});

test('getHistogram should not take into account white pixels', async t => {
	const imgBuff = fs.readFileSync('./test/assets/grayscale.jpg');
	const res = await frame.create(imgBuff, DEFAULT_TS).getHistogram();

	for (const x of res) {
		t.true(x[255] === 0, 'Highest pixel is not white');
	}
});

test('getHistogram should take into account brightly colored pixels', async t => {
	const imgBuff = fs.readFileSync('./test/assets/rainbow.jpg');
	const res = await frame.create(imgBuff, DEFAULT_TS).getHistogram();

	for (const x of res) {
		t.true(x[255] > 0);
	}
});

test('frames can set and retrieve progress', t => {
	const PROGRESS = 43;
	const f = frame.create(DEFAULT_IMAGE, DEFAULT_TS);

	f.setProgress(PROGRESS);
	t.is(f.getProgress(), PROGRESS);
});

test('extract frames from timeline should return a data object with an array of frames', async t => {
	const data = await frame.extractFramesFromTimeline('./test/assets/nyt.json');
	t.is(data.startTs, 282644630.041, 'data.startTs doesn\'t match expected value');
	t.truthy(data.endTs, 'data.endTs doesn\'t exist');
	t.true(Array.isArray(data.frames), 'Frames is not an array');
});

test('extract frames should support json', async t => {
	const trace = JSON.parse(fs.readFileSync('./test/assets/progressive-app.json', 'utf-8'));
	const data = await frame.extractFramesFromTimeline(trace);
	t.is(data.startTs, 103204916.772, 'data.startTs doesn\'t match expected value');
	t.true(Array.isArray(data.frames), 'Frames is not an array');
	t.is(data.frames.length, 6, 'Number of frames is incorrect');
});

test('extract frames should drop duplicates', async t => {
	const trace = {traceEvents: []};
	const duplicateImage = fs.readFileSync('./test/assets/frameA.jpg').toString('base64');
	for (let i = 0; i < 1000; i++) {
		trace.traceEvents.push({
			cat: 'disabled-by-default-devtools.screenshot',
			ts: i * 1000,
			args: {snapshot: duplicateImage}
		});
	}

	const newImage = fs.readFileSync('./test/assets/frameC.jpg').toString('base64');
	trace.traceEvents.push({
		cat: 'disabled-by-default-devtools.screenshot',
		ts: 1001 * 1000,
		args: {snapshot: newImage}
	});

	const data = await frame.extractFramesFromTimeline(trace);
	t.true(Array.isArray(data.frames), 'Frames is not an array');
	t.is(data.frames.length, 3, 'Number of frames is incorrect');
});

test('extract frames from timeline supports options', async t => {
	const data = await frame.extractFramesFromTimeline('./test/assets/progressive-app.json', {timeOrigin: 103206183179});
	t.is(data.startTs, 103206183.179, 'data.startTs doesn\'t match supplied timeOrigin value');
	t.truthy(data.endTs, 'data.endTs doesn\'t exist');
	t.true(Array.isArray(data.frames), 'Frames is not an array');
	t.is(data.frames.length, 4, 'Frames were not filtered');
});
