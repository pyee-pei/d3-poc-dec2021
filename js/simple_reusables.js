function basic_line() {

    var width=0,
        height=0,
        myData = [],
        margins = {},
        myClass="",
        yVars={};

    function my(svg) {

        var xExtent = d3.extent(myData, d => d.fullDate);
        var yExtentLeft = d3.extent(myData, d => d[yVars["left"]]);
        var yExtentRight = d3.extent(myData, d => d[yVars["left"]]/d[yVars["rightDenominator"]]);
        var xScale = d3.scaleTime().domain(xExtent).range([0,width - margins.left - margins.right]);
        var yScaleLeft = d3.scaleLinear().domain(yExtentLeft).range([height - margins.top - margins.bottom,0]);
        var yScaleRight = d3.scaleLinear().domain(yExtentRight).range([height - margins.top - margins.bottom,0]);

        var lineLeft = d3.line()
            .x(d => xScale(d.fullDate))
            .y(d => yScaleLeft(d[yVars["left"]]));

        var area = d3.area()
            .x(d => xScale(d.fullDate))
            .y0(d => yScaleRight(d[yVars["left"]]/d[yVars["rightDenominator"]]))
            .y1(d => yScaleLeft(d[yVars["left"]]));

        var lineRight = d3.line()
            .x(d => xScale(d.fullDate))
            .y(d => yScaleRight(d[yVars["left"]]/d[yVars["rightDenominator"]]));

        //non data elements
        if(d3.select(".xAxis" + myClass)._groups[0][0] === null) {
            svg.append("g").attr("class","axis xAxis" + myClass);
            svg.append("g").attr("class","axis yAxisLeft" + myClass);
            svg.append("g").attr("class","axis yAxisRight" + myClass);
            svg.append("path").attr("class","pathLeft" + myClass);
            svg.append("path").attr("class","pathRight" + myClass);
            svg.append("path").attr("class","area" + myClass);
            svg.append("text").attr("class","yAxisRightLabel" + myClass);
        }


        d3.select(".yAxisRightLabel" + myClass)
            .attr("fill","#A0A0A0")
            .attr("text-anchor","middle")
            .attr("transform","translate(" + (width - 15) + ","
                + (margins.top + ((height - margins.top - margins.bottom)/2)) + ") rotate(90)")
            .text(yVars["leftLong"] + "/" + yVars["rightLong"])

        d3.select(".xAxis" + myClass)
            .call(d3.axisBottom(xScale).tickSizeOuter(0))
            .attr("transform","translate(" + margins.left + "," + (height - margins.bottom) + ")");

        d3.selectAll(".xAxis" + myClass + " .tick text")
            .attr("y",4);


        d3.select(".yAxisLeft" + myClass)
            .call(d3.axisLeft(yScaleLeft).tickSizeOuter(0).tickFormat(d3.format("$.2s")))
            .attr("transform","translate(" + margins.left + "," + margins.top + ")");

        d3.selectAll(".yAxisLeft" + myClass + " .tick text")
            .attr("x",-3)
            .style("fill","#707070");

        d3.selectAll(".yAxisLeft" + myClass + " path")
            .attr("stroke-width",1.5)
            .style("stroke","#707070");

        d3.select(".yAxisRight" + myClass)
            .call(d3.axisRight(yScaleRight).tickSizeOuter(0))
            .attr("transform","translate(" + (width - margins.right) + "," + margins.top + ")");

        d3.selectAll(".yAxisRight" + myClass + " .tick text")
            .text("")

        d3.selectAll(".yAxisRight" + myClass + " path")
            .style("stroke","#D0D0D0");

        d3.select(".pathLeft" + myClass)
            .attr("fill","none")
            .attr("stroke","#707070")
            .attr("stroke-width",1.5)
            .attr("d",lineLeft(myData))
            .attr("transform","translate(" + margins.left + "," + margins.top + ")");

        d3.select(".pathRight" + myClass)
            .attr("fill","none")
            .attr("stroke","#D0D0D0")
            .attr("stroke-dasharray","2,2")
            .attr("stroke-width",1.5)
            .attr("d",lineRight(myData))
            .attr("transform","translate(" + margins.left + "," + margins.top + ")");

        d3.select(".area" + myClass)
            .attr("stroke","none")
            .attr("fill-opacity",0.2)
            .attr("fill","#A0A0A0")
            .attr("d",area(myData))
            .attr("transform","translate(" + margins.left + "," + margins.top + ")");


    }

    my.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return my;
    };

    my.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return my;
    };

    my.myData = function(value) {
        if (!arguments.length) return myData;
        myData = value;
        return my;
    };


    my.myClass = function(value) {
        if (!arguments.length) return myClass;
        myClass = value;
        return my;
    };

    my.margins = function(value) {
        if (!arguments.length) return margins;
        margins = value;
        return my;
    };

    my.yVars = function(value) {
        if (!arguments.length) return yVars;
        yVars = value;
        return my;
    };
    return my;
}
