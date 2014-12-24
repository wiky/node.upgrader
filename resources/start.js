var fs = require('fs'),
	nodePath = require('path'),
	Upgrader = require('node.upgrader'),
	APP_DATA_PATH = process.env.APPDATA;

function start(appPath, pagePath) {
	var win = global.gui.Window.get(),
		manifest = global.gui.App.manifest;
	process.chdir(appPath);
	win.setResizable(true);
	win.resizeTo(manifest.window.width, manifest.window.height);
	window.location.href = pagePath;
}

module.exports = function() {
	var win = global.gui.Window.get(),
		manifest = global.gui.App.manifest,
		appPath = nodePath.join(manifest.appDataPath || APP_DATA_PATH, manifest.name),
		pagePath = nodePath.join(appPath, manifest.main),
		config = manifest.upgrader,
		upgrader;
	if (fs.existsSync(pagePath) && !config.alwaysUpdate) {
		start(appPath, pagePath);
		return;
	}

	window.document.getElementById('main').style.display = 'block';
	win.setResizable(false);
	win.resizeTo(config.width, config.height);
	if (!fs.existsSync(appPath)) {
		fs.mkdirSync(appPath);
	}
	upgrader = Upgrader({
		url: config.url,
		version: {
			local: nodePath.join(appPath, config.local),
			remote: config.remote
		},
		dest: appPath
	});

	upgrader.check(function(local, remote) {
		if (remote && !config.alwaysUpdate) {
			if ((local && this.greaterThan(remote.version, local.version)) || !local) {
				this.download(function() {
					this.extract(true, function() {
						start(appPath, pagePath);
					});
				});
			} else {
				console.log('Up to date');
			}
		} else {
			console.log('Always update');
			this.download(function() {
				this.extract(true, function() {
					start(appPath, pagePath);
				});
			});
		}
	});

	upgrader.on('download', function(total) {
		console.log('start download', total);
	});

	upgrader.on('downloading', function(total, current) {
		console.log(parseInt((current / total) * 10000 * 0.9, 10) / 100 + '%');
		window.document.getElementById('bar').style.width = parseInt((current / total) * 10000 * 0.9, 10) / 100 + '%';
	});

	upgrader.on('extract', function() {
		console.log('start extract');
		window.document.getElementById('bar').style.width = '95%';
	});

	upgrader.on('extracted', function() {
		console.log('extracted');
		window.document.getElementById('bar').style.width = '100%';
	});

};