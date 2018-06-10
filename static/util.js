var GetUrlParameter = function(){
    var queryStr = decodeURIComponent(window.location.search.substring(1));
    var paramArr = queryStr.split('&');

    var result = {};
    for (var i=0; i<paramArr.length; i++) {
        var param = paramArr[i].split('=');
        result[param[0]] = param[1];
    }
    return result;
};