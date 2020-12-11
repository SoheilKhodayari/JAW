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