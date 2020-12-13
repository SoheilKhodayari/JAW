/**
 *
 *  Web Starter Kit
 *  Copyright 2014 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
(function () {
    'use strict';

    var navdrawerContainer = document.querySelector('.navdrawer-container');
    var appbarElement = document.querySelector('.app-bar');
    var menuBtn = document.querySelector('.menu');
    var main = document.querySelector('main');

    function closeMenu() {
        appbarElement.classList.remove('open');
        navdrawerContainer.classList.remove('open');
    }

    function toggleMenu() {
        appbarElement.classList.toggle('open');
        navdrawerContainer.classList.toggle('open');
    }

    main.addEventListener('ontouchstart', closeMenu);
    main.addEventListener('click', closeMenu);
    menuBtn.addEventListener('click', toggleMenu);
    navdrawerContainer.addEventListener('click', function (event) {
        if (event.target.nodeName === 'A' || event.target.nodeName === 'LI') {
            closeMenu();
        }
    });
})();


/**
 * Copyright (C) 2011 BonitaSoft S.A. BonitaSoft, 32 rue Gustave Eiffel - 38000
 * Grenoble This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 2.0 of the License, or (at your option)
 * any later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 */

$(function() {
    $.fn.waitForContent = function(callback, time) {
        if ($.isNull(time)) {
            time = 200;
        }
        if (!this.children().length) {
            setTimeout(function() {
                this.waitForContent(callback);
            }, time);
        } else {
            setTimeout(function() {
                callback.call();
            }, time);

        }
    }

});


function triggerEvent(element, eventName) {
    $(element).trigger(eventName);
}

function updateGWT(e) {
    $(e).updateUI(true);
}

function historyBack() {
    window.history.back();
}

//BS-16350: Manage bug IE, IFrame removal causes lost of the ability to focus input elements
function isIE() {
    var ua = window.navigator.userAgent;
    // MSIE: ie <= 10,  Trident: ie 11+
    return ua.indexOf('Trident/') > 0 || ua.indexOf('MSIE ') > 0;
}

function setFocusOnIframe() {
    if (isIE()) {
        var bonitaIframe = window.document.getElementById('bonitaframe');
        if (bonitaIframe) {
            bonitaIframe.contentWindow.focus();
        }
    }
}