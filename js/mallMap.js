

function initialiseDashboard(myData,divId,breadcrumbDivId){

    drawSvg(divId,true);
    drawSvg(breadcrumbDivId,false);
    drawMallMap(myData,divId,breadcrumbDivId);


}

function drawMallMap(myData,divId,breadcrumbDivId){

    var svg = d3.select("." + divId + "Svg");
    var width = +svg.attr("width");
    var height = +svg.attr("height");

    var my_chart = mallMapChart()
        .width(width)
        .height(height)
        .myData(myData)
        .myClass(divId)
        .selectedColor("default")
        .breadcrumbSvg(breadcrumbDivId + "Svg");

    my_chart(svg);
}

function drawSvg(divId,zoomSvg){

    var chart_div = document.getElementById(divId);
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;

    if(d3.select("." + divId + "Svg")._groups[0][0] === null){
        var svg = d3.select("#" + divId)
            .append("svg")
            .attr("class",divId + "Svg")
            .attr("id",divId)
            .attr("width",width)
            .attr("height",height);

        if(zoomSvg === true){
            svg.append("g").attr("class","zoomSvg" + divId);
        }

    } else {
        var svg = d3.select("." + divId + "Svg");
    }
    return svg;
}


