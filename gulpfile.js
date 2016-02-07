var path = require('path'),
    fs = require('fs');

var gulp = require('gulp'),
	stylus = require('gulp-stylus'),
	uglify = require('gulp-uglify'),
	jade = require('gulp-jade-php'),
	autoprefixer = require('gulp-autoprefixer'),
	coffee = require('gulp-coffee'),
	replace = require('gulp-replace'),
	gulpif = require('gulp-if'),
	riot = require('gulp-riot'),
	concat = require('gulp-concat'),
	rename = require("gulp-rename");

var conf = require('./config.json');

var isRelease = false;
var isWatch = false;

gulp.task('default', conf["default_task"]);

gulp.task('release', function() {
	isRelease = true;
	gulp.start('default');
});

gulp.task('dump', function() {

	var date = new Date();
	var current_data = dateFormat(date, "%d_%m_%Y_%H_%M");

	gulp
		.src(["./**/*", "!./dump/**/*", "!./dest/**/*", "!./node_modules/**/*"])
		.pipe(gulp.dest("./dump/dump_"+conf["name"]+"_"+current_data+"/"));
});

gulp.task('clear-debug', function() {
	rmInRecursive(path.join(conf["debug"], conf["name"], conf["js"]));
	rmInRecursive(path.join(conf["debug"], conf["name"], conf["tag"]));
	rmInRecursive(path.join(conf["debug"], conf["name"], conf["css"]));
	rmInRecursive(path.join(conf["debug"], conf["name"]));
});

gulp.task('clear-release', function() {
	rmInRecursive(path.join(conf["release"], conf["name"], conf["js"]));
	rmInRecursive(path.join(conf["release"], conf["name"], conf["tag"]));
	rmInRecursive(path.join(conf["release"], conf["name"], conf["css"]));
	rmInRecursive(path.join(conf["release"], conf["name"]));
});

gulp.task('clear-all', function() {
	gulp.start('clear-debug');
	gulp.start('clear-release');
});

gulp.task('clear', function() {
	gulp.start('clear-debug');
});

gulp.task('reinit', function() {
	rmRecursive(".git");
	gulp.start('init');
});

gulp.task('watch', function() {
	isWatch = true;

	gulp.watch([conf["jade"], conf["jade-incl"]], ['jade']);
	gulp.watch([conf["php"]], ['php']);
	gulp.watch([conf["coffee"]], ['js']);
	gulp.watch([conf["styl"]], ['css']);
	gulp.watch([conf["copy"]], ['copy']);
	gulp.watch([conf["riot"]], ['riot']);
});

gulp.task('init', function(){
	
	var init = require('./init.json');
	
	for(i in init) {
		if (i == "folders")
			initCreateFolders(init[i], ".");
		if (i == "files")
			initCreateFiles(init[i]);
	}

});	

gulp.task('js', function() {
	var path_js = path.join(conf["debug"], conf["name"], conf["js"]);
	
	if (isRelease)
		path_js = path.join(conf["release"], conf["name"], conf["js"]);

	var to_single_file = conf.hasOwnProperty("coffee_all");

	gulp
		.src(conf["coffee"])
		.pipe(coffee(conf.coffee_config))
		.pipe(uglify({compress:isRelease}))
		.pipe(replace(/<<MODNAME>>/g, conf["name"]))
		.pipe(rename(function (path) {
			path.basename = path.basename.replace("__modname", conf["name"]);
		}))
		.pipe(gulpif(to_single_file, concat(to_single_file ? conf["coffee_all"] : "__all.js")))
		.pipe(gulpif(isRelease, add_head_banner("js")))
		.pipe(gulp.dest(path_js));

});

gulp.task("riot", function() {
	var path_riot = path.join(conf["debug"], conf["name"], conf["tag"]);
	
	if (isRelease)
		path_riot = path.join(conf["release"], conf["name"], conf["tag"]);

	var to_single_file = conf.hasOwnProperty("riot_all");

	gulp
		.src(conf["riot"])
		.pipe(riot({compact:isRelease}))
		.pipe(replace(/<<MODNAME>>/g, conf["name"]))
		.pipe(rename(function (path) {
			path.basename = path.basename.replace("__modname", conf["name"]);
		}))
		.pipe(gulpif(to_single_file, concat(to_single_file ? conf["riot_all"] : "__tags.js")))
		.pipe(gulpif(isRelease, add_head_banner("js")))
		.pipe(gulp.dest(path_riot));
});

gulp.task('css', function() {
	var path_css = path.join(conf["debug"], conf["name"], conf["css"]);
	
	if (isRelease)
		path_css = path.join(conf["release"], conf["name"], conf["css"]);

	var to_single_file = conf.hasOwnProperty("styl_all");

	gulp
		.src(conf["styl"])
		.pipe(stylus({compress:isRelease}))
		.pipe(autoprefixer({browsers: ['last 2 versions'], cascade: false}))
		.pipe(gulpif(to_single_file, concat(to_single_file ? conf["styl_all"] : "__style.css")))
		.pipe(gulpif(isRelease, add_head_banner("css")))
		.pipe(gulp.dest(path_css));

});

