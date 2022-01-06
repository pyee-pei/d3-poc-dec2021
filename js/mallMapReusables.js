function measureWidth(my_text,fontSize){
    //from https://observablehq.com/@mbostock/fit-text-to-circle
    const context = document.createElement("canvas").getContext("2d");

    return fontSize === undefined ? context.measureText(my_text).width : context.measureText(my_text).width  * (fontSize/14);
}

function mallMapChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        midTransition = false,
        radius = 0,
        chartWidth = 0,
        svg = "",
        translateStr = "",
        depthWidth = 0,
        arc = "",
        root = "",
        currentBreadcrumbData = [{"depth":0,"label":"Home","fill":"white"}];

    function my(mySvg) {

        //svg = zoomSvg
        svg = d3.select(".zoomSvg" + myClass);
        //calc chartWidth + radius
        chartWidth = Math.min(width, height);
        radius = chartWidth/2;
        //define depthWidth and translateStr and arc
        depthWidth = 0;
        translateStr = "translate(" + (width/2) + "," + (height/2) + ")";
        arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        //format base data
        const myHierarchy = getHierarchy(myData);
        root = getPartition(myHierarchy);
        //draw breadcrumbs,chart and then zoomtobounds
        drawBreadcrumbs(currentBreadcrumbData)
        drawSunburst(root,true);
        zoomToBounds(false,1000);

        //cheat for poc demo
        var relativeNodes = root.descendants().filter(d => d.data.relative !== undefined);
        relativeNodes.forEach(function(d){
            mallMap.relativeNodes[d.data.name] = d;
        })
        mallMap.relativeNodes["30 Day"] = root.descendants().find(f => f.data.name === "30 Day");
    }

    function getHierarchy(myDataset){
        var currentHierarchy = d3.hierarchy(myDataset);
        return currentHierarchy.sum(d => d.children ? 0 : isNaN(d.value) ? 1 : d.value);
    }

    function getPartition(myDataset){
        return d3.partition().size([2 * Math.PI, radius])(myDataset);
    }


    function pathText(d,includeZero){

        var heightCheck = (d.y0 + d.y1) / 2 * (d.x1 - d.x0);
        heightCheck = includeZero === true ? heightCheck * mallMap.currentScale : heightCheck;
        //first check arc height
        if((heightCheck > (mallMap.fontSize/mallMap.currentScale))  && d.depth > 0){
            //all good, now check width
            if(measureWidth(d.data.name) < depthWidth){
                //only show name if there is space.
                return d.data.name;
            } else {
                return "";
            }

        } else {
            return "";
        }
    }
