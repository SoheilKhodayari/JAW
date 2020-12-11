/*
 * Program Main 
 * @Author Soheil K.
 */
var inputReader = require('./lib/jaw/parser/inputreader'),
    sourceReader = require('./lib/jaw/parser/sourcereader'),
    driver = require('./lib/jaw/driver'),
    defuseAnalysisExecutor = require('./lib/jaw/def-use/defuseanalysisexecutor');
const pathModule = require('path');

/* Main */

function main(){

    // try {
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


     // } catch(err) {
         // console.error('[-] ERROR:  '+ err.message);
     // }
}


(async function(){
    console.log('[+] started code property graph analyzer...');
    await main();
    console.log('[+] code property graph analyzer finished!');
})();