/*
    Copyright (C) 2020  Soheil Khodayari, CISPA
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/*
 * DomainScope module
 */
var Scope = require('./scope');

/**
 * DomainScope
 * @constructor
 */
function DomainScope() {
	"use strict";
	Scope.call(this, null, Scope.DOMAIN_SCOPE_NAME, Scope.DOMAIN_TYPE, null);
}

DomainScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(DomainScope.prototype, 'constructor', {
	value: DomainScope
});

/* start-public-data-members */
Object.defineProperties(DomainScope.prototype, {
	/**
	 * Array of build-in objects
	 * @type {Array}
	 * @memberof DomainScope.prototype
	 */
	builtInObjects: {
        value: [
            {name: "localStorage", def: "localStorage"}
        ],
        writable: true,
        enumerable: true
	}
});
/* end-public-data-members */

module.exports = DomainScope;