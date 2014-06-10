var Upgrader = require('../upgrader');

var upgrader = Upgrader({
	url: 'http://wiky.github.io/node.upgrader/for-test/demo.zip',
	dest: './download/file/path',
	version: {
		local: './download/file/path/version.json',
		remote: 'http://wiky.github.io/node.upgrader/for-test/version.json'
	}
});

upgrader.check(function(local, remote) {
	if (remote) {
		if ((local && this.greaterThan(remote.version, local.version)) || !local) {
			this.download(function() {
				this.extract(true);
			});
		} else {
			console.log('Up to date');
		}
	} else {
		console.log('Always update');
		this.download(function() {
			this.extract(true);
		});
	}
});

upgrader.on('download', function(total) {
	console.log('start download', total);
});

upgrader.on('downloading', function(total, current) {
	console.log('process:', parseInt((current / total) * 10000, 10) / 100 + '%');
});

upgrader.on('extract', function() {
	console.log('start extract');
});

upgrader.on('extracted', function() {
	console.log('extracted');
});