/*
The MIT License (MIT)
 Copyright (c) 2016 Jesse Miller <jmiller@jmiller.com>
 Copyright (c) 2016 Alexey Korepanov <kaikaikai@yandex.ru>
 Copyright (c) 2016 Ermiya Eskandary & Théophile Cailliau and other contributors
 https://jmiller.mit-license.org/
*/
// ==UserScript==
// @name         Slither.io Bot Championship Edition
// @namespace    https://github.com/oksenyah/Slither.io-bot
// @version      3.0.6.3
// @description  Slither.io Bot Championship Edition
// @author       Ok Senyah
// @match        http://slither.io/
// @updateURL    https://github.com/oksenyah/Slither.io-bot/raw/testing/bot.user.js
// @downloadURL  https://github.com/oksenyah/Slither.io-bot/raw/testing/bot.user.js
// @supportURL   https://github.com/oksenyah/Slither.io-bot/issues
// @require      src/slither-io-bot.js
// @grant        none
// ==/UserScript==

// Custom logging function - disabled by default
window.log = function () {
    if (window.logDebugging) {
        console.log.apply(console, arguments);
    }
};

var canvas = window.canvas = (function (window) {
    return {
        // Spoofs moving the mouse to the provided coordinates.
        setMouseCoordinates: function (point) {
            window.xm = point.x;
            window.ym = point.y;
        },

        // Convert map coordinates to mouse coordinates.
        mapToMouse: function (point) {
            var mouseX = (point.x - window.snake.xx) * window.gsc;
            var mouseY = (point.y - window.snake.yy) * window.gsc;
            return { x: mouseX, y: mouseY };
        },

        // Map cordinates to Canvas cordinate shortcut
        mapToCanvas: function (point) {
            var c = {
                x: window.mww2 + (point.x - window.view_xx) * window.gsc,
                y: window.mhh2 + (point.y - window.view_yy) * window.gsc
            };
            return c;
        },

        // Map to Canvas coordinate conversion for drawing circles.
        // Radius also needs to scale by .gsc
        circleMapToCanvas: function (circle) {
            var newCircle = canvas.mapToCanvas({
                x: circle.x,
                y: circle.y
            });
            return canvas.circle(
                newCircle.x,
                newCircle.y,
                circle.radius * window.gsc
            );
        },

        // Constructor for point type
        point: function (x, y) {
            var p = {
                x: Math.round(x),
                y: Math.round(y)
            };

            return p;
        },

        // Constructor for rect type
        rect: function (x, y, w, h) {
            var r = {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h)
            };

            return r;
        },

        // Constructor for circle type
        circle: function (x, y, r) {
            var c = {
                x: Math.round(x),
                y: Math.round(y),
                radius: Math.round(r)
            };

            return c;
        },

        // Fast atan2
        fastAtan2: function (y, x) {
            const QPI = Math.PI / 4;
            const TQPI = 3 * Math.PI / 4;
            var r = 0.0;
            var angle = 0.0;
            var abs_y = Math.abs(y) + 1e-10;
            if (x < 0) {
                r = (x + abs_y) / (abs_y - x);
                angle = TQPI;
            } else {
                r = (x - abs_y) / (x + abs_y);
                angle = QPI;
            }
            angle += (0.1963 * r * r - 0.9817) * r;
            if (y < 0) {
                return -angle;
            }

            return angle;
        },

        // Adjusts zoom in response to the mouse wheel.
        setZoom: function (e) {
            // Scaling ratio
            if (window.gsc) {
                window.gsc *= Math.pow(0.9, e.wheelDelta / -120 || e.detail / 2 || 0);
                window.desired_gsc = window.gsc;
            }
        },

        // Restores zoom to the default value.
        resetZoom: function () {
            window.gsc = 0.9;
            window.desired_gsc = 0.9;
        },

        // Maintains Zoom
        maintainZoom: function () {
            if (window.desired_gsc !== undefined) {
                window.gsc = window.desired_gsc;
            }
        },

        // Sets background to the given image URL.
        // Defaults to slither.io's own background.
        setBackground: function (url) {
            url = typeof url !== 'undefined' ? url : '/s/bg45.jpg';
            window.ii.src = url;
        },

        // Draw a rectangle on the canvas.
        drawRect: function (rect, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;

            var context = window.mc.getContext('2d');
            var lc = canvas.mapToCanvas({ x: rect.x, y: rect.y });

            context.save();
            context.globalAlpha = alpha;
            context.strokeStyle = color;
            context.rect(lc.x, lc.y, rect.width * window.gsc, rect.height * window.gsc);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a circle on the canvas.
        drawCircle: function (circle, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;
            if (circle.radius === undefined) circle.radius = 5;

            var context = window.mc.getContext('2d');
            var drawCircle = canvas.circleMapToCanvas(circle);

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.strokeStyle = color;
            context.arc(drawCircle.x, drawCircle.y, drawCircle.radius, 0, Math.PI * 2);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw an angle.
        // @param {number} start -- where to start the angle
        // @param {number} angle -- width of the angle
        // @param {bool} danger -- green if false, red if true
        drawAngle: function (start, angle, color, fill, alpha) {
            if (alpha === undefined) alpha = 0.6;

            var context = window.mc.getContext('2d');

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.moveTo(window.mc.width / 2, window.mc.height / 2);
            context.arc(window.mc.width / 2, window.mc.height / 2, window.gsc * 100, start, angle);
            context.lineTo(window.mc.width / 2, window.mc.height / 2);
            context.closePath();
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a line on the canvas.
        drawLine: function (p1, p2, color, width) {
            if (width === undefined) width = 5;

            var context = window.mc.getContext('2d');
            var dp1 = canvas.mapToCanvas(p1);
            var dp2 = canvas.mapToCanvas(p2);

            context.save();
            context.beginPath();
            context.lineWidth = width * window.gsc;
            context.strokeStyle = color;
            context.moveTo(dp1.x, dp1.y);
            context.lineTo(dp2.x, dp2.y);
            context.stroke();
            context.restore();
        },

        // Given the start and end of a line, is point left.
        isLeft: function (start, end, point) {
            return ((end.x - start.x) * (point.y - start.y) -
                (end.y - start.y) * (point.x - start.x)) > 0;

        },

        // Get distance squared
        getDistance2: function (x1, y1, x2, y2) {
            var distance2 = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
            return distance2;
        },

        getDistance2FromSnake: function (point) {
            point.distance = canvas.getDistance2(window.snake.xx, window.snake.yy,
                point.xx, point.yy);
            return point;
        },

        // return unit vector in the direction of the argument
        unitVector: function (v) {
            var l = Math.sqrt(v.x * v.x + v.y * v.y);
            if (l > 0) {
                return {
                    x: v.x / l,
                    y: v.y / l
                };
            } else {
                return {
                    x: 0,
                    y: 0
                };
            }
        },

        // Check if point in Rect
        pointInRect: function (point, rect) {
            if (rect.x <= point.x && rect.y <= point.y &&
                rect.x + rect.width >= point.x && rect.y + rect.height >= point.y) {
                return true;
            }
            return false;
        },

        // check if point is in polygon
        pointInPoly: function (point, poly) {
            if (point.x < poly.minx || point.x > poly.maxx ||
                point.y < poly.miny || point.y > poly.maxy) {
                return false;
            }
            let c = false;
            const l = poly.pts.length;
            for (let i = 0, j = l - 1; i < l; j = i++) {
                if ( ((poly.pts[i].y > point.y) != (poly.pts[j].y > point.y)) &&
                    (point.x < (poly.pts[j].x - poly.pts[i].x) * (point.y - poly.pts[i].y) /
                        (poly.pts[j].y - poly.pts[i].y) + poly.pts[i].x) ) {
                    c = !c;
                }
            }
            return c;
        },

        addPolyBox: function (poly) {
            var minx = poly.pts[0].x;
            var maxx = poly.pts[0].x;
            var miny = poly.pts[0].y;
            var maxy = poly.pts[0].y;
            for (let p = 1, l = poly.pts.length; p < l; p++) {
                if (poly.pts[p].x < minx) {
                    minx = poly.pts[p].x;
                }
                if (poly.pts[p].x > maxx) {
                    maxx = poly.pts[p].x;
                }
                if (poly.pts[p].y < miny) {
                    miny = poly.pts[p].y;
                }
                if (poly.pts[p].y > maxy) {
                    maxy = poly.pts[p].y;
                }
            }
            return {
                pts: poly.pts,
                minx: minx,
                maxx: maxx,
                miny: miny,
                maxy: maxy
            };
        },

        cross: function (o, a, b) {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        },

        convexHullSort: function (a, b) {
            return a.x == b.x ? a.y - b.y : a.x - b.x;
        },

        convexHull: function (points) {
            points.sort(canvas.convexHullSort);

            var lower = [];
            for (let i = 0, l = points.length; i < l; i++) {
                while (lower.length >= 2 && canvas.cross(
                    lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
                    lower.pop();
                }
                lower.push(points[i]);
            }

            var upper = [];
            for (let i = points.length - 1; i >= 0; i--) {
                while (upper.length >= 2 && canvas.cross(
                    upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
                    upper.pop();
                }
                upper.push(points[i]);
            }

            upper.pop();
            lower.pop();
            return lower.concat(upper);
        },

        // Check if circles intersect
        circleIntersect: function (circle1, circle2) {
            var bothRadii = circle1.radius + circle2.radius;
            var point = {};

            // Pretends the circles are squares for a quick collision check.
            // If it collides, do the more expensive circle check.
            if (circle1.x + bothRadii > circle2.x &&
                circle1.y + bothRadii > circle2.y &&
                circle1.x < circle2.x + bothRadii &&
                circle1.y < circle2.y + bothRadii) {

                var distance2 = canvas.getDistance2(circle1.x, circle1.y, circle2.x, circle2.y);

                if (distance2 < bothRadii * bothRadii) {
                    point = {
                        x: ((circle1.x * circle2.radius) + (circle2.x * circle1.radius)) /
                        bothRadii,
                        y: ((circle1.y * circle2.radius) + (circle2.y * circle1.radius)) /
                        bothRadii,
                        ang: 0.0
                    };

                    point.ang = canvas.fastAtan2(
                        point.y - window.snake.yy, point.x - window.snake.xx);

                    if (window.visualDebugging) {
                        var collisionPointCircle = canvas.circle(
                            point.x,
                            point.y,
                            5
                        );
                        canvas.drawCircle(circle2, '#ff9900', false);
                        canvas.drawCircle(collisionPointCircle, '#66ff66', true);
                    }
                    return point;
                }
            }
            return false;
        }
    };
})(window);

var userInterface = window.userInterface = (function (window, document) {
    // Save the original slither.io functions so we can modify them, or reenable them later.
    var original_keydown = document.onkeydown;
    var original_onmouseDown = window.onmousedown;
    var original_oef = window.oef;
    var original_redraw = window.redraw;
    var original_onmousemove = window.onmousemove;

    window.oef = function () { };
    window.redraw = function () { };

    return {
        overlays: {},
        gfxEnabled: true,

        initServerIp: function () {
            var parent = document.getElementById('playh');
            var serverDiv = document.createElement('div');
            var serverIn = document.createElement('input');

            serverDiv.style.width = '244px';
            serverDiv.style.margin = '-30px auto';
            serverDiv.style.boxShadow = 'rgb(0, 0, 0) 0px 6px 50px';
            serverDiv.style.opacity = 1;
            serverDiv.style.background = 'rgb(76, 68, 124)';
            serverDiv.className = 'taho';
            serverDiv.style.display = 'block';

            serverIn.className = 'sumsginp';
            serverIn.placeholder = '0.0.0.0:444';
            serverIn.maxLength = 21;
            serverIn.style.width = '220px';
            serverIn.style.height = '24px';

            serverDiv.appendChild(serverIn);
            parent.appendChild(serverDiv);

            userInterface.server = serverIn;
        },

        initOverlays: function () {
            var botOverlay = document.createElement('div');
            botOverlay.style.position = 'fixed';
            botOverlay.style.right = '5px';
            botOverlay.style.bottom = '112px';
            botOverlay.style.width = '150px';
            botOverlay.style.height = '85px';
            // botOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            botOverlay.style.color = '#C0C0C0';
            botOverlay.style.fontFamily = 'Consolas, Verdana';
            botOverlay.style.zIndex = 999;
            botOverlay.style.fontSize = '14px';
            botOverlay.style.padding = '5px';
            botOverlay.style.borderRadius = '5px';
            botOverlay.className = 'nsi';
            document.body.appendChild(botOverlay);

            var serverOverlay = document.createElement('div');
            serverOverlay.style.position = 'fixed';
            serverOverlay.style.right = '5px';
            serverOverlay.style.bottom = '5px';
            serverOverlay.style.width = '160px';
            serverOverlay.style.height = '14px';
            serverOverlay.style.color = '#C0C0C0';
            serverOverlay.style.fontFamily = 'Consolas, Verdana';
            serverOverlay.style.zIndex = 999;
            serverOverlay.style.fontSize = '14px';
            serverOverlay.className = 'nsi';
            document.body.appendChild(serverOverlay);

            var prefOverlay = document.createElement('div');
            prefOverlay.style.position = 'fixed';
            prefOverlay.style.left = '10px';
            prefOverlay.style.top = '75px';
            prefOverlay.style.width = '260px';
            prefOverlay.style.height = '210px';
            // prefOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            prefOverlay.style.color = '#C0C0C0';
            prefOverlay.style.fontFamily = 'Consolas, Verdana';
            prefOverlay.style.zIndex = 999;
            prefOverlay.style.fontSize = '14px';
            prefOverlay.style.padding = '5px';
            prefOverlay.style.borderRadius = '5px';
            prefOverlay.className = 'nsi';
            document.body.appendChild(prefOverlay);

            var statsOverlay = document.createElement('div');
            statsOverlay.style.position = 'fixed';
            statsOverlay.style.left = '10px';
            statsOverlay.style.top = '295px';
            statsOverlay.style.width = '140px';
            statsOverlay.style.height = '210px';
            // statsOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            statsOverlay.style.color = '#C0C0C0';
            statsOverlay.style.fontFamily = 'Consolas, Verdana';
            statsOverlay.style.zIndex = 998;
            statsOverlay.style.fontSize = '14px';
            statsOverlay.style.padding = '5px';
            statsOverlay.style.borderRadius = '5px';
            statsOverlay.className = 'nsi';
            document.body.appendChild(statsOverlay);

            userInterface.overlays.botOverlay = botOverlay;
            userInterface.overlays.serverOverlay = serverOverlay;
            userInterface.overlays.prefOverlay = prefOverlay;
            userInterface.overlays.statsOverlay = statsOverlay;
        },

        toggleOverlays: function () {
            Object.keys(userInterface.overlays).forEach(function (okey) {
                var oVis = userInterface.overlays[okey].style.visibility !== 'hidden' ?
                    'hidden' : 'visible';
                userInterface.overlays[okey].style.visibility = oVis;
                window.visualDebugging = oVis === 'visible';
            });
        },


        toggleGfx: function () {
            if (userInterface.gfxEnabled) {
                var c = window.mc.getContext('2d');
                c.save();
                c.fillStyle = "#000000",
                c.fillRect(0, 0, window.mww, window.mhh),
                c.restore();

                var d = document.createElement('div');
                d.style.position = 'fixed';
                d.style.top = '50%';
                d.style.left = '50%';
                d.style.width = '200px';
                d.style.height = '60px';
                d.style.color = '#C0C0C0';
                d.style.fontFamily = 'Consolas, Verdana';
                d.style.zIndex = 999;
                d.style.margin = '-30px 0 0 -100px';
                d.style.fontSize = '20px';
                d.style.textAlign = 'center';
                d.className = 'nsi';
                document.body.appendChild(d);
                userInterface.gfxOverlay = d;

                window.lbf.innerHTML = '';
            } else {
                document.body.removeChild(userInterface.gfxOverlay);
                userInterface.gfxOverlay = undefined;
            }

            userInterface.gfxEnabled = !userInterface.gfxEnabled;
        },

        // Save variable to local storage
        savePreference: function (item, value) {
            window.localStorage.setItem(item, value);
            userInterface.onPrefChange();
        },

        // Load a variable from local storage
        loadPreference: function (preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem === 'true') {
                    window[preference] = true;
                } else if (savedItem === 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' + window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference +
                    '. Used default: ' + window[preference]);
            }
            userInterface.onPrefChange();
            return window[preference];
        },

        // Saves username when you click on "Play" button
        playButtonClickListener: function () {
            userInterface.saveNick();
            userInterface.loadPreference('autoRespawn', false);
            userInterface.onPrefChange();

            if (userInterface.server.value) {
                let s = userInterface.server.value.split(':');
                if (s.length === 2) {
                    window.force_ip = s[0];
                    window.force_port = s[1];
                    SlitherBot.connect();
                }
            } else {
                window.force_ip = undefined;
                window.force_port = undefined;
            }
        },

        // Preserve nickname
        saveNick: function () {
            var nick = document.getElementById('nick').value;
            userInterface.savePreference('savedNick', nick);
        },

        // Hide top score
        hideTop: function () {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style.width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    SlitherBot.isTopHidden = true;
                    window.topscore = nsidivs[i];
                }
            }
        },

        // Store FPS data
        framesPerSecond: {
            fps: 0,
            fpsTimer: function () {
                if (window.playing && window.fps && window.lrd_mtm) {
                    if (Date.now() - window.lrd_mtm > 970) {
                        userInterface.framesPerSecond.fps = window.fps;
                    }
                }
            }
        },

        onkeydown: function (e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            if (window.playing) {
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    SlitherBot.isBotEnabled = !SlitherBot.isBotEnabled;
                }
                // Letter `C` to toggle self-circling
                if (e.keyCode === 67) {
                    SlitherBot.isSelfCirclingEnabled = !SlitherBot.isSelfCirclingEnabled;
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    console.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    console.log('Visual debugging set to: ' + window.visualDebugging);
                    userInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    console.log('Automatic Respawning set to: ' + window.autoRespawn);
                    userInterface.savePreference('autoRespawn', window.autoRespawn);
                }
                // Letter 'H' to toggle hidden mode
                if (e.keyCode === 72) {
                    userInterface.toggleOverlays();
                }
                // Letter 'G' to toggle graphics
                if (e.keyCode === 71) {
                    userInterface.toggleGfx();
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    userInterface.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    SlitherBot.opt.radiusMult++;
                    console.log(
                        'radiusMult set to: ' + SlitherBot.opt.radiusMult);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (SlitherBot.opt.radiusMult > 1) {
                        SlitherBot.opt.radiusMult--;
                        console.log(
                            'radiusMult set to: ' +
                            SlitherBot.opt.radiusMult);
                    }
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvas.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode === 81) {
                    window.autoRespawn = false;
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    SlitherBot.quickRespawn();
                }
                userInterface.onPrefChange();
            }
        },

        onmousedown: function (e) {
            if (window.playing) {
                switch (e.which) {
                    // "Left click" to manually speed up the slither
                    case 1:
                        SlitherBot.defaultAccel = 1;
                        if (!SlitherBot.isBotEnabled) {
                            original_onmouseDown(e);
                        }
                        break;
                    // "Right click" to toggle bot in addition to the letter "T"
                    case 3:
                        SlitherBot.isBotEnabled = !SlitherBot.isBotEnabled;
                        break;
                }
            } else {
                original_onmouseDown(e);
            }
            userInterface.onPrefChange();
        },

        onmouseup: function () {
            SlitherBot.defaultAccel = 0;
        },

        // Manual mobile rendering
        toggleMobileRendering: function (mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            userInterface.savePreference('mobileRender', window.mobileRender);
            // Set render mode
            if (window.mobileRender) {
                window.render_mode = 1;
                window.want_quality = 0;
                window.high_quality = false;
            } else {
                window.render_mode = 2;
                window.want_quality = 1;
                window.high_quality = true;
            }
        },

        // Update stats overlay.
        updateStats: function () {
            var oContent = [];
            var median;

            if (SlitherBot.scores.length === 0) return;

            median = Math.round((SlitherBot.scores[Math.floor((SlitherBot.scores.length - 1) / 2)] +
                SlitherBot.scores[Math.ceil((SlitherBot.scores.length - 1) / 2)]) / 2);

            oContent.push('games played: ' + SlitherBot.scores.length);
            oContent.push('a: ' + Math.round(
                SlitherBot.scores.reduce(function (a, b) { return a + b; }) / (SlitherBot.scores.length)) +
                ' m: ' + median);

            for (var i = 0; i < SlitherBot.scores.length && i < 10; i++) {
                oContent.push(i + 1 + '. ' + SlitherBot.scores[i]);
            }

            userInterface.overlays.statsOverlay.innerHTML = oContent.join('<br/>');
        },

        onPrefChange: function () {
            // Set static display options here.
            var oContent = [];
            var ht = userInterface.handleTextColor;

            oContent.push('version: ' + GM_info.script.version);
            oContent.push('[T] bot: ' + ht(SlitherBot.isBotEnabled));
            oContent.push('[C] self-circling bot: ' + ht(SlitherBot.isSelfCirclingEnabled));
            oContent.push('[O] mobile rendering: ' + ht(window.mobileRender));
            oContent.push('[A/S] radius multiplier: ' + SlitherBot.opt.radiusMult);
            oContent.push('[I] auto respawn: ' + ht(window.autoRespawn));
            oContent.push('[Y] visual debugging: ' + ht(window.visualDebugging));
            oContent.push('[U] log debugging: ' + ht(window.logDebugging));
            oContent.push('[Mouse Wheel] zoom');
            oContent.push('[Z] reset zoom');
            oContent.push('[ESC] quick respawn');
            oContent.push('[Q] quit to menu');

            userInterface.overlays.prefOverlay.innerHTML = oContent.join('<br/>');
        },

        onFrameUpdate: function () {
            // Botstatus overlay
            if (window.playing && window.snake !== null) {
                let oContent = [];

                oContent.push('fps: ' + userInterface.framesPerSecond.fps);

                // Display the X and Y of the snake
                oContent.push('x: ' +
                    (Math.round(window.snake.xx) || 0) + ' y: ' +
                    (Math.round(window.snake.yy) || 0));

                if (window.goalCoordinates) {
                    oContent.push('target');
                    oContent.push('x: ' + window.goalCoordinates.x + ' y: ' +
                        window.goalCoordinates.y);
                    if (window.goalCoordinates.sz) {
                        oContent.push('sz: ' + window.goalCoordinates.sz);
                    }
                }

                userInterface.overlays.botOverlay.innerHTML = oContent.join('<br/>');

                if (userInterface.gfxOverlay) {
                    let gContent = [];

                    gContent.push('<b>' + window.snake.nk + '</b>');
                    gContent.push(SlitherBot.snakeLength);
                    gContent.push('[' + window.rank + '/' + window.snake_count + ']');

                    userInterface.gfxOverlay.innerHTML = gContent.join('<br/>');
                }

                if (window.bso !== undefined && userInterface.overlays.serverOverlay.innerHTML !==
                    window.bso.ip + ':' + window.bso.po) {
                    userInterface.overlays.serverOverlay.innerHTML =
                        window.bso.ip + ':' + window.bso.po;
                }
            }

            if (window.playing && window.visualDebugging) {
                // Only draw the goal when a bot has a goal.
                if (window.goalCoordinates && SlitherBot.isBotEnabled) {
                    var headCoord = { x: window.snake.xx, y: window.snake.yy };
                    canvas.drawLine(
                        headCoord,
                        window.goalCoordinates,
                        'green');
                    canvas.drawCircle(window.goalCoordinates, 'red', true);
                }
            }
        },

        oefTimer: function () {
            var start = Date.now();
            canvas.maintainZoom();
            original_oef();
            if (userInterface.gfxEnabled) {
                original_redraw();
            } else {
                window.visualDebugging = false;
            }

            if (window.playing && SlitherBot.isBotEnabled && window.snake !== null) {
                window.onmousemove = function () { };
                SlitherBot.isBotRunning = true;
                SlitherBot.setBotSnakeId();
                SlitherBot.go();
            } else if (SlitherBot.isBotEnabled && SlitherBot.isBotRunning) {
                SlitherBot.isBotRunning = false;

                if (window.lastscore && window.lastscore.childNodes[1]) {
                    SlitherBot.scores.push(parseInt(window.lastscore.childNodes[1].innerHTML));
                    SlitherBot.scores.sort(function (a, b) { return b - a; });
                    userInterface.updateStats();
                }

                if (window.autoRespawn) {
                    SlitherBot.connect();
                }
            }

            if (!SlitherBot.isBotEnabled || !SlitherBot.isBotRunning) {
                window.onmousemove = original_onmousemove;
            }

            userInterface.onFrameUpdate();

            if (!SlitherBot.isBotEnabled && !window.no_raf) {
                window.raf(userInterface.oefTimer);
            } else {
                setTimeout(
                    userInterface.oefTimer, (1000 / SlitherBot.opt.targetFps) - (Date.now() - start));
            }
        },

        // Quit to menu
        quit: function () {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                if (window.play_btn) {
                    window.play_btn.setEnabled(true);
                }
                window.resetGame();
            }
        },

        handleTextColor: function (enabled) {
            return '<span style=\"color:' +
                (enabled ? 'green;\">enabled' : 'red;\">disabled') + '</span>';
        }
    };
})(window, document);

// Main
(function (window, document) {
    window.play_btn.btnf.addEventListener('click', userInterface.playButtonClickListener);
    document.onkeydown = userInterface.onkeydown;
    window.onmousedown = userInterface.onmousedown;
    window.addEventListener('mouseup', userInterface.onmouseup);

    // Hide top score
    userInterface.hideTop();

    // force server
    userInterface.initServerIp();
    userInterface.server.addEventListener('keyup', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            window.play_btn.btnf.click();
        }
    });

    // Overlays
    userInterface.initOverlays();

    // Load preferences
    userInterface.loadPreference('logDebugging', false);
    userInterface.loadPreference('visualDebugging', true);
    userInterface.loadPreference('autoRespawn', true);
    userInterface.loadPreference('mobileRender', false);
    window.nick.value = userInterface.loadPreference('savedNick', 'not-a-bot');

    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvas.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvas.setZoom);

    // Set render mode
    if (window.mobileRender) {
        userInterface.toggleMobileRendering(true);
    } else {
        userInterface.toggleMobileRendering(false);
    }

    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');

    // Remove social
    window.social.remove();

    // Maintain fps
    setInterval(userInterface.framesPerSecond.fpsTimer, 80);

    // Start!
    userInterface.oefTimer();
})(window, document);
