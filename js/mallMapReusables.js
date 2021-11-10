function mallMapChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="";

    function my(svg) {

        var baseSvg = svg;
        svg = d3.select(".zoomSvg" + myClass);

        const chartWidth = Math.min(width, height);
        const radius = chartWidth/2;
        const translateStr = "translate(" + (width/2) + "," + (height/2) + ")";

        const myHierarchy = d3.hierarchy(myData);
        myHierarchy.sum(d => d.children ? 0 : isNaN(d.value) ? 1 : d.value);
        const root = d3.partition().size([2 * Math.PI, radius])(myHierarchy);

        const zoom = d3.zoom()
            .extent([[0,0],[width,height]])
            .on("zoom", zoomed);

        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        //zoom functions
        function zoomed(event) {
            const {transform} = event;
            svg.attr("transform", transform);
        }

        function zoomToBounds(){

            const chartGroup = d3.select(".zoomSvg" + myClass).node().getBBox();
            //calculate outer limits of data

            const scale = (chartWidth-20)/Math.max(chartGroup.width,chartGroup.height);

            const newX = ((width - (chartGroup.width*scale))/2) - (chartGroup.x*scale);
            const newY = ((height - (chartGroup.height*scale))/2) - (chartGroup.y*scale);

            //flickering problem is when zoom object (click rect) is not the same size as the svg.
            //now the zoom object is a direct descendant of the svg
            //the variable svg is in fact a group (see draw_svg in cgraphs.js).

            //for the initial zoom to bounds.  Define the transform string.

            const transform_str = d3.zoomIdentity
                .translate(newX, newY)
                .scale(scale);

            //transform the svg
            svg
                .interrupt()
                .transition()
                .duration(1000)
                .attr("transform",transform_str);

        }



        drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"}])
        drawSunburst(root.descendants());

        function drawSunburst(sunburstData){

            const pathGroup = svg.selectAll('.pathGroup' + myClass)
                .data(sunburstData)
                .join(function(group){
                    var enter = group.append("g").attr("class","pathGroup" + myClass);
                    enter.append("path").attr("class","sunburstPath");
                    enter.append("text").attr("class","pathLabel");
                    return enter;
                });

            pathGroup
                .attr("transform",translateStr);


            pathGroup.select(".sunburstPath")
                .attr("id",(d,i) => "sunburstPath" + i)
                .attr("fill", getPathFill)
                .attr("d", arc)
                .on("mouseover",function(){
                    d3.selectAll(".sunburstPath").attr("opacity",1);
                    d3.select(this).interrupt().transition().duration(100).attr("opacity",0.5);
                })
                .on("mouseout",function(){
                    d3.select(this).interrupt().transition().duration(100).attr("opacity",1);
                })
                .on("click",function(event,d){
                    const breadcrumbData = getBreadcrumbs(d);
                    drawBreadcrumbs(breadcrumbData);
                    drawSunburst(d);
                    zoomToBounds();
                });

            pathGroup.select(".pathLabel")
                .text(d => (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > mallMap.fontSize ? (d.depth > 0 ? d.data.name : "") : "")
                .attr("pointer-events", "none")
                .attr("text-anchor", "middle")
                .style("font-size", mallMap.fontSize)
                .attr("transform", function(d) {
                    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                    const y = (d.y0 + d.y1) / 2;
                    return "rotate(" + (x - 90) + ") translate(" + y + ",0) rotate(" + (x < 180 ? 0 : 180) + ")";
                })
                .attr("y", "0.5em")
                .attr("fill", d => {
                    while (!d.data.colors[selectedColor] && d.parent) d = d.parent;
                    return d3.lab(d.data.colors[selectedColor] || mallMap.colors.fillColor).l < 60 ? mallMap.colors.lightColor
                        : mallMap.colors.darkColor;
                });

        }

        function getPathFill(d){
            while (!d.data.colors[selectedColor] && d.parent) d = d.parent;
            return d.depth === 0 ? "transparent" : (d.data.colors[selectedColor] || mallMap.fillColor);

        }

        function drawBreadcrumbs(breadcrumbData){

            breadcrumbData = breadcrumbData.sort((a,b) => d3.ascending(a.depth,b.depth));

            var mySvg = d3.select("." + breadcrumbSvg);

            const breadcrumbGroup = mySvg.selectAll('.breadcrumbGroup' + myClass)
                .data(breadcrumbData)
                .join(function(group){
                    var enter = group.append("g").attr("class","breadcrumbGroup" + myClass);
                    enter.append("rect").attr("class","breadcrumbRect");
                    enter.append("text").attr("class","breadcrumbLabel");
                    return enter;
                });

            breadcrumbGroup.select(".breadcrumbRect")
                .attr("id",(d,i) => "breadcrumbRect" + i)
                .attr("height",15)
                .attr("y",5)
                .attr("rx",4)
                .attr("ry",4)
                .attr("stroke","#A0A0A0")
                .attr("fill",d => d.fill)
                .on("click",function(event,d){
                    var myRoot = root.descendants().find(f => f.depth === d.depth && f.data.name === d.label);
                    if(d.depth > 0) {
                        var breadcrumbData = getBreadcrumbs(myRoot);
                        drawBreadcrumbs(breadcrumbData);
                    } else {
                        drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"}]);
                    }
                    drawSunburst(myRoot);
                    zoomToBounds();
                })

            breadcrumbGroup.select(".breadcrumbLabel")
                .attr("pointer-events","none")
                .attr("id",(d,i) => "breadcrumbLabel" + i)
                .attr("text-anchor","middle")
                .attr("font-size",10)
                .attr("y",16)
                .text(d => d.label);

            var breadcrumbX = 10;

            d3.selectAll(".breadcrumbLabel").each(function(d,i){
                var myWidth = document.getElementById("breadcrumbLabel" + i).getBoundingClientRect().width;
                d3.select("#breadcrumbRect" + i)
                    .attr("x",breadcrumbX)
                    .attr("width",myWidth + 10);

                d3.select(this)
                    .attr("x",breadcrumbX + ((myWidth+10)/2));

                breadcrumbX += (myWidth + 15);

            })

        }

        function getBreadcrumbs(d){
            var currentDepth = d.depth;
            var breadcrumbData = [], currentParent = d;
            while (currentDepth > 0){
                breadcrumbData.push({
                    "depth":currentParent.depth,
                    "label":currentParent.data.name,
                    "fill":currentParent.depth === 0 ? "white" : getPathFill(currentParent)
                })
                currentDepth = currentParent.depth;
                currentParent = currentParent.parent;
            }
            return breadcrumbData;
        }

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

    my.selectedColor = function(value) {
        if (!arguments.length) return selectedColor;
        selectedColor = value;
        return my;
    };

    my.breadcrumbSvg = function(value) {
        if (!arguments.length) return breadcrumbSvg;
        breadcrumbSvg = value;
        return my;
    };

    return my;
}
