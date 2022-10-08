/*
		Copyright (C) 2022  Soheil Khodayari, CISPA
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


		Description:
		------------
		Lightweight module for Detecting Client-side CSRF sources/sinks
*/

const constantsModule = require('./../../engine/lib/jaw/constants');
const esprimaParser = require('./../../engine/lib/jaw/parser/jsparser');
const walkes = require('walkes');
const escodgen = require('escodegen');
var Set = require('./../../engine/lib/analyses/set');


function requireUncached(module) {
		delete require.cache[require.resolve(module)];
		return require(module);
}

const DEBUG = false;
/**
 * DOMClobberingTraversal
 * @constructor
 */
function CSCSRFSourceSinkAnalyzer() {
	"use strict";
	// re-instantiate every time
	this.api = require('./../../engine/model_builder');
	this.scopeCtrl = require('./../../engine/lib/jaw/scope/scopectrl');
	this.modelCtrl = require('./../../engine/lib/jaw/model/modelctrl');
	this.modelBuilder = require('./../../engine/lib/jaw/model/modelbuilder');
	this.scopeCtrl.clear();
	this.modelCtrl.clear();
}


CSCSRFSourceSinkAnalyzer.prototype.build_static_model = async function(code){

	let theSourceSinkAnalyzer = this;
	let language = constantsModule.LANG.js;
	await theSourceSinkAnalyzer.api.initializeModelsFromSource(code, language);
	await theSourceSinkAnalyzer.api.buildInitializedModels();

}


module.exports = {
	CSCSRFSourceSinkAnalyzer: CSCSRFSourceSinkAnalyzer,
};