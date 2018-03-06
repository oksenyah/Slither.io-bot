var Utility = (function () {
    return {
        //usage:
        //        readTextFile("/Users/Documents/workspace/test.json", function(text){
        //            var data = JSON.parse(text);
        //            console.log(data);
        //        });
        readTextFile: function(file, callback) {
            var rawFile = new XMLHttpRequest();
            rawFile.overrideMimeType("application/json");
            rawFile.open("GET", file, true);
            rawFile.onreadystatechange = function() {
                if (rawFile.readyState === 4 && rawFile.status == "200") {
                    console.log(rawFile.responseText);
                    callback(rawFile.responseText);
                }
            }
            rawFile.send(null);
        }
    };
})(window);