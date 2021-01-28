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


    Description:
    ------------
    Driver program that builds a property graph for a JavaScript program (nodes.csv, rels.csv) 


    Usage:
    ------------
    node hpg_construction/main.js -js <RELATIVE_PATH_TO_TEST_FILE> -o <OUTPUT_FOLDER_NAME>


    Help Command:
    ------------
    python -m hpg_construction.api -h
 */

var inputReader = require('./lib/jaw/parser/inputreader'),
    sourceReader = require('./lib/jaw/parser/sourcereader'),
    driver = require('./lib/jaw/driver'),
    defuseAnalysisExecutor = require('./lib/jaw/def-use/defuseanalysisexecutor');
const pathModule = require('path');

/* Main */

function main(){

    try {
        var args = inputReader.readInput(process.argv);
        var jsFileNamesOfPages = args[0];
        var outputRelativePath = args[1][0][0];
        var sourceContents = [];
        driver.createOutputDirectories();
        for (var index = 0; index < jsFileNamesOfPages.length; ++index) {
            var content = sourceReader.getSourceFromFile(pathModule.resolve(__dirname, ''+jsFileNamesOfPages[index]));

            /* comment the below line if you don't want to write the source program in the analysis directory */
            // driver.writeCombinedJSSource(content, index, outputRelativePath);
            sourceContents.push(content);
        }

        defuseAnalysisExecutor.initialize(sourceContents);
        defuseAnalysisExecutor.buildIntraProceduralModelsOfEachPageModels();

        driver.writeIntraProceduralAnalysisResultFiles(outputRelativePath);

        defuseAnalysisExecutor.buildInterProceduralModelsOfEachPageModels();
        driver.writeInterProceduralAnalysisResultFiles(outputRelativePath);


     } catch(err) {
         console.error('[-] ERROR:  '+ err.message);
     }
}


(async function(){
    console.log('[+] started code property graph analyzer...');
    await main();
    console.log('[+] code property graph analyzer finished!');
    process.exit()
})();