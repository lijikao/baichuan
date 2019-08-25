//模板工具
const gulp = require('gulp');
const del = require('del');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const ejs = require('gulp-ejs');
const spritesmith = require('gulp.spritesmith');
const merge = require('merge-stream');
const less = require('gulp-less');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const order = require('gulp-order');
const iconfont = require('gulp-iconfont');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const fs = require('fs');
const browserSync = require('browser-sync').create();   // 静态服务器
const reload = browserSync.reload;


/*
html模板引擎
 */
gulp.task('clean:ejs', function () {
    return del(['build/**/*.html', '!build/resources/**', '!build/**/_*.html']);
});


gulp.task('ejs', ['clean:ejs'], function () {
    return gulp.src(['src/**/*.{html,ejs}', '!src/**/_*.{html,ejs}', '!src/resources/**'])
        .pipe(plumber({
            errorHandler: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe(ejs({},{}, {ext: '.html'}))
        .pipe(gulp.dest('build'))
});

/*
less
 */
gulp.task('clean:less', function () {
    return del(['build/resources/css/**'])
});
gulp.task('less', ['clean:less'], compileLess);

//依赖sprite的Less
gulp.task('sprite-less', ['clean:less', 'sprite'], compileLess);
//依赖所有其他的less（注释掉字体图标的功能）
gulp.task('before-less', ['clean:less', /*'iconfont',*/'sprite'], compileLess);

//编译less方法
function compileLess() {
    return gulp.src(['src/resources/less/**/*.less', '!src/resources/less/**/_*.less'])
        .pipe(plumber({
            errorHandler: notify.onError('Error:<%= error.message %>')
        }))
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(autoprefixer({
            browsers: ['last 2 versions', 'ie >= 9']
        }))
        .pipe(concat('index.css'))
        .pipe(sourcemaps.write('../../../_map/css'))
        .pipe(gulp.dest('build/resources/css/'))
}

/*
合并js
 */
gulp.task('concatjs', function () {
    var orderConfig = require('./_config/concat_order');
    return gulp.src(['src/js/common/**/*.js'])
        .pipe(sourcemaps.init())
        .pipe(order(orderConfig))
        .pipe(concat('index.js'))
        .pipe(sourcemaps.write('../../_map/js/common/'))
        .pipe(gulp.dest('build/js/'))
})


//图标字体
gulp.task('iconfont', function () {
    return gulp.src(['src/resources/fontIcon/*.svg'])
        .pipe(iconfont({
            fontName: 'iconFont-solution',
            prependUnicode: false,
            formats: ['ttf', 'eot', 'woff2', 'woff', 'svg'],
            normalize: true,
            fontHeight: 1001
        }))
        .on('glyphs', function (glyphs, options) {
            var newGlyphs = glyphs.map(function (item) {
                return {
                    name: item.name.replace(/\s+/g, '-'),
                    unicode: item.unicode[0].charCodeAt(0).toString(16)
                }
            });


            //输出less文件
            var lessStream = gulp.src(['_config/iconFont-solution.css'])
                .pipe(plumber({
                    handleError: function (err) {
                        console.log(err);
                        this, emit('end');
                    }
                }))

                .pipe(ejs({glyphs: newGlyphs}, {}, {ext: '.less'}))
                .pipe(gulp.dest('src/resources/less'));

            //
            var htmlStream = gulp.src(['src/_iconFont-solution.html'])
                .pipe(plumber({
                    handleError: function (err) {
                        console.log(err);
                        this, emit('end');
                    }
                }))
                .pipe(ejs({glyphs: newGlyphs}, {}, {ext: '.html'}))
                .pipe(gulp.dest('build/'));


            return merge.apply(merge, [lessStream, htmlStream]);
        })
        .pipe(gulp.dest('build/resources/fonts.iconFont-solution/'))
})


//图片精灵
const spriteConfig = require('./_config/sprite');

var spritesSrc = {};
spritesSrc.img = spriteConfig.map(function (val) {
    return 'build/resources/images/solution/common/' + val.imgName;
});
spritesSrc.less = spriteConfig.map(function (val) {
    return 'src/resources/less/import/' + val.cssName;
});

gulp.task('clean:sprite', function () {
    return del(spritesSrc.img.concat(spritesSrc.less))
});
gulp.task('sprite', ['clean:sprite'], function () {
    var streamArr = [];
    spriteConfig.forEach(function (val) {
        var spriteData = gulp.src(val.src).pipe(spritesmith(val));

        var imgStream = spriteData.img
            .pipe(gulp.dest('build/resources/images/solution/common/'));

        var cssStream = spriteData.css
            .pipe(gulp.dest('src/resources/less/import/'));

        streamArr.push(imgStream);
        streamArr.push(cssStream);
    });

    return merge.apply(merge, streamArr);
})


/*
复制图片
 */
var cleanImgSrc = spritesSrc.img.map(function (val) {
    return '!' + val
});
cleanImgSrc.unshift('build/resources/images/**/*.*');
gulp.task('clean:copy_img', function () {
    return del(cleanImgSrc)
});
gulp.task('copy_img', ['clean:copy_img'], function () {
    return gulp.src(['src/resources/**/images/**', '!src/resources/images/sprites/**', '!src/resources/images/sprites'])
        .pipe(gulp.dest('build/resources/'));
});

/*
复制js
 */

gulp.task('clean:copy_js', function () {
    return del(['build/js/**', '!build/js/common.js', '!build/js'])
});
gulp.task('copy_js', ['clean:copy_js'], function () {
    return gulp.src(['src/**/js/**', '!src/js/common/**', '!src/js/common'])
        .pipe(gulp.dest('build/'))
});

/*
复制css
 */
gulp.task('clean:copy_css', function () {
    return del(['build/resources/css/'])
});
gulp.task('copy_css', ['clean:copy_css'], function () {
    return gulp.src(['src/**/css/**'])
        .pipe(gulp.dest('build/'))
});

/*
复制lib文件
 */
gulp.task('clean:copy_lib', function () {
    return del(['build/resources/lib/**'])
});
gulp.task('copy_lib', ['clean:copy_lib'], function () {
    return gulp.src(['src/resources/**/lib/**'])
        .pipe(gulp.dest('build/resources/'))
})

/*
复制字体文件
 */
gulp.task('clean:copy_font', function () {
    return del(['build/resources/fonts/**', '!build/resources/fonts/**/iconFont-solution', '!build/resources/fonts/**/iconFont-solution/*.*'])
});
gulp.task('copy_font', ['clean:copy_font'], function () {
    return gulp.src(['src/resources/**/fonts/**'])
        .pipe(gulp.dest('build/resources/'))
})

/*
复制文件
 */
gulp.task('copy', ['copy_img', 'copy_js','copy_font', 'copy_css', 'copy_lib']);

/**
 * build测试环境
 */
gulp.task('build', ['ejs', 'before-less', 'concatjs', 'copy']);


/*
*dist高保真目录
 */

gulp.task('clean:dist', function () {
    return del(['dist']);
});

gulp.task('dist', ['clean:dist', 'build'], function () {
    //html
    gulp.src(['build/index.html'])
        .pipe(replace('resources/css/', '../resources/css'))
        .pipe(replace('solution.css', 'solution-v31/solution.css'))
        .pipe(replace('reaources/images/', '../resources/images/'))
        .pipe(replace('src="js/', 'src="../js/'))
        .pipe(rename('demo.html'))
        .pipe(gulp.dest('dist/solution/'));

    //css

    gulp.src(['build/resources/css/solution.css'])
        .pipe(replace('url(../images/', 'url(../../images/'))
        .pipe(gulp.dest('dist/resources/css/solution-v31/'))


        //theme
        .pipe(gulp.dest('theme/v2_resources/css/solution-v31/'));


    //js

    gulp.src(['build/js/solution-v3.1.js'])
        .pipe(gulp.dest('dist/js/'))

        //theme
        .pipe(gulp.dest('theme/js/'));


    //image
    gulp.src(['build/resources/images/solution/demo/*.*'])
        .pipe(gulp.dest('dist/resources/images/solution/demo/'));

    gulp.src(['build/resources/images/solution/common/**'])
        .pipe(gulp.dest('dist/resources/images/solution/common/'))

        //theme
        .pipe(gulp.dest('theme/v2_resources/images/solution/common/'));


});
gulp.task('browserSync', function () {
    browserSync({
        server: {
            baseDir: "'./build'" //默认根目录
        },
        browser: "google chrome" //使用chrome打开
    })
});

//编译后监听文件变化

gulp.task('default', ['build'], watch);
//监听文件变化

gulp.task('watch', watch);


//监听方法
function watch() {

    browserSync.init({      // 启动Browsersync服务
        server: {
            baseDir: './build',   // 启动服务的目录 默认 index.html
            index: 'index.html' // 自定义启动文件名
        },
        open: 'google chrome',   // 决定Browsersync启动时自动打开的网址 external 表示 可外部打开 url, 可以在同一 wifi 下不同终端测试
        injectChanges: true // 注入CSS改变
    });

    gulp.watch(['src/resources/images/**', "!src/resources/images/sprites/**"], ['copy_img']).on('change', reload);
    gulp.watch(['src/resources/fonts/**/*.*'], ['copy_font']).on('change', reload);
    gulp.watch(['src/js/**', '!src/js/common/**'], ['copy_js']).on('change', reload);
    gulp.watch(['src/resources/lib/**'], ['copy_lib']).on('change', reload);
    gulp.watch(['src/**/*.{html,ejs}'], ['ejs']).on('change', reload);
    gulp.watch(['src/js/common/**/*.js'], ['concatjs','copy_js']).on('change', reload);
    gulp.watch(['src/resources/fontIcons/**/*.svg'], ['iconfont-less']).on('change', reload);
    gulp.watch(['src/resources/images/sprites/**'], ['sprite-less']).on('change', reload);
    gulp.watch(['src/resources/less/**'].concat(spritesSrc.less.map(function (val) {
        return '!' + val
    })), ['less','copy_css']).on('change', reload);
}