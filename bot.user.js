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
// @require      src/user-interface.js
// @require      src/canvas.js
// @require      src/utility.js
// @grant        none
// ==/UserScript==

// Main
(function (window, document) {
    window.play_btn.btnf.addEventListener('click', UserInterface.playButtonClickListener);
    document.onkeydown = UserInterface.onkeydown;
    window.onmousedown = UserInterface.onmousedown;
    console.log('Attempting to add window eventListener...');
    window.addEventListener('mouseup', UserInterface.onmouseup);

    // Custom logging function - disabled by default
    window.log = function () {
        if (window.logDebugging) {
            console.log.apply(console, arguments);
        }
    };

    //TODO remove after testing.
    Utility.readTextFile("/Users/Public/Documents/test/data.json", function(text){
        var data = JSON.parse(text);
        console.log(data);
    });

    // Hide top score
    UserInterface.hideTop();

    // force server
    UserInterface.initServerIp();
    console.log('Attempting to add server eventListener...');
    UserInterface.server.addEventListener('keyup', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            window.play_btn.btnf.click();
        }
    });

    // Overlays
    UserInterface.initOverlays();

    // Load preferences
    UserInterface.loadPreference('logDebugging', false);
    UserInterface.loadPreference('visualDebugging', true);
    UserInterface.loadPreference('autoRespawn', true);
    UserInterface.loadPreference('mobileRender', false);
    window.nick.value = UserInterface.loadPreference('savedNick', 'not-a-bot');

    // Listener for mouse wheel scroll - used for setZoom function
    console.log('Attempting to add document.body eventListener...');
    document.body.addEventListener('mousewheel', Canvas.setZoom);
    document.body.addEventListener('DOMMouseScroll', Canvas.setZoom);

    // Set render mode
    if (window.mobileRender) {
        UserInterface.toggleMobileRendering(true);
    } else {
        UserInterface.toggleMobileRendering(false);
    }

    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');

    // Remove social
    window.social.remove();

    // Maintain fps
    setInterval(UserInterface.framesPerSecond.fpsTimer, 80);

    // Start!
    UserInterface.oefTimer();
})(window, document);