gulp.task('jade', function() {
	var vars_locals = {'conf':conf};

	var path_jade = path.join(conf["debug"], conf["name"]);
	if (isRelease)
		path_jade = path.join(conf["release"], conf["name"]);

	gulp
		.src(conf["jade"])
		.pipe(jade({
			locals: vars_locals
		}))
		.pipe(replace(/<<MODNAME>>/g, conf["name"]))
		.pipe(rename(function (path) {
			path.basename = path.basename.replace("__modname", conf["name"]);
		}))
		.pipe(gulpif(isRelease, add_head_banner("php")))
		.pipe(gulp.dest(path_jade));

});

gulp.task('php', function() {

	var path_php = path.join(conf["debug"], conf["name"]);

	if (isRelease)
		path_php = path.join(conf["release"], conf["name"]);

	gulp
		.src(conf["php"])
		.pipe(gulpif(conf["support_cms"]["drupal"], drupal_filter()))
		.pipe(replace(/<<MODNAME>>/g, conf["name"]))
		.pipe(rename(function (p) {
			p.basename = p.basename.replace("__modname", conf["name"]);
		}))
		.pipe(gulp.dest(path_php));

});

gulp.task('copy', function() {
	var path_copy = path.join(conf["debug"], conf["name"]);
	
	if (isRelease)
		path_copy = path.join(conf["release"], conf["name"]);

	gulp
		.src(conf["copy"])
		.pipe(rename(function (path) {
			path.basename = path.basename.replace("__modname", conf["name"]);
		}))
		.pipe(gulp.dest(path_copy));
});

/*
	    ____  __            _     
	   / __ \/ /_  ______ _(_)___ 
	  / /_/ / / / / / __ `/ / __ \
	 / ____/ / /_/ / /_/ / / / / /
	/_/   /_/\__,_/\__, /_/_/ /_/ 
	              /____/          
*/

function add_head_banner(file_type) {
	function transform(file, cb) {
		if (conf["use_banner"]) {
			var content = String(file.contents);
			
			var start_comm = "";
			var end_comm = "";
			
			if (["css", "style", "js", "script"].indexOf(file_type) > -1) {
				start_comm = "/*\n";
				end_comm = "\n*/\n";
			}

			if (["php"].indexOf(file_type) > -1) {
				start_comm = "<?php\n/*\n";
				end_comm = "\n*/\n?>\n";
			}

			var bannder = start_comm + conf.banner.join("\n") + end_comm;
			bannder = bannder.replace(/<<MODNAME>>/g, conf.name);
			bannder = bannder.replace(/<<MODESC>>/g, conf.desc);
			bannder = bannder.replace(/<<MODLIC>>/g, conf.license);
			bannder = bannder.replace(/<<MODVERS>>/g, conf.version);
			bannder = bannder.replace(/<<DATE_TIME>>/g, dateFormat(new Date(), "%d.%m.%Y %H:%M"));

			file.contents = new Buffer(bannder + content);
		}
		cb(null, file);
	}

	return require('event-stream').map(transform);
}

function drupal_filter(file_type) {
	function transform(file, cb) {
		var content = String(file.contents);

		content = content.replace(/function\s+__hook_/g, "function " + conf["name"] + "_");

		file.contents = new Buffer(content);

		cb(null, file);
	}
	return require('event-stream').map(transform);
}


/*
	    ____  __  ________
	   / __ \/  |/  /__  /
	  / / / / /|_/ /  / / 
	 / /_/ / /  / /  / /__
	/_____/_/  /_/  /____/
	                      
*/

function rmInRecursive(current_dir)
{
	var files = [];
	if( fs.existsSync(current_dir) ) {
		files = fs.readdirSync(current_dir);
		files.forEach(function(file,index){
			var curPath = current_dir + "/" + file;
			if(fs.lstatSync(curPath).isDirectory()) {
				rmInRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
	}
}

function rmRecursive(current_dir)
{
	var files = [];
	if( fs.existsSync(current_dir) ) {
		files = fs.readdirSync(current_dir);
		files.forEach(function(file,index){
			var curPath = current_dir + "/" + file;
			if(fs.lstatSync(curPath).isDirectory()) {
				rmRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(current_dir);
	}
}

function initCreateFolders(folders, current)
{
	if (current == ".") current = __dirname;
	for (i in folders) {
		var folderName = "";
		var subFolders = [];
		if (typeof folders[i] === 'object') {
			folderName = folders[i].name;
			if (folders[i].folders != undefined && folders[i].folders instanceof Array)
				subFolders = folders[i].folders;
		} else {
			folderName = folders[i];
		}
		var folder = path.join(current, folderName);
		if (!fs.existsSync(folder))
			fs.mkdirSync(folder);
		if (subFolders.length > 0)
			initCreateFolders(subFolders, folder);
	}
}

function initCreateFiles(files)
{
	for (i in files) {
		var fileName = files[i];
		var file = path.join(__dirname, fileName);
		if (!fs.existsSync(file))
			fs.writeFileSync(file, "", 'utf8');
	}

}

function dateFormat (date, fstr, utc) {
  utc = utc ? 'getUTC' : 'get';
  return fstr.replace (/%[YmdHMS]/g, function (m) {
    switch (m) {
    case '%Y': return date[utc + 'FullYear'] ();
    case '%m': m = 1 + date[utc + 'Month'] (); break;
    case '%d': m = date[utc + 'Date'] (); break;
    case '%H': m = date[utc + 'Hours'] (); break;
    case '%M': m = date[utc + 'Minutes'] (); break;
    case '%S': m = date[utc + 'Seconds'] (); break;
    default: return m.slice (1);
    }
    return ('0' + m).slice (-2);
  });
}