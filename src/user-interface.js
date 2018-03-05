var UserInterface = window.userInterface = (function (window, document) {
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

            UserInterface.server = serverIn;
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

            UserInterface.overlays.botOverlay = botOverlay;
            UserInterface.overlays.serverOverlay = serverOverlay;
            UserInterface.overlays.prefOverlay = prefOverlay;
            UserInterface.overlays.statsOverlay = statsOverlay;
        },

        toggleOverlays: function () {
            Object.keys(UserInterface.overlays).forEach(function (okey) {
                var oVis = UserInterface.overlays[okey].style.visibility !== 'hidden' ?
                    'hidden' : 'visible';
                UserInterface.overlays[okey].style.visibility = oVis;
                window.visualDebugging = oVis === 'visible';
            });
        },


        toggleGfx: function () {
            if (UserInterface.gfxEnabled) {
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
                UserInterface.gfxOverlay = d;

                window.lbf.innerHTML = '';
            } else {
                document.body.removeChild(UserInterface.gfxOverlay);
                UserInterface.gfxOverlay = undefined;
            }

            UserInterface.gfxEnabled = !UserInterface.gfxEnabled;
        },

        // Save variable to local storage
        savePreference: function (item, value) {
            window.localStorage.setItem(item, value);
            UserInterface.onPrefChange();
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
            UserInterface.onPrefChange();
            return window[preference];
        },

        // Saves username when you click on "Play" button
        playButtonClickListener: function () {
            UserInterface.saveNick();
            UserInterface.loadPreference('autoRespawn', false);
            UserInterface.onPrefChange();

            if (UserInterface.server.value) {
                let s = UserInterface.server.value.split(':');
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
            UserInterface.savePreference('savedNick', nick);
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
                        UserInterface.framesPerSecond.fps = window.fps;
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
                    window.log('Log debugging set to: ' + window.logDebugging);
                    UserInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    window.log('Visual debugging set to: ' + window.visualDebugging);
                    UserInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    window.log('Automatic Respawning set to: ' + window.autoRespawn);
                    UserInterface.savePreference('autoRespawn', window.autoRespawn);
                }
                // Letter 'H' to toggle hidden mode
                if (e.keyCode === 72) {
                    UserInterface.toggleOverlays();
                }
                // Letter 'G' to toggle graphics
                if (e.keyCode === 71) {
                    UserInterface.toggleGfx();
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    UserInterface.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    SlitherBot.opt.radiusMult++;
                    window.log(
                        'radiusMult set to: ' + SlitherBot.opt.radiusMult);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (SlitherBot.opt.radiusMult > 1) {
                        SlitherBot.opt.radiusMult--;
                        window.log(
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
                    UserInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    SlitherBot.quickRespawn();
                }
                UserInterface.onPrefChange();
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
            UserInterface.onPrefChange();
        },

        onmouseup: function () {
            SlitherBot.defaultAccel = 0;
        },

        // Manual mobile rendering
        toggleMobileRendering: function (mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            UserInterface.savePreference('mobileRender', window.mobileRender);
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

            UserInterface.overlays.statsOverlay.innerHTML = oContent.join('<br/>');
        },

        onPrefChange: function () {
            // Set static display options here.
            var oContent = [];
            var ht = UserInterface.handleTextColor;

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

            UserInterface.overlays.prefOverlay.innerHTML = oContent.join('<br/>');
        },

        onFrameUpdate: function () {
            // Botstatus overlay
            if (window.playing && window.snake !== null) {
                let oContent = [];

                oContent.push('fps: ' + UserInterface.framesPerSecond.fps);

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

                UserInterface.overlays.botOverlay.innerHTML = oContent.join('<br/>');

                if (UserInterface.gfxOverlay) {
                    let gContent = [];

                    gContent.push('<b>' + window.snake.nk + '</b>');
                    gContent.push(SlitherBot.snakeLength);
                    gContent.push('[' + window.rank + '/' + window.snake_count + ']');

                    UserInterface.gfxOverlay.innerHTML = gContent.join('<br/>');
                }

                if (window.bso !== undefined && UserInterface.overlays.serverOverlay.innerHTML !==
                    window.bso.ip + ':' + window.bso.po) {
                    UserInterface.overlays.serverOverlay.innerHTML =
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
            if (UserInterface.gfxEnabled) {
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
                    UserInterface.updateStats();
                }

                if (window.autoRespawn) {
                    SlitherBot.connect();
                }
            }

            if (!SlitherBot.isBotEnabled || !SlitherBot.isBotRunning) {
                window.onmousemove = original_onmousemove;
            }

            UserInterface.onFrameUpdate();

            if (!SlitherBot.isBotEnabled && !window.no_raf) {
                window.raf(UserInterface.oefTimer);
            } else {
                setTimeout(
                    UserInterface.oefTimer, (1000 / SlitherBot.opt.targetFps) - (Date.now() - start));
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