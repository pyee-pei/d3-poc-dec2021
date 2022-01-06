

function initialiseDashboard(myData,extraChartData,mapData,divId,breadcrumbDivId,footerDivId,extraChartDivId){

    //draw svg for breadcrumb,chart and footer
    drawSvg(divId,true);
    drawSvg(breadcrumbDivId,false);
    drawSvg(footerDivId,false);
    drawSvg(extraChartDivId,false);
    //draw map + minimap in footer
    drawMallMap(myData,divId,breadcrumbDivId);
    drawMiniMallMap(myData,footerDivId);
  //  mallMap.extraChartData = extraChartData;
   // mallMap.extraChartDivId = extraChartDivId;
   // drawStackedBar();

}

function drawMallMap(myData,divId,breadcrumbDivId){

    var svg = d3.select("." + divId + "Svg");
    var width = +svg.attr("width");
    var height = +svg.attr("height");

    mallMap.sunburstChart = mallMapChart()
        .width(width)
        .height(height)
        .myData(myData)
        .myClass(divId)
        .selectedColor(mallMap.selectedColor)
        .breadcrumbSvg(breadcrumbDivId + "Svg");

    mallMap.sunburstChart(svg);
}

function drawMiniMallMap(myData,divId){

    var svg = d3.select("." + divId + "Svg");
    var height = +svg.attr("height");
    var width = height;

    var my_chart = miniMallMapChart()
        .width(width)
        .height(height)
        .myData(myData)
        .myClass(divId);

    my_chart(svg);
}

function drawTooltipMallMap(myData,divId,selectedColor){

    var svg = d3.select("." + divId + "Svg");
    var height = +svg.attr("height");
    var width = +svg.attr("width");

    var my_chart = tooltipMallMapChart()
        .width(width)
        .height(height)
        .myData(myData)
        .myClass(divId)
        .selectedColor(selectedColor);

    my_chart(svg);
}

function drawWellMap(){

    d3.select("." + mallMap.extraChartDivId  + "Svg").selectAll("*").remove();
    var svg = d3.select("." + mallMap.extraChartDivId + "Svg");
    svg.append("g").attr("class","zoomSvg" + mallMap.extraChartDivId);
    var height = +svg.attr("height");
    var width = +svg.attr("width");

    var groupedByWell = Array.from(d3.rollup(mallMap.extraChartData.data, v => d3.sum(v, s => Math.abs(s.actual_revenue - s.ipc_revenue)), d => d.well_id));
    var myData = [];
    groupedByWell.forEach(function(d){
        var oneWell = mallMap.extraChartData.data.find(f => f.well_id === d[0]);
        myData.push({
            "well_id": d[0],
            "difference":d[1],
            "wellName": mallMap.extraChartData.wellNames[d[0]],
            "long_lat":oneWell.long_lat,
            "position_flag":oneWell.position_flag,
            "ipc": d3.sum(mallMap.extraChartData.data, s => s.well_id === d[0] ? s.ipc_revenue : 0),
            "actual": d3.sum(mallMap.extraChartData.data, s => s.well_id === d[0] ? s.actual_revenue : 0),
        })
    })

    var my_chart = wellMap()
        .width(width)
        .height(height)
        .myData(myData)
        .myClass(mallMap.extraChartDivId)
        .mapData(mallMap.mapData);

    my_chart(svg);
}

function drawStackedBar(){
    //quick win, will make this better
    d3.select("." + mallMap.extraChartDivId  + "Svg").selectAll("*").remove();

    var svg = d3.select("." + mallMap.extraChartDivId + "Svg");
    var height = +svg.attr("height");
    var width = +svg.attr("width");
    var margins = {"left":width*0.2,"right":width*0.2,"top":height*0.2,"bottom":height*0.2};

    mallMap.stackedBarChart = stackedBarChart()
        .width(width*0.6)
        .height(height*0.6)
        .margins(margins)
        .myData(mallMap.extraChartData)
        .myClass(mallMap.extraChartDivId );

    mallMap.stackedBarChart(svg);
}

function drawLineMultiples(){

    //quick win, will make this better
    d3.select("." + mallMap.extraChartDivId  + "Svg").selectAll("*").remove();
    var svg = d3.select("." + mallMap.extraChartDivId  + "Svg");

    var height = +svg.attr("height");
    var width = +svg.attr("width");
    var margins = {"left":10,"right":10,"top":30,"bottom":10};

    var my_chart = lineMultipleChart()
        .width(width)
        .height(height)
        .margins(margins)
        .myData(mallMap.extraChartData)
        .myClass(mallMap.extraChartDivId );

    my_chart(svg);
}


function drawPyramid(){

    //quick win, will make this better
    d3.select("." + mallMap.extraChartDivId  + "Svg").selectAll("*").remove();
    var svg = d3.select("." + mallMap.extraChartDivId  + "Svg");

    var height = +svg.attr("height");
    var width = +svg.attr("width");
    var margins = {"left":50,"right":50,"top":50,"bottom":30};

    var my_chart = pyramidChart()
        .width(width)
        .height(height)
        .margins(margins)
        .myData(mallMap.extraChartData)
        .myClass(mallMap.extraChartDivId);

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
            //zoomSvg and texture added for main chart svg
            svg.append("g").attr("class","zoomSvg" + divId);
            mallMap.texture = textures.lines().size(4).strokeWidth(0.5).stroke("white");
            svg.call(mallMap.texture);
        }

    } else {
        var svg = d3.select("." + divId + "Svg");
    }
    return svg;
}


