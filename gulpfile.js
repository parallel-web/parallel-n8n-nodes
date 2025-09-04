const path = require('path');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

function copyIcons() {
	const credSource = path.resolve('**', '*.{png,svg}');
	const credDestination = path.resolve('dist');

	return src(credSource).pipe(dest(credDestination));
}