function zoomToBounds(expandable,transitionTime) {
    //get values
    var [scale, newX, newY] = getValues();

    //define transform string
    const transform_str = d3.zoomIdentity
        .translate(newX, newY)
        .scale(scale);

    //store current scale and alter fontSize accordingly
    mallMap.currentScale = scale;
    updateFonts(false);

    //transform the svg
    if(expandable !== true){
        svg.interrupt()
            .transition()
            .duration(transitionTime)
            .attr("transform", transform_str)
            .on("end", function () {
                updateFonts(false);
            })
    } else if (midTransition === false){
        d3.select(".d3_tooltip").style("visibility", "hidden");
        midTransition = true; //so any other clicks are disabled while this is going on
        d3.selectAll(".pathLabel")
            .attr("opacity", 0)
            .transition()
            .duration(0) //then change position
            .attr("transform", d => "rotate(" + (d.foldoutTransformX - 90) + ") translate("
                + d.foldoutHeight + ",0) rotate(" + (d.foldoutTransformX < 180 ? 0 : 180) + ")")
            .transition()
            .delay(500)
            .duration(300) //and show label
            .attr("opacity", 1);

        //remove all texture paths
        d3.selectAll(".sunburstTexturePath")
            .attr("opacity", 0)
            .transition()
            .duration(0) //add new foldoutpath
            .attr("d", d => d.foldoutPath)
            .transition()
            .delay(500)
            .duration(500)
            .attr("opacity", 1);

        d3.selectAll(".sunburstPath")
            .attr("opacity", 0)
            .transition()
            .duration(0) //add new foldoutpath
            .attr("d", d => d.foldoutPath)
            .on("end", function () {
                //get new scale and rescale
                var [zoomedScale, zoomedX, zoomedY] = getValues();
                svg.transition()
                    .duration(0)
                    .attr("transform", d3.zoomIdentity.translate(zoomedX, zoomedY).scale(zoomedScale));
                //PROBLEM IS THAT THE zoomScale is for the foldoutPath - not for every
                //mallMap.currentScale = zoomedScale;
                updateFonts(true);
            })
            .transition()
            .delay(500)
            .duration(500)
            .attr("opacity", 1)
            .on("end", function () {
                midTransition = false;
            });
    }


    function updateFonts(includeZero) {
        var fontSize = mallMap.fontSize / (includeZero === true ? 1 : mallMap.currentScale);
        d3.selectAll(".pathLabel")
            .style("font-size", fontSize)
            .attr("y", fontSize * 0.3)
            .text(l => includeZero === false && l.depth === 0 ? "" : pathText(l, includeZero));
    }

    function getValues() {

        const chartGroup = d3.select(".zoomSvg" + myClass).node().getBBox();

        const scale = (chartWidth - 20) / Math.max(chartGroup.width, chartGroup.height);

        const newX = ((width - (chartGroup.width * scale)) / 2) - (chartGroup.x * scale);
        const newY = ((height - (chartGroup.height * scale)) / 2) - (chartGroup.y * scale);

        return [scale, newX, newY]

    }
}
    function drawSunburst(sunburstData,allData){

        if(sunburstData.descendants !== undefined){
            sunburstData = sunburstData.descendants();
        }
        //calculate depthWidth (used for label visibility)
        var minDepth = d3.min(sunburstData, d => d.depth);
        var maxDepth = d3.max(sunburstData, d => d.depth);
        depthWidth = radius/(maxDepth-minDepth);
        midTransition = false;

        //disable/enable buttons as needed
        if(allData === true || sunburstData.data === undefined || sunburstData.data.expandable === undefined){
            d3.selectAll("#fan").attr("cursor","disabled").attr("opacity",0.2);
            d3.selectAll("#map").attr("cursor","disabled").attr("opacity",0.2);
        } else {
            d3.selectAll("#fan").attr("cursor","disabled").attr("opacity",0.2);
            d3.selectAll("#map").attr("cursor","pointer").attr("opacity",1);
        }

        //reset mini mall map
        d3.selectAll(".miniMapPath").attr("fill","#707070");

        if(allData === false){
            //if not all data, select relevant paths on mini mall map
            sunburstData.forEach(d => d3.selectAll("#miniMap" + d.data.id).attr("fill",getPathFill));
        }

        //path group
        const pathGroup = svg.selectAll('.pathGroup' + myClass)
            .data(sunburstData)
            .join(function(group){
                var enter = group.append("g").attr("class","pathGroup" + myClass);
                enter.append("path").attr("class","sunburstPath");
                enter.append("path").attr("class","sunburstTexturePath");
                enter.append("text").attr("class","pathLabel");
                return enter;
            });

        pathGroup
            .attr("transform",translateStr);

        pathGroup.select(".sunburstTexturePath")
            .attr("pointer-events","none")
            .attr("fill", d => d.data.expandable === undefined ? "transparent" : mallMap.texture.url())
            .attr("d", arc)


        pathGroup.select(".sunburstPath")
            .attr("id", (d,i) =>  d.data.well_id === undefined ? "notwell" + i : "well" + d.data.well_id)
            .attr("opacity",1)
            .attr("fill", getPathFill)
            .attr("d", arc)
            .on("mouseover",function(event,d){
                if(midTransition === false){
                    d3.selectAll(".sunburstPath").attr("opacity",0.5);
                    d3.selectAll(".pyramidBar").attr("opacity",0.5);
                    d3.selectAll("#" + this.id).attr("opacity",1);
                    d3.selectAll(".wellCircle").attr("stroke","transparent");
                    d3.selectAll("circle#" + this.id).attr("stroke","#333333");
                    if(d3.select("circle#" + this.id).node() !== null){
                        d3.select(d3.select("circle#" + this.id).node().parentElement).raise();
                    };
                    var svgBounds = d3.select("." + myClass + "Svg").node().getBoundingClientRect();
                    if(d.data.relativeValue !== undefined){
                        var tooltipText = "<strong></strong><span style=color:" + d.data.group_color + ";'>" + d.data.group.toUpperCase() + "</span></strong><br><span style='font-weight:normal;'>Well: " + d.data.name
                            + " (" + d.data.well_id + ")<br>Difference: $" + d3.format(".3s")(d.data.difference)
                            +  "<br>Ipc Revenue: $" + d3.format(".3s")(d.data.ipc)
                            + "<br>Actual Revenue: " + d3.format(".3s")(d.data.actual) + "</span><br>";

                    } else {
                        tooltipText = d.data.name;
                    }
                    d3.select(".d3_tooltip")
                        .style("visibility","visible")
                        .style("top",(event.offsetY + svgBounds.y) + "px")
                        .style("left",(event.offsetX + svgBounds.x + 10) + "px")
                        .html(tooltipText);

                    if(d.data.relativeValue !== undefined){
                        d3.selectAll(".d3_tooltip").selectAll("svg").remove();
                        drawSvg("d3_tooltip_div");
                        drawTooltipMallMap(mallMap.mainData,"d3_tooltip_div",d.data.well_id);
                    }
                }
            })
            .on("mouseout",function(){
                if(midTransition === false){
                    d3.select(".d3_tooltip").style("visibility","hidden");
                    d3.selectAll(".sunburstPath").attr("opacity",1);
                    d3.selectAll(".wellCircle").attr("opacity",1).attr("stroke","transparent")
                    d3.selectAll(".pyramidBar").attr("opacity",1);
                }
            })
            .on("click",function(event,d){
                if(d.depth > 0 && midTransition === false){
                    if(d.data.well_id !== undefined){
                        mallMap.selectedColor = d.data.well_id;
                        initialiseDashboard(mallMap.mainData, mallMap.extraData,mallMap.mapData,"chart_div","breadcrumb_div","footer_div","extra_chart_div");
                        drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"},{"depth":0,"label":"BACK","fill":"#F0F0F0", "data":sunburstData,"breadcrumbs":currentBreadcrumbData}])
                    } else {
                        //get breadcrumb data and redraw breadcrumb
                        currentBreadcrumbData = getBreadcrumbs(d);
                        drawBreadcrumbs(currentBreadcrumbData);
                        //if expandable, add foldoutdata
                        if(d.data.expandable !== undefined){
                            addFoldoutData(d);
                        }
                        //redraw sunburst and zoom.
                        drawSunburst(d,false);
                        zoomToBounds(d.data.expandable === undefined ? false : true,1000);
                        if(d.data.name === "30 Day"){
                            mallMap.stackedBarChart.changeFilter("all");
                        } else if (d.data.relative !== undefined){
                            mallMap.stackedBarChart.changeFilter(d.data.name.toLowerCase());
                        }
                    }
                }
            });

        pathGroup.select(".pathLabel")
            .attr("opacity",1)
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .text(pathText)
            .attr("transform", function(d) {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2;
                return "rotate(" + (x - 90) + ") translate(" + y + ",0) rotate(" + (x < 180 ? 0 : 180) + ")";
            })
            .attr("fill", d => {
                while (!d.data.colors[selectedColor] && d.parent) d = d.parent;
                return d3.lab(d.data.colors[selectedColor] || mallMap.colors.fillColor).l < 60 ? mallMap.colors.lightColor
                    : mallMap.colors.darkColor;
            });
    }

    function addFoldoutData(d){


        //copy the hierarchy
        var myCopy = {"value":d.value,"name":d.data.name,"id":d.data.id,"colors":d.data.colors,"children":[]};
        addChildren(d.children,myCopy);
        //flatten it and add partition/hierarchy
        var flattenCopy = getPartition(getHierarchy(myCopy));
        flattenCopy = flattenCopy.descendants();
        //map foldoutPath for copied data.
        flattenCopy.map(m => m.foldoutPath = arc(m));
        d.descendants().map(function(m){
            //add foldoutPath,dimensions + transform to current data
            var myFoldout = flattenCopy.find(f => f.data.id === m.data.id);
            m.foldoutPath = myFoldout.foldoutPath;
            m.foldoutWidth = myFoldout.x1 - myFoldout.x0;
            m.foldoutHeight = myFoldout.depth === 0 ? 0 : (myFoldout.y0 + myFoldout.y1)/2;
            m.foldoutTransformX = myFoldout.depth === 0 ? 90 : (myFoldout.x0 + myFoldout.x1) / 2 * 180 / Math.PI;
        });

        function addChildren(myDataset,currentCopy){
            myDataset.forEach(function(c){
                var myValue = c.value;
                if(d.data.relative === true){
                    myValue = c.data.relativeValue;
                }
                currentCopy.children.push({
                    "value":myValue,
                    "name":c.data.name,
                    "id":c.data.id,
                    "colors":c.data.colors
                })
                var newChild = currentCopy.children[currentCopy.children.length-1];
                if(c.children !== undefined){
                    newChild.children = [];
                    addChildren(c.children,newChild)
                }
            })
        }
    }

    function drawBreadcrumbs(breadcrumbData){

        //sort data and select svg
        breadcrumbData = breadcrumbData.sort((a,b) => d3.ascending(a.depth,b.depth));
        var mySvg = d3.select("." + breadcrumbSvg);
        //join data
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
                if(midTransition === false){
                    var myRoot = root.descendants().find(f => f.depth === d.depth && f.data.name === d.label);
                    var myDepth = d.depth;
                    if(d.label === "BACK"){
                        myRoot = d.data;
                        myDepth = d3.min(myRoot,m => m.depth);
                        if(d.depth === 0){allData = true};
                        selectedColor = "functional";
                    }
                    var allData = false;
                    if(myDepth > 0) {
                        //reset breadcrumbs if > 0
                        var breadcrumbData = getBreadcrumbs(myRoot);
                        if(myRoot.data === undefined){
                            breadcrumbData = currentBreadcrumbData;
                        }
                        drawBreadcrumbs(breadcrumbData);
                        currentBreadcrumbData = breadcrumbData;
                    } else {
                        //or reset to default breadcrumb
                        allData = true;
                        drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"}]);
                        currentBreadcrumbData = [{"depth":0,"label":"Home","fill":"white"}];
                    }
                    var expandable = false;
                    if(myRoot.data === undefined){
                        if(myRoot.find(f => f.depth === myDepth).data.expandable !== undefined){
                            expandable = true;
                        }
                    } else {
                        expandable = myRoot.data.expandable !== undefined ? true : false;
                        addFoldoutData(myRoot);
                    }
                    //draw chart and zoom.
                    drawSunburst(myRoot,allData);
                    zoomToBounds(expandable,1000);
                }
            })

        breadcrumbGroup.select(".breadcrumbLabel")
            .attr("pointer-events","none")
            .attr("id",(d,i) => "breadcrumbLabel" + i)
            .attr("text-anchor","middle")
            .attr("font-size",10)
            .attr("y",16)
            .text(d => d.label);

        var breadcrumbX = 10;

        //loop through and position breadcrumb rects dependent on label position
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

        //loop through and add breadcrumb for each depth;
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

    function getBreadcrumbsBack(d){

        debugger;
        //loop through and add breadcrumb for each depth;
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

    function getPathFill(d){
        return d.depth === 0 ? "transparent" : (d.data.colors[selectedColor] || mallMap.colors.fillColor);
    }

    my.drawRelativeGraph = function(graphData) {
        const breadcrumbData = getBreadcrumbs(graphData);
        drawBreadcrumbs(breadcrumbData);
        //if expandable, add foldoutdata
        if(graphData.data.expandable !== undefined){
            addFoldoutData(graphData);
        }
        //redraw sunburst and zoom.
        drawSunburst(graphData,false);
        zoomToBounds(graphData.data.expandable === undefined ? false : true,1000);

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

function tooltipMallMapChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        selectedColor = "";

    function my(svg) {


        const chartWidth = Math.min(width, height);

        const radius = chartWidth/2;
        const translateStr = "translate(" + (width/2) + "," + (height/2) + ")";

        const myHierarchy = d3.hierarchy(myData);
        myHierarchy.sum(d => d.children ? 0 : isNaN(d.value) ? 1 : d.value);
        const root = d3.partition().size([2 * Math.PI, radius*1.4])(myHierarchy);

        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        const pathGroup = svg.selectAll('.pathGroup' + myClass)
            .data(root.descendants())
            .join(function(group){
                var enter = group.append("g").attr("class","pathGroup" + myClass);
                enter.append("path").attr("class","tooltipMiniMapPath");
                return enter;
            });

        pathGroup
            .attr("transform",translateStr);

        pathGroup.select(".tooltipMiniMapPath")
            .attr("fill",  d => d.data.colors[selectedColor] === undefined ? "white" : d.data.colors[selectedColor])
            .attr("d", arc);

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

    return my;
}

function miniMallMapChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="";

    function my(svg) {

        const buttons = ["bar","tile","map","compare","file"];
        const buttonIcons = {"map":"\uf185","fan":"\uf863","bar":"\uf080","tile":"\uf5fd","map":"\uf59f","compare":"\uf640","file":"\uf56d"};

        const svgWidth = +d3.select("." + myClass + "Svg").attr("width");

        const chartWidth = Math.min(width, height);
        const buttonAvailableWidth = svgWidth - 10 - (chartWidth*1.4);
        const buttonWidth = 110;
        let buttonTransformX = svgWidth - ((buttonWidth+7)*buttons.length) - (chartWidth*1.4) - 10;
        if(buttonAvailableWidth < ((buttonWidth+7)*buttons.length)){
            d3.select("." + myClass + "Svg").style("width",(((buttonWidth+5)*buttons.length) + (chartWidth*1.4) + 10) + "px")
            buttonTransformX = 0;
        }

        const radius = chartWidth/2;
        const translateStr = "translate(" + ((width/2) + (radius * 0.2)) + "," + (height/2) + ")";

        const myHierarchy = d3.hierarchy(myData);
        myHierarchy.sum(d => d.children ? 0 : isNaN(d.value) ? 1 : d.value);
        const root = d3.partition().size([2 * Math.PI, radius*1.4])(myHierarchy);

        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        const pathGroup = svg.selectAll('.pathGroup' + myClass)
            .data(root.descendants())
            .join(function(group){
                var enter = group.append("g").attr("class","pathGroup" + myClass);
                enter.append("path").attr("class","miniMapPath");
                return enter;
            });

        pathGroup
            .attr("transform",translateStr);

        pathGroup.select(".miniMapPath")
            .attr("id",d => "miniMap" + d.data.id)
            .attr("fill", "#707070")
            .attr("d", arc);

        const buttonGroup = svg.selectAll('.buttonGroup' + myClass)
            .data(buttons)
            .join(function(group){
                var enter = group.append("g").attr("class","buttonGroup" + myClass);
                enter.append("rect").attr("class","buttonItem buttonRect");
                enter.append("text").attr("class","buttonItem buttonIcon fal");
                enter.append("text").attr("class","buttonItem buttonLabel");
                return enter;
            });

        buttonGroup
            .attr("id",d => d)
            .attr("opacity",d => d === "bar" ? 1 : 0.4)
            .attr("cursor", "pointer");

        buttonGroup.select(".buttonRect")
            .attr("width",buttonWidth)
            .attr("x",(d,i) => i * (buttonWidth + 7))
            .attr("rx",4)
            .attr("ry",4)
            .attr("height",30)
            .attr("transform","translate(" + (10 + (chartWidth*1.4) + buttonTransformX) + ",5)")
            .on("click",function(event,d){
                d3.selectAll(".buttonItem").attr("opacity",0.4);
                if(d === "bar"){
                    d3.selectAll("#bar").attr("opacity",1);
                    drawStackedBar();
                } else if(d === "tile"){
                    d3.selectAll("#tile").attr("opacity",1);
                    drawLineMultiples();
                } else if(d === "map"){
                        d3.selectAll("#map").attr("opacity",1);
                        drawWellMap();
                } else if(d === "file"){
                    d3.selectAll("#file").attr("opacity",1);

                    var hiddenElement = document.createElement('a');
                    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(JsonToCSV(mallMap.extraChartData.data));
                    hiddenElement.target = '_blank';
                    hiddenElement.download = 'output.csv';
                    hiddenElement.click();
                    hiddenElement.remove();

                    function JsonToCSV(myArray){
                        var myKeys = Object.keys(myArray[0]);
                        myKeys = myKeys.filter(f => f !== "long_lat");
                        myKeys = myKeys.concat(["long","lat"])
                        var csvStr = myKeys.join(",") + "\n";

                        myArray = myArray.sort((a,b) => d3.ascending(a.well_id,b.well_id));
                        myArray.forEach(element => {
                            if(element["position_flag"] !== ""){
                                myKeys.forEach(function(k){
                                    if(k !== "long" && k !== "lat"){
                                        csvStr += element[k] + ","
                                    } else {
                                        if(k === "long"){
                                            csvStr += element["long_lat"][0] + ","
                                        } else {
                                            csvStr += element["long_lat"][1]
                                        }
                                    }
                                })
                                csvStr += "\n";
                            }
                        })
                        return csvStr;
                    }

                }else {
                    d3.selectAll("#compare").attr("opacity",1);
                    drawPyramid();
                }
            });

        buttonGroup.select(".buttonIcon")
            .attr("pointer-events","none")
            .attr("id",d => d)
            .attr("font-size",20)
            .attr("x",(d,i) => i * (buttonWidth + 7))
            .attr("y",15 + 7)
            .text(d => buttonIcons[d])
            .attr("fill","#707070")
            .attr("transform","translate(" + (15 + (chartWidth*1.4) + buttonTransformX) + ",5)");

        buttonGroup.select(".buttonLabel")
            .attr("pointer-events","none")
            .attr("id",d => d)
            .attr("font-size",14)
            .attr("x",(d,i) => i * (buttonWidth + 7))
            .attr("y",15 + 5.5)
            .attr("text-anchor","end")
            .text(d => d.toUpperCase())
            .attr("fill","#707070")
            .attr("transform","translate(" + (buttonWidth + 3 + (chartWidth*1.4) + buttonTransformX) + ",5)");

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

    return my;
}


function stackedBarChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        stackType = "well_orientation",
        currentData = [],
        currentDataIndex = "0",
        barLayout = "stack",
        axisScales = {},
        rangeRemaining = 0,
        axisTransforms = {},
        maxVals = {},
        xScale = "",
        yScale = "",
        yScaleProportion = "",
        svg = "",
        filterOptions = [];

    function my(mySvg) {
        svg = mySvg;

        let dateGroup = d3.group(myData.data, d => d.date);
        dateGroup = Array.from(dateGroup);

        currentData = getDatabyStackOption();

        let xDomain = new Set();
        currentData[currentDataIndex].forEach(d => xDomain.add(d.date));
        xDomain = Array.from(xDomain).sort((a,b) => d3.ascending(a,b));

        xScale = d3.scaleBand().domain(xDomain).range([0,width]);
        const xScaleTime = d3.scaleTime().domain(d3.extent(xDomain)).range([0,width]);
        yScaleProportion = d3.scaleLinear().domain([0,1]).range([height,0]);
        yScale = "",scaleNumber = 0, myKeys = "",yMax = 0;

        if(d3.select(".xAxis" + myClass)._groups[0][0] === null) {
            svg.append("g").attr("class","chartGroup"  + myClass)
            svg.append("g").attr("class","axis xAxis" + myClass);
            svg.append("g").attr("class","axis yAxis" + myClass);
            svg.append("g").attr("class","axis yAxisProportion" + myClass);
            svg.append("g").attr("class","zeroLine" + myClass);
            svg.append("path").attr("class","ipcLine" + myClass);
        }

        d3.select(".xAxis" + myClass)
            .call(d3.axisBottom(xScaleTime).tickValues(d3.extent(xDomain)).tickFormat(d => d3.timeFormat("%d %b %y")(d)).tickSizeOuter(0))
            .attr("transform","translate(" + margins.left + "," + (height + margins.top) + ")");

        d3.selectAll(".xAxis" + myClass + " .tick text")
            .style("text-anchor",(d,i) => i === 0 ? "start" : "end")
            .attr("y",4);

        d3.select(".yAxisProportion" + myClass)
            .call(d3.axisLeft(yScaleProportion).tickFormat(d => d > 0 ? d3.format(".0%")(d) : "").tickSizeOuter(0))
            .attr("transform","translate(" + margins.left + "," + margins.top + ")");

        d3.selectAll(".yAxisProportion" + myClass + " .tick text")
            .attr("x",-4)

        drawBar(currentData[currentDataIndex],0);

        filterOptions = ["all","top 25","bottom 25"];

        const filterGroup = svg.selectAll('.filterGroup' + myClass)
            .data(filterOptions)
            .join(function(group){
                var enter = group.append("g").attr("class","filterGroup" + myClass);
                enter.append("text").attr("class","filterText");
                return enter;
            });

        filterGroup.select(".filterText")
            .attr("id",(d,i) => "filterText" + i)
            .attr("fill",d => d.includes("top") ? "#31a354":(d.includes("bottom") ? "#cb181d" : "#333333"))
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.4)
            .attr("y",height + margins.top + (margins.bottom*0.4))
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.toUpperCase())
            .attr("transform","translate(" + margins.left + ",0)")
            .on("click",filterClick);

        var filterX = 0;
        d3.selectAll(".filterText").each(function(){
            d3.select(this).attr("x",filterX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            filterX += (textWidth + 5);
        })

        filterGroup.attr("transform","translate(" + ((width - filterX)/2) + ",0)");

        const barOptions = ["stack","split","proportion"];

        const barOptionsGroup = svg.selectAll('.barOptions' + myClass)
            .data(barOptions)
            .join(function(group){
                var enter = group.append("g").attr("class","barOptions" + myClass);
                enter.append("text").attr("class","barOptionsText");
                return enter;
            });

        barOptionsGroup.select(".barOptionsText")
            .attr("id",(d,i) => "barOptionsText" + i)
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.4)
            .attr("y",height + margins.top + (margins.bottom*0.4) + 25)
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.toUpperCase())
            .attr("transform","translate(" + margins.left + ",0)")
            .on("click",function(event,d){
                d3.selectAll(".barOptionsText").attr("opacity",0.4);
                d3.select(this).attr("opacity",1);
                barLayout = d;
                drawBar(currentData[currentDataIndex],1000)
            });

        var barOptionsX = 0;
        d3.selectAll(".barOptionsText").each(function(){
            d3.select(this).attr("x",barOptionsX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            barOptionsX += (textWidth + 5);
        })

        barOptionsGroup.attr("transform","translate(" + ((width - barOptionsX)/2) + ",0)");

        const stackOptions = ["well_orientation","op_code","route_name"];

        const stackOptionsGroup = svg.selectAll('.stackOptionsGroup' + myClass)
            .data(stackOptions)
            .join(function(group){
                var enter = group.append("g").attr("class","stackOptionsGroup" + myClass);
                enter.append("text").attr("class","stackOptionsText");
                return enter;
            });

        stackOptionsGroup.select(".stackOptionsText")
            .attr("id",(d,i) => "stackOptionsText" + i)
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.4)
            .attr("y",(margins.top * 0.6) - 20)
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.replace(/_/g,' ').toUpperCase())
            .attr("transform","translate(" + margins.left + ",0)")
            .on("click",function(event,d){
                d3.selectAll(".stackOptionsText").attr("opacity",0.4);
                d3.select(this).attr("opacity",1);
                stackType = d;
                currentData = getDatabyStackOption();
                drawBar(currentData[currentDataIndex],0);
                drawLegend(myKeys);

            });

        drawLegend(myKeys);

        function drawLegend(myLegendKeys){

            myLegendKeys = JSON.parse(JSON.stringify(myLegendKeys));
            myLegendKeys.push("IPC");

            const legendGroup = svg.selectAll('.legendGroup' + myClass)
                .data(myLegendKeys)
                .join(function(group){
                    var enter = group.append("g").attr("class","legendGroup" + myClass);
                    enter.append("rect").attr("class","legendRect");
                    enter.append("text").attr("class","legendLabel");
                    return enter;
                });

            legendGroup.select(".legendRect")
                .attr("id",(d,i) => "legendRect" + i)
                .attr("y",(margins.top*0.6))
                .attr("width",15)
                .attr("height",10)
                .attr("fill",(d,i) => d === "IPC" ? "#31a354" : d3.schemeBlues[scaleNumber][scaleNumber-(i+1)]);

            legendGroup.select(".legendLabel")
                .attr("id",(d,i) => "legendLabel" + i)
                .attr("y",(margins.top*0.6) + 9)
                .attr("font-size",10)
                .style("font-weight","normal")
                .text(d => d.toUpperCase());


            var legendX = 20,currentY = 0,maxLegendX=0;
            d3.selectAll(".legendLabel").each(function(d,i){
                d3.select("#legendRect" + i).attr("x", legendX-18).attr("transform","translate(0," + currentY + ")");
                d3.select(this).attr("x",legendX).attr("transform","translate(0," + currentY + ")");
                var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
                legendX += (textWidth + 22);
                maxLegendX = Math.max(maxLegendX,legendX)
                if(legendX > width){
                    legendX = 20;
                    currentY += 15;
                }
            })

            legendGroup.attr("transform","translate(" + (((width - maxLegendX)/2)+margins.left) + ",0)");

        }


        var stackX = 0;
        d3.selectAll(".stackOptionsText").each(function(){
            d3.select(this).attr("x",stackX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            stackX += (textWidth + 5);
        })

        stackOptionsGroup.attr("transform","translate(" + ((width - stackX)/2) + ",0)");


        function getDatabyStackOption(){

            let myKeys = new Set();
            myData.data.forEach(d => myKeys.add(d[stackType]));
            myKeys = Array.from(myKeys);

            const barData = [];
            const barDataTop25 = [];
            const barDataBottom25 = [];

            dateGroup.forEach(function(d){
                var myTotal = d3.sum(d[1], s => s.ipc_revenue);
                var actualTotal = d3.sum(d[1], s => s.actual_revenue);
                var stackData = Array.from(d3.rollup(d[1],v => d3.sum(v, s => s.actual_revenue)
                    ,g => g[stackType]));
                var ipcStackData = Array.from(d3.rollup(d[1],v => d3.sum(v, s => s.ipc_revenue)
                    ,g => g[stackType]));
                barData.push(getEntry(d[0],myTotal,actualTotal,stackData,ipcStackData));
                var filteredData = d[1].filter(f => f.position_flag === "topN")
                myTotal = d3.sum(filteredData, s => s.ipc_revenue);
                actualTotal = d3.sum(filteredData, s => s.actual_revenue);
                stackData = Array.from(d3.rollup(filteredData,v => d3.sum(v, s => s.actual_revenue),g => g[stackType]));
                ipcStackData = Array.from(d3.rollup(filteredData,v => d3.sum(v, s => s.ipc_revenue),g => g[stackType]));
                barDataTop25.push(getEntry(d[0],myTotal,actualTotal,stackData,ipcStackData));
                filteredData = d[1].filter(f => f.position_flag === "bottomN")
                myTotal = d3.sum(filteredData, s => s.ipc_revenue);
                actualTotal = d3.sum(filteredData, s => s.actual_revenue);
                stackData = Array.from(d3.rollup(filteredData,v => d3.sum(v, s => s.actual_revenue)
                    ,g => g[stackType]));
                ipcStackData = Array.from(d3.rollup(filteredData,v => d3.sum(v, s => s.actual_revenue)
                    ,g => g[stackType]));
                barDataBottom25.push(getEntry(d[0],myTotal,actualTotal,stackData,ipcStackData));
            })

            return [barData,barDataTop25,barDataBottom25,myKeys];

            function getEntry(myDate,ipcTotal,actualTotal,dataStack,ipcStackData){

                var currentEntry = {
                    "date":myDate,
                    "total": ipcTotal,
                    "actual_total":actualTotal,
                    "remainder_proportion":(ipcTotal-actualTotal)/ipcTotal
                }
                if(currentEntry.remainder_proportion < 0){currentEntry.remainder_proportion = 0};
                if(currentEntry.remainder_proportion > 1){currentEntry.remainder_proportion = 1};

                myKeys.forEach(function(k){
                    var findValue = dataStack.find(f => f[0] === k);
                    if(findValue === undefined){
                        currentEntry[k] = 0;
                        currentEntry[k + "_proportion"] = 0
                    } else {
                        currentEntry[k] = findValue[1] < 0 ? 0 : findValue[1];
                        currentEntry[k + "_proportion"] = findValue[1]/ipcTotal
                    }
                    if(currentEntry[k + "_proportion"] < 0){currentEntry[k + "_proportion"] = 0};
                    if(currentEntry[k + "_proportion"] > 1){currentEntry[k + "_proportion"] = 1};
                    var findIpcValue = ipcStackData.find(f => f[0] === k);
                    if(findIpcValue === undefined){
                        currentEntry[k + "_total"] = 0;
                    } else {
                        currentEntry[k + "_total"] = findIpcValue[1] < 0 ? 0 : findIpcValue[1];
                    }
                });
                return currentEntry
            }
        }
    }

    function drawBar(myBarData,transitionTime){

        yMax = d3.max(myBarData, d => Math.max(d.total,d.actual_total));
        yScale = d3.scaleLinear().domain([0,yMax]).range([height,0]);
        myKeys = currentData[3];
        if(barLayout === "proportion"){
            if(myKeys.indexOf("remainder") === -1){
                myKeys.push("remainder");
            }
        } else {
            myKeys = myKeys.filter(f => f !== "remainder");
        }
        scaleNumber = myKeys.length < 4 ? 4 : (myKeys.length > 9 ? 9 : myKeys.length);
        rangeRemaining =  height - ((myKeys.length-1)*10);

        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.total));

        const lineProportion = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScaleProportion(1));

        var currentAxisTransform = 0;

        maxVals = [];
        myKeys.forEach(function(d,i){
            maxVals[i] = d3.max(myBarData, s => Math.max(s[d], s[d + "_total"]));
        })
        var totalMax = d3.sum(maxVals);

        myKeys.forEach(function(d,i){
            var proportion = maxVals[i]/totalMax;
            axisScales[d] = d3.scaleLinear().domain([0,maxVals[i]]).range([rangeRemaining*proportion,0]);
            axisTransforms[d] = currentAxisTransform;
            currentAxisTransform += (10 + (rangeRemaining*proportion))
            if(myKeys.length === 1 && i === 0 || (maxVals.filter(f => f === 0).length >= (myKeys.length - 1))){
                axisScales[d] = yScale;
                currentAxisTransform = 0;
            }
        })

        const splitAxisGroup = svg.selectAll('.splitAxisGroup' + myClass)
            .data(myKeys)
            .join(function(group){
                var enter = group.append("g").attr("class","splitAxisGroup" + myClass);
                enter.append("g").attr("class","axis splitYAxis" + myClass);
                enter.append("path").attr("class","splitPath splitIpcLine" + myClass);
                return enter;
            });

        splitAxisGroup.select(".splitYAxis" + myClass)
            .attr("visibility",barLayout === "split" ? "visible":"hidden")
            .each(function(d){
                if(barLayout !== "proportion"){
                    d3.select(this)
                        .attr("transform",d => "translate(" + margins.left + "," + (margins.top + axisTransforms[d]) + ")")
                        .call(d3.axisLeft(axisScales[d]).ticks(2).tickFormat(d => d > 0 ? d3.format("$.2s")(d) : "").tickSizeOuter(0));
                }});

        splitAxisGroup.select(".splitIpcLine" + myClass)
            .attr("visibility",barLayout === "split" ? "visible":"hidden")
            .attr("d",d => barLayout === "proportion" ? "" : d3.line().x(l => xScale(l.date)).y(l => axisScales[d](l[d + "_total"]))(myBarData))
            .attr("fill","none")
            .attr("stroke","#31a354")
            .attr("transform",d => "translate(" + margins.left + "," + (margins.top + axisTransforms[d]) + ")")
            .attr("opacity",0)
            .interrupt()
            .transition()
            .delay(200)
            .duration(transitionTime)
            .attr("opacity",1);

        d3.selectAll(".splitYAxis" + myClass + " .tick text")
            .attr("x",-4)

        if(barLayout === "proportion"){
            var proportionKeys = JSON.parse(JSON.stringify(myKeys));
            proportionKeys = proportionKeys.map(d => d = d + "_proportion");
        }
        const stackedData = d3.stack()
            .keys(barLayout === "proportion" ? proportionKeys : myKeys)
            (myBarData);

        d3.select(".yAxisProportion" + myClass)
            .attr("visibility",barLayout === "proportion" ? "visible":"hidden");

        d3.select(".yAxis" + myClass)
            .attr("visibility",barLayout === "stack" ? "visible":"hidden")
            .call(d3.axisLeft(yScale).tickFormat(d => d > 0 ? d3.format("$.2s")(d) : "").tickSizeOuter(0))
            .attr("transform","translate(" + margins.left + "," + margins.top + ")");

        d3.selectAll(".yAxis" + myClass + " .tick text")
            .attr("x",-4)

        d3.select(".ipcLine" + myClass)
            .attr("visibility",barLayout === "stack" || barLayout === "proportion" ? "visible":"hidden")
            .attr("d",barLayout === "proportion" ? lineProportion(myBarData) : line(myBarData))
            .attr("fill","none")
            .attr("stroke","#31a354")
            .attr("transform","translate(" + margins.left + "," + margins.top + ")")
            .attr("opacity",0)
            .interrupt()
            .transition()
            .duration(transitionTime)
            .attr("opacity",1);

        const stackGroup = svg.select(".chartGroup" + myClass).selectAll('.stackGroup' + myClass)
            .data(stackedData)
            .join(function(group){
                var enter = group.append("g").attr("class","stackGroup" + myClass);
                enter.append("g").attr("class","stackGroup");
                return enter;
            });

        stackGroup.select(".stackGroup")
            .attr("fill",(d,i) => myKeys[i] === "remainder" ? "#fee0d2" : d3.schemeBlues[scaleNumber][scaleNumber-(i+1)])
            .attr("transform","translate(" + margins.left + "," + margins.top + ")");

        const barGroup = stackGroup.select(".stackGroup").selectAll('.barGroup' + myClass)
            .data(function(d,i){
                var myDataset = d;
                myDataset.map(m => m.key = myKeys[i]);
                return myDataset;
            })
            .join(function(group){
                var enter = group.append("g").attr("class","barGroup" + myClass);
                enter.append("rect").attr("class","stackedRect");
                return enter;
            });

        barGroup.select(".stackedRect")
            .attr("x",d => xScale(d.data.date))
            .attr("width",xScale.bandwidth()-1)
            .interrupt()
            .transition()
            .duration(transitionTime)
            .attr("height",getBarHeight)
            .attr("y",getBarYValue)

    }

    function getBarHeight(d){
        if(barLayout === "split"){
            return axisScales[d.key](0) - axisScales[d.key](d.data[d.key]);
        } else if (barLayout === "stack"){
            return yScale(d[0]) - yScale(d[1])
        } else {
            return yScaleProportion(d[0]) - yScaleProportion(d[1])
        }
    }
    function getBarYValue(d){

        if(barLayout === "split"){
            return axisScales[d.key](d.data[d.key]) + axisTransforms[d.key]
        } else if (barLayout === "stack"){
            return  yScale(d[1])
        } else {
            return  yScaleProportion(d[1])
        }
    }

    function filterClick(event,d,i){
        d3.selectAll(".filterText").attr("opacity",0.4);
        d3.select("#filterText" + i).attr("opacity",1);
        if(d === "all"){
            mallMap.sunburstChart.drawRelativeGraph(mallMap.relativeNodes["30 Day"])
            currentDataIndex = 0;
        } else if (d === "top 25"){
            mallMap.sunburstChart.drawRelativeGraph(mallMap.relativeNodes["Top 25"])
            currentDataIndex = 1;
        } else {
            mallMap.sunburstChart.drawRelativeGraph(mallMap.relativeNodes["Bottom 25"])
            currentDataIndex = 2;
        }
        drawBar(currentData[currentDataIndex],0);
    }

    my.changeFilter = function(myVal){
        console.log(myVal,filterOptions.indexOf(myVal));
        filterClick({},myVal,filterOptions.indexOf(myVal));
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

    my.margins = function(value) {
        if (!arguments.length) return margins;
        margins = value;
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

    return my;
}


function lineMultipleChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        filterType = "topN",
        yScaleUniversal = true;

    function my(svg) {



        var chartWidth = (width - margins.left - margins.right)/5;
        var chartHeight = (height - margins.top - margins.bottom)/5;
        const xScale = d3.scaleTime().domain(d3.extent(myData.data, d => d.date)).range([0,chartWidth-10]);

        drawMultiples();

        function drawMultiples(){
            var filteredData = myData.data.filter(f => f.position_flag === filterType);

            var wellGroup = d3.group(filteredData, d => d.well_id);
            wellGroup = Array.from(wellGroup);

            const yScale = d3.scaleLinear().domain([0,d3.max(filteredData, d => Math.max(d.ipc_revenue,d.actual_revenue))])
                .range([chartHeight-10,0]);
            const yScales = {};

            wellGroup.forEach(function(d){
                if(yScaleUniversal === true){
                    yScales[d[0]] = yScale;
                } else {
                    yScales[d[0]] = d3.scaleLinear()
                        .domain([0,d3.max(d[1], d => Math.max(d.ipc_revenue,d.actual_revenue))])
                        .range([chartHeight-10,0])
                }
            })

            const line = d3.line()
                .x(d => xScale(d.date))
                .y(d => yScales[d.well_id](d.ipc_revenue));

            const area = d3.area()
                .x(d => xScale(d.date))
                .y0(d => yScales[d.well_id](d.actual_revenue))
                .y1(yScale(0));

            const chartGroup = svg.selectAll('.chartGroup' + myClass)
                .data(wellGroup)
                .join(function(group){
                    var enter = group.append("g").attr("class","tileGroup chartGroup" + myClass);
                    enter.append("rect").attr("class","wellRect");
                    enter.append("text").attr("class","wellLabel");
                    enter.append("text").attr("class","wellMaxLabel");
                    enter.append("path").attr("class","actualArea");
                    enter.append("path").attr("class","ipcLine");
                    return enter;
                });

            chartGroup
                .attr("id",d => "well" + d[0])
                .attr("transform",(d,i) => "translate(" + ((i % 5) * chartWidth)
                    + "," + (parseInt(i/5) * chartHeight) + ")")

            chartGroup.select(".ipcLine")
                .attr("d",d => line(d[1]))
                .attr("fill","none")
                .attr("stroke","#31a354")
                .attr("transform","translate(" + (margins.left+5) + "," + (margins.top+5) + ")");

            chartGroup.select(".actualArea")
                .attr("d",d => area(d[1]))
                .attr("fill",d3.schemeBlues[4][3])
                .attr("fill-opacity",0.4)
                .attr("stroke","none")
                .attr("transform","translate(" + (margins.left+5) + "," + (margins.top+5) + ")");

            chartGroup.select(".wellLabel")
                .attr("font-size",8)
                .attr("x",chartWidth/2)
                .attr("y",15)
                .attr("text-anchor","middle")
                .text(d => myData.wellNames[d[0]].toUpperCase())
                .attr("transform","translate(" + (2.5 + margins.left) + "," + (2.5 + margins.top) + ")")

            chartGroup.select(".wellMaxLabel")
                .attr("font-size",8)
                .attr("fill","#A0A0A0")
                .attr("x",2)
                .attr("y",-2)
                .text(d => d3.format("$,.0f")(yScales[d[0]].domain()[1]))
                .attr("transform","translate(" + (2.5 + margins.left) + "," + (2.5 + margins.top) + ") rotate(90)")


            chartGroup.select(".wellRect")
                .attr("width",chartWidth - 5)
                .attr("height",chartHeight - 5)
                .attr("fill","#F0F0F0")
                .attr("transform","translate(" + (2.5 + margins.left) + "," + (2.5 + margins.top) + ")")
        }

        const filterOptions = ["top 25","bottom 25"];

        const filterGroup = svg.selectAll('.filterGroup' + myClass)
            .data(filterOptions)
            .join(function(group){
                var enter = group.append("g").attr("class","filterGroup" + myClass);
                enter.append("text").attr("class","filterText");
                return enter;
            });

        filterGroup.select(".filterText")
            .attr("id",(d,i) => "filterText" + i)
            .attr("fill",d => d.includes("top") ? "#31a354":"#cb181d")
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.2)
            .attr("y",margins.top/2)
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.replace(/_/g,' ').toUpperCase())
            .on("click",function(event,d){
                d3.selectAll(".filterText").attr("opacity",0.2);
                d3.select(this).attr("opacity",1);
                if(d === "top 25"){
                    filterType = "topN";
                } else {
                    filterType = "bottomN";
                }
                drawMultiples();
            });


        var filterX = margins.left;
        d3.selectAll(".filterText").each(function(){
            d3.select(this).attr("x",filterX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            filterX += (textWidth + 5);
        });


        const axisOptions = ["universal","individual"];

        const axisGroup = svg.selectAll('.axisGroup' + myClass)
            .data(axisOptions)
            .join(function(group){
                var enter = group.append("g").attr("class","axisGroup" + myClass);
                enter.append("text").attr("class","axisText");
                return enter;
            });

        axisGroup.select(".axisText")
            .attr("id",(d,i) => "axisText" + i)
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.4)
            .attr("y",margins.top/2)
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.replace(/_/g,' ').toUpperCase())
            .on("click",function(event,d){
                d3.selectAll(".axisText").attr("opacity",0.4);
                d3.select(this).attr("opacity",1);
                if(d === "universal"){
                    yScaleUniversal = true;
                } else {
                    yScaleUniversal = false;
                };
                drawMultiples();
            });


        var axisX = margins.left;
        d3.selectAll(".axisText").each(function(){
            d3.select(this).attr("x",axisX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            axisX += (textWidth + 5);
        })

        axisGroup.attr("transform","translate(" + (width - margins.right - axisX) + ",0)");


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

    my.margins = function(value) {
        if (!arguments.length) return margins;
        margins = value;
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

    return my;
}



function pyramidChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        axisWidth = 20,
        scaleType = "uniform";

    function my(svg) {

        var groupData = [{"name":"Bottom 25","align":"left","dataValue":"bottomN","colour":"red","sort_order":"ascending"},
            {"name":"Top 25","align":"right","dataValue":"topN","colour":"green","sort_order":"descending"}];

        var xMax = 0, ySet = new Set();
        groupData.forEach(function(d,index){
            var filteredData = myData.data.filter(f => f.position_flag === d.dataValue);

            var values = Array.from(d3.rollup(filteredData, v => d3.sum(v, s => Math.abs(s.actual_revenue - s.ipc_revenue)), d => d.well_id));
            currentData = [];
            values.forEach(function(a,i){
                currentData.push({
                    "well_id":a[0],
                    "wellName":myData.wellNames[a[0]],
                    "value":a[1],
                    "ipc":d3.sum(filteredData, s => s.well_id === a[0] ? s.ipc_revenue : 0),
                    "actual":d3.sum(filteredData, s => s.well_id === a[0] ? s.actual_revenue : 0),
                    "align":d.align,
                    "colour":d.colour,
                    "index":index,
                    "name":d.name
                })
                ySet.add(i);
            })
            xMax = Math.max(xMax,d3.max(currentData, d => d.value));
            currentData = currentData.sort((a,b) => d3[d.sort_order](a.value,b.value));
            currentData.forEach((d,i) => d.position = i);
            d.data = currentData
        })

        ySet = Array.from(ySet.values());
        var xScale = d3.scaleLinear().domain([0,xMax]).range([0,(width - margins.left - margins.right - axisWidth)/2])
        var yScale = d3.scaleBand().domain(ySet).range([0,height - margins.top - margins.bottom]);
        var xScales = [];
        changeScales();

        function changeScales(){
            groupData.forEach(function(d,i){
                if(scaleType === "uniform"){
                    xScales[i] = xScale;
                } else {
                    var myMax = d3.max(d.data, m => m.value);
                    xScales[i] = d3.scaleLinear().domain([0,myMax]).range([0,(width - margins.left - margins.right - axisWidth)/2])
                }
            })
        }

        if(d3.select(".xAxis" + myClass)._groups[0][0] === null) {
            svg.append("g").attr("class", "axis yAxisPyramid" + myClass)
        }

        d3.select(".yAxisPyramid" + myClass)
            .call(d3.axisLeft(yScale).tickSizeOuter(0))
            .attr("transform","translate(" + (width/2) + "," + margins.top + ")");

        d3.selectAll(".yAxisPyramid" + myClass + " path")
            .style("display","none");

        d3.selectAll(".yAxisPyramid" + myClass + " .tick text")
            .attr("x",0)
            .style("text-anchor","middle")

        drawBars();

        function drawBars(){
            const groupDataGroup = svg.selectAll('.groupDataGroup' + myClass)
                .data(groupData)
                .join(function(group){
                    var enter = group.append("g").attr("class","groupDataGroup" + myClass);
                    enter.append("line").attr("class","axisLine");
                    enter.append("text").attr("class","groupTitle");
                    enter.append("g").attr("class","barGroup");
                    return enter;
                });

            groupDataGroup.select(".groupTitle")
                .attr("x", d => (width/2) + (d.align === "left" ? -(axisWidth/2) : (axisWidth/2)))
                .attr("text-anchor",d => d.align === "left" ? "end" : "start")
                .attr("y",margins.top - 6)
                .text(d => d.name.toUpperCase());

            groupDataGroup.select(".axisLine")
                .attr("x1",d =>  (width/2) + (d.align === "left" ? -(axisWidth/2) : (axisWidth/2)))
                .attr("x2",d => (width/2) + (d.align === "left" ? -(axisWidth/2) : (axisWidth/2)))
                .attr("y1",margins.top)
                .attr("y2",height - margins.bottom)
                .attr("stroke-width",1)
                .attr("stroke","#A0A0A0");

            groupDataGroup.select(".barGroup")
                .attr("transform","translate(0," + margins.top + ")");

            const barGroup = groupDataGroup.select(".barGroup").selectAll('.barGroup' + myClass)
                .data(d => d.data)
                .join(function(group){
                    var enter = group.append("g").attr("class","barGroup" + myClass);
                    enter.append("rect").attr("class","pyramidBar");
                    enter.append("text").attr("class","pyramidLabel");
                    enter.append("text").attr("class","pyramidNameLabel");
                    return enter;
                });

            barGroup.select(".pyramidBar")
                .attr("id",d => "well" + d.well_id)
                .attr("x",d =>  (width/2) + (d.align === "right" ? (axisWidth/2): - (xScales[d.index](d.value) + (axisWidth/2))))
                .attr("y",d => yScale(d.position))
                .attr("width",d => xScales[d.index](d.value))
                .attr("height",d => yScale.bandwidth()-2)
                .attr("cursor","pointer")
                .attr("fill",d => d.colour)
                .on("mouseover",function(event,d){
                    d3.selectAll(".pyramidBar").attr("opacity",0.5);
                    d3.selectAll(".sunburstPath").attr("opacity",0.5);
                    d3.selectAll("#" + this.id).attr("opacity",1);
                    var svgBounds = d3.select("." + myClass + "Svg").node().getBoundingClientRect();
                    var tooltipText = "<strong></strong><span style=color:" + d.colour + ";'>" + d.name.toUpperCase() + "</span></strong><br><span style='font-weight:normal;'>Well: " + d.wellName
                        + " (" + d.well_id + ")<br>Difference: $" + d3.format(".3s")(d.value)
                        +  "<br>Ipc Revenue: $" + d3.format(".3s")(d.ipc)
                        + "<br>Actual Revenue: " + d3.format(".3s")(d.actual) + "</span>";

                        d3.select(".d3_tooltip")
                        .style("visibility","visible")
                        .style("top",(event.offsetY + svgBounds.y) + "px")
                        .style("left",(event.offsetX + svgBounds.x + 10) + "px")
                        .html(tooltipText);

                        d3.selectAll(".d3_tooltip").selectAll("svg").remove();
                        drawSvg("d3_tooltip_div");
                        drawTooltipMallMap(mallMap.mainData,"d3_tooltip_div",d.well_id);
                })
                .on("mouseout",function(){
                    d3.select(".d3_tooltip").style("visibility","hidden");
                    d3.selectAll(".pyramidBar").attr("opacity",1);
                    d3.selectAll(".sunburstPath").attr("opacity",1);
                })


            barGroup.select(".pyramidNameLabel")
                .attr("pointer-events","none")
                .attr("text-anchor",d => d.align === "left" ? "end" : "start")
                .attr("x",d =>  (width/2) + (d.align === "right" ? (axisWidth/2) + 2
                    : - 2 - (axisWidth/2)))
                .attr("y",d => yScale(d.position) + (yScale.bandwidth()/2) + 2)
                .attr("font-size",8)
                .attr("fill","white")
                .attr("font-weight","normal")
                .text(d => measureWidth(d.wellName) <= (xScales[d.index](d.value) + 4) ? d.wellName : "")

            barGroup.select(".pyramidLabel")
                .attr("id",d => "well" + d.well_id)
                .attr("text-anchor",d => d.align === "left" ? "end" : "start")
                .attr("x",d =>  (width/2) + (d.align === "right" ? ((axisWidth/2) + 2 + xScales[d.index](d.value))
                    : - ( 2 + xScales[d.index](d.value) + (axisWidth/2))))
                .attr("y",d => yScale(d.position) + (yScale.bandwidth()/2) + 2)
                .attr("font-size",8)
                .attr("fill","#707070")
                .attr("cursor","pointer")
                .attr("font-weight","normal")
                .text(d => "$" + d3.format(".3s")(d.value))
                .on("mouseover",function(event,d){
                    d3.selectAll(".pyramidBar").attr("opacity",0.5);
                    d3.selectAll(".sunburstPath").attr("opacity",0.5);
                    d3.selectAll("#" + this.id).attr("opacity",1);
                    var svgBounds = d3.select("." + myClass + "Svg").node().getBoundingClientRect();
                    var tooltipText = "<strong></strong><span style=color:" + d.colour + ";'>" + d.name.toUpperCase() + "</span></strong><br><span style='font-weight:normal;'>Well: " + d.wellName
                        + " (" + d.well_id + ")<br>Difference: $" + d3.format(".3s")(d.value)
                        +  "<br>Ipc Revenue: $" + d3.format(".3s")(d.ipc)
                        + "<br>Actual Revenue: " + d3.format(".3s")(d.actual) + "</span>";

                    d3.select(".d3_tooltip")
                        .style("visibility","visible")
                        .style("top",(event.offsetY + svgBounds.y) + "px")
                        .style("left",(event.offsetX + svgBounds.x + 10) + "px")
                        .html(tooltipText);

                    d3.selectAll(".d3_tooltip").selectAll("svg").remove();
                    drawSvg("d3_tooltip_div");
                    drawTooltipMallMap(mallMap.mainData,"d3_tooltip_div",d.well_id);
                })
                .on("mouseout",function(){
                    d3.select(".d3_tooltip").style("visibility","hidden");
                    d3.selectAll(".pyramidBar").attr("opacity",1);
                    d3.selectAll(".sunburstPath").attr("opacity",1);
                });
        }

        const axisOptions = ["Uniform Scales","Individual Scales"];

        const axisGroup = svg.selectAll('.axisGroup' + myClass)
            .data(axisOptions)
            .join(function(group){
                var enter = group.append("g").attr("class","axisGroup" + myClass);
                enter.append("text").attr("class","axisText");
                return enter;
            });

        axisGroup.select(".axisText")
            .attr("id",(d,i) => "axisText" + i)
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.4)
            .attr("y",margins.top-30)
            .attr("cursor","pointer")
            .attr("font-size",10)
            .text((d,i) => (i === 0 ? "" : "|    ") + d.replace(/_/g,' '))
            .on("click",function(event,d){
                d3.selectAll(".axisText").attr("opacity",0.4);
                d3.select(this).attr("opacity",1);
                scaleType = d.split(" ")[0].toLowerCase();
                changeScales();
                drawBars();
            });

        var axisX = margins.left;
        d3.selectAll(".axisText").each(function(){
            d3.select(this).attr("x",axisX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            axisX += (textWidth + 5);
        })

        axisGroup.attr("transform","translate(" + (width - 5 - axisX) + ",0)");

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

    return my;
}



function wellMap() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        mapData = [];

    function my(svg) {
        svg = svg.select(".zoomSvg" + myClass);

        const zoom = d3.zoom()
            .on("zoom", zoomed);

        const radiusScale = d3.scaleLinear().domain(d3.extent(myData, d => d.difference)).range([2,4]);

        svg.call(zoom);

        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], mapData)

        const path = d3.geoPath().projection(projection);

        const statesGroup = svg.selectAll('.statesGroup' + myClass)
            .data(mapData.features)
            .join(function(group){
                var enter = group.append("g").attr("class","statesGroup" + myClass);
                enter.append("path").attr("class","statePath");
                return enter;
            });

        statesGroup.select(".statePath")
            .attr("fill", "#D0D0D0")
            .attr("stroke","white")
            .attr("stroke-width",0.5)
            .attr("d", path)
            .on("mousemove",function(event,d){
                var svgBounds = d3.select("." + myClass + "Svg").node().getBoundingClientRect();

                var tooltipText = d.properties.NAME === d.properties.state ? d.properties.NAME :
                    d.properties.NAME + ", " + d.properties.state;
                d3.select(".d3_tooltip")
                    .style("visibility","visible")
                    .style("top",(event.offsetY + svgBounds.y) + "px")
                    .style("left",(event.offsetX + svgBounds.x + 10) + "px")
                    .html(tooltipText);

                d3.selectAll(".d3_tooltip").selectAll("svg").remove();
            })
            .on("mouseout",function(){
                d3.select(".d3_tooltip").style("visibility","hidden");
            });

        const wellsGroup = svg.selectAll('.wellsGroup' + myClass)
            .data(myData)
            .join(function(group){
                var enter = group.append("g").attr("class","wellsGroup" + myClass);
                enter.append("circle").attr("class","wellCircle");
                return enter;
            });

        wellsGroup.select(".wellCircle")
            .attr("id",d => "well" + d.well_id)
            .attr("fill", "white")
            .attr("fill-opacity",0.4)
            .attr("fill",d => d.position_flag === "topN" ? "green" : (d.position_flag == "bottomN" ? "red" : "white"))
            .attr("stroke","transparent")
            .attr("stroke-width",3)
            .attr("r",d => radiusScale(d.difference))
            .attr("cx", d => projection(d.long_lat)[0])
            .attr("cy", d => projection(d.long_lat)[1])
            .on("mouseover",function(event,d){
                var svgBounds = d3.select("." + myClass + "Svg").node().getBoundingClientRect();
                if(d.position_flag !== ""){
                    d3.selectAll(".sunburstPath").attr("opacity",0.5);
                    d3.selectAll("#" + this.id).attr("opacity",1);

                    var tooltipText = "<strong></strong><span style=color:" + (d.position_flag === "topN" ? "green" : "red")
                        + ";'>" + (d.position_flag === "topN" ? "top 25" : "bottom 25").toUpperCase()
                        + "</span></strong><br><span style='font-weight:normal;'>Well: " + d.wellName
                        + " (" + d.well_id + ")<br>Difference: $" + d3.format(".3s")(d.difference)
                        +  "<br>Ipc Revenue: $" + d3.format(".3s")(d.ipc)
                        + "<br>Actual Revenue: " + d3.format(".3s")(d.actual) + "</span>";
                } else {
                    var tooltipText = "<span style='font-weight:normal;'>Well: " + d.wellName
                        + " (" + d.well_id + ")<br>Difference: $" + d3.format(".3s")(d.difference)
                        +  "<br>Ipc Revenue: $" + d3.format(".3s")(d.ipc)
                        + "<br>Actual Revenue: " + d3.format(".3s")(d.actual) + "</span>";
                }
                d3.select(".d3_tooltip")
                    .style("visibility","visible")
                    .style("top",(event.offsetY + svgBounds.y) + "px")
                    .style("left",(event.offsetX + svgBounds.x + 10) + "px")
                    .html(tooltipText);

                d3.selectAll(".d3_tooltip").selectAll("svg").remove();
                drawSvg("d3_tooltip_div");
                drawTooltipMallMap(mallMap.mainData,"d3_tooltip_div",d.well_id);
            })
            .on("mouseout",function(){
                d3.select(".d3_tooltip").style("visibility","hidden");
                d3.selectAll(".pyramidBar").attr("opacity",1);
                d3.selectAll(".sunburstPath").attr("opacity",1);
            });

        zoomToBounds();

        function zoomToBounds(){
            var xExtent = d3.extent(myData, d => projection(d.long_lat)[0]);
            var yExtent = d3.extent(myData, d => projection(d.long_lat)[1]);
            var x0 = xExtent[0];
            var x1 = xExtent[1];
            var y0 = yExtent[0];
            var y1 = yExtent[1];

            var scale =  0.9 / Math.max((x1- x0) / width, (y1 - y0) / height);

            const transformStr = d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(scale)
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);

            //transform the svg
            svg.attr("transform",transformStr);

            svg.transition().duration(2000).call(zoom.transform, transformStr);
        }

        function zoomed(event) {
            const {transform} = event;
            svg.attr("transform", transform);
            d3.selectAll(".statePath").attr("stroke-width", 1.5 / transform.k);
            d3.selectAll(".wellCircle") .attr("r",d => radiusScale(d.difference)/transform.k)
                .attr("stroke-width",1.5/transform.k)
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

    my.mapData = function(value) {
        if (!arguments.length) return mapData;
        mapData = value;
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

    return my;
}