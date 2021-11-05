

function initialiseDashboard(myData,divId){

    drawSvg(divId);
    drawBasicLine(myData,divId,myData);

}



function drawBasicLine(myData,divId){

    var svg = d3.select("." + divId + "_svg");
    var width = +svg.attr("width");
    var height = +svg.attr("height");
    var margins = {"left":40,"right":20,"top":20,"bottom":20};

    var my_chart = basic_line()
        .width(width)
        .height(height)
        .myData(myData)
        .myClass(divId)
        .margins(margins)
        .yVars({"left":"metric1","leftLong":"Sample Metric 1",
            "rightDenominator":"metric2","rightLong":"Sample Metric 2"});

    my_chart(svg);
}

function drawSvg(divId){

    var chart_div = document.getElementById(divId);
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;

    if(d3.select("." + divId + "_svg")._groups[0][0] === null){
        var svg = d3.select("#" + divId)
            .append("svg")
            .attr("class",divId + "_svg")
            .attr("id",divId)
            .attr("width",width)
            .attr("height",height);

    } else {
        var svg = d3.select("." + divId + "_svg");
    }
    return svg;
}


