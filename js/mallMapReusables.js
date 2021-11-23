function mallMapChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        midTransition = false;

    function my(svg) {

        //svg = zoomSvg
        svg = d3.select(".zoomSvg" + myClass);
        //calc chartWidth + radius
        const chartWidth = Math.min(width, height);
        const radius = chartWidth/2;
        //define depthWidth and translateStr and arc
        let depthWidth = 0;
        const translateStr = "translate(" + (width/2) + "," + (height/2) + ")";
        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        //format base data
        const myHierarchy = getHierarchy(myData);
        const root = getPartition(myHierarchy);
        //draw breadcrumbs,chart and then zoomtobounds
        drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"}])
        drawSunburst(root.descendants(),true);
        zoomToBounds(false,1000);

        function drawSunburst(sunburstData,allData){

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
                sunburstData.descendants().forEach(d => d3.selectAll("#miniMap" + d.data.id).attr("fill",getPathFill));
            }

            //path group
            const pathGroup = svg.selectAll('.pathGroup' + myClass)
                .data(sunburstData, d => allData + "_" + minDepth + "_" + maxDepth)
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
                .attr("opacity",1)
                .attr("fill", getPathFill)
                .attr("d", arc)
                .on("mouseover",function(event,d){
                    if(midTransition === false){
                        d3.selectAll(".sunburstPath").attr("opacity",1);
                        d3.select(this).interrupt().transition().duration(100).attr("opacity",0.5);
                        var svgBounds = d3.select("." + myClass + "Svg").node().getBoundingClientRect();
                        d3.select(".d3_tooltip")
                            .style("visibility","visible")
                            .style("top",(event.offsetY + svgBounds.y) + "px")
                            .style("left",(event.offsetX + svgBounds.x + 10) + "px")
                            .html(d.data.name);
                    }
                })
                .on("mouseout",function(){
                    if(midTransition === false){
                        d3.select(".d3_tooltip").style("visibility","hidden");
                        d3.select(this).interrupt().transition().duration(100).attr("opacity",1);
                    }
                })
                .on("click",function(event,d){
                    if(d.depth > 0 && midTransition === false){
                        //get breadcrumb data and redraw breadcrumb
                        const breadcrumbData = getBreadcrumbs(d);
                        drawBreadcrumbs(breadcrumbData);
                        //if expandable, add foldoutdata
                        if(d.data.expandable !== undefined){
                            addFoldoutData(d);
                        }
                        //redraw sunburst and zoom.
                        drawSunburst(d,false);
                        zoomToBounds(d.data.expandable === undefined ? false : true,1000);
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
                    currentCopy.children.push({
                        "value":c.value,
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

        function getPathFill(d){
            while (!d.data.colors[selectedColor] && d.parent) d = d.parent;
            return d.depth === 0 ? "transparent" : (d.data.colors[selectedColor] || mallMap.fillColor);
        }

        function measureWidth(my_text){
            //from https://observablehq.com/@mbostock/fit-text-to-circle
            const context = document.createElement("canvas").getContext("2d");
            return context.measureText(my_text).width;
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
                        var allData = false;
                        if(d.depth > 0) {
                            //reset breadcrumbs if > 0
                            var breadcrumbData = getBreadcrumbs(myRoot);
                            drawBreadcrumbs(breadcrumbData);
                        } else {
                            //or reset to default breadcrumb
                            allData = true;
                            drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"}]);
                        }
                        //draw chart and zoom.
                        drawSunburst(myRoot,allData);
                        zoomToBounds(myRoot.data.expandable === undefined ? false : true,1000);
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

        function getHierarchy(myDataset){
            var currentHierarchy = d3.hierarchy(myDataset);
            return currentHierarchy.sum(d => d.children ? 0 : isNaN(d.value) ? 1 : d.value);
        }

        function getPartition(myDataset){
            return d3.partition().size([2 * Math.PI, radius])(myDataset);
        }

        function zoomToBounds(expandable,transitionTime){
            //get values
            var [scale,newX,newY] = getValues();

            //define transform string
            const transform_str = d3.zoomIdentity
                .translate(newX, newY)
                .scale(scale);

            //store current scale and alter fontSize accordingly
            mallMap.currentScale = scale;
            updateFonts(false);

            //transform the svg
            svg
                .interrupt()
                .transition()
                .duration(transitionTime)
                .attr("transform",transform_str)
                .on("end",function(){
                    //if expandable carry on
                    if(expandable === true  && midTransition === false){
                        d3.select(".d3_tooltip").style("visibility","hidden");
                        midTransition = true; //so any other clicks are disabled while this is going on
                        d3.selectAll(".pathLabel")
                            .attr("opacity",1)
                            .interrupt()
                            .transition()
                            .duration(500)
                            .attr("opacity",0) //hide label
                            .transition()
                            .duration(0) //then change position
                            .attr("transform", d =>  "rotate(" + (d.foldoutTransformX - 90) + ") translate("
                                + d.foldoutHeight + ",0) rotate(" + (d.foldoutTransformX < 180 ? 0 : 180) + ")")
                            .transition()
                            .delay(500)
                            .duration(300) //and show label
                            .attr("opacity",1);

                        //remove all texture paths
                        d3.selectAll(".sunburstTexturePath")
                            .transition()
                            .duration(500)
                            .attr("opacity",0)
                            .transition()
                            .duration(0) //add new foldoutpath
                            .attr("d", d =>  d.foldoutPath)
                            .transition()
                            .delay(500)
                            .duration(500)
                            .attr("opacity",1);

                        d3.selectAll(".sunburstPath")
                            .attr("opacity",1)
                            .interrupt()
                            .transition()
                            .duration(500) //hide paths
                            .attr("opacity",0)
                            .transition()
                            .duration(0) //add new foldoutpath
                            .attr("d", d =>  d.foldoutPath)
                            .on("end",function(){
                                //get new scale and rescale
                                var [zoomedScale,zoomedX,zoomedY] = getValues();
                                svg.transition()
                                    .duration(0)
                                    .attr("transform",d3.zoomIdentity.translate(zoomedX, zoomedY).scale(zoomedScale));
                                //PROBLEM IS THAT THE zoomScale is for the foldoutPath - not for every
                                //mallMap.currentScale = zoomedScale;
                                updateFonts(true);
                            })
                            .transition()
                            .delay(500)
                            .duration(500)
                            .attr("opacity",1)
                            .on("end",function(){
                                midTransition = false;
                            });
                    } else {
                        updateFonts(false,);
                    }
                })

            function updateFonts(includeZero){
                var fontSize = mallMap.fontSize/(includeZero === true ? 1 : mallMap.currentScale);
                d3.selectAll(".pathLabel")
                    .style("font-size",fontSize)
                    .attr("y", fontSize*0.3)
                    .text(l => includeZero === false && l.depth === 0 ? "" : pathText(l,includeZero));
            }

            function getValues(){

                const chartGroup = d3.select(".zoomSvg" + myClass).node().getBBox();

                const scale = (chartWidth-20)/Math.max(chartGroup.width,chartGroup.height);

                const newX = ((width - (chartGroup.width*scale))/2) - (chartGroup.x*scale);
                const newY = ((height - (chartGroup.height*scale))/2) - (chartGroup.y*scale);

                return [scale,newX,newY]

            }

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

function miniMallMapChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="";

    function my(svg) {

        const buttons = ["map","fan","bar","tile","table"];
        const buttonIcons = {"map":"\uf185","fan":"\uf863","bar":"\uf080","tile":"\uf5fd","table":"\uf0ce"};

        const svgWidth = +d3.select("." + myClass + "Svg").attr("width");

        const chartWidth = Math.min(width, height);
        const buttonAvailableWidth = svgWidth - 10 - (chartWidth*1.4);
        const buttonWidth = 80;
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
                enter.append("rect").attr("class","buttonRect");
                enter.append("text").attr("class","buttonIcon fal");
                enter.append("text").attr("class","buttonLabel");
                return enter;
            });

        buttonGroup
            .attr("id",d => d)
            .attr("opacity",d => d === "fan" || d === "map" ||  d === "table"? 0.2 : (d === "bar" ? 1 : 0.4))
            .attr("cursor",d => d === "fan" || d === "map" || d === "table"? "disabled" : "pointer")

        buttonGroup.select(".buttonRect")
            .attr("width",buttonWidth)
            .attr("x",(d,i) => i * (buttonWidth + 7))
            .attr("rx",4)
            .attr("ry",4)
            .attr("height",30)
            .attr("transform","translate(" + (10 + (chartWidth*1.4) + buttonTransformX) + ",5)")
            .on("click",function(event,d){
                if(d === "bar"){
                    d3.selectAll("#tile").attr("opacity",0.4);
                    d3.selectAll("#bar").attr("opacity",1);
                    drawStackedBar();
                } else {
                    d3.selectAll("#tile").attr("opacity",1);
                    d3.selectAll("#bar").attr("opacity",0.4);
                    drawLineMultiples();
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
        barData = [],
        barDataTop25 = [],
        barDataBottom25 = [],
        myKeys = [],
        currentData = "0";

    function my(svg) {

        let dateGroup = d3.group(myData.data, d => d.date);

        dateGroup = Array.from(dateGroup);

        let [barData,barDataTop25,barDataBottom25,myKeys] = getDatabyStackOption();

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
                barData.push(getEntry(d[0],myTotal,actualTotal,stackData));
                var filteredData = d[1].filter(f => f.position_flag === "topN")
                myTotal = d3.sum(filteredData, s => s.ipc_revenue);
                actualTotal = d3.sum(filteredData, s => s.actual_revenue);
                stackData = Array.from(d3.rollup(filteredData,v => d3.sum(v, s => s.actual_revenue),g => g[stackType]));
                barDataTop25.push(getEntry(d[0],myTotal,actualTotal,stackData));
                filteredData = d[1].filter(f => f.position_flag === "bottomN")
                myTotal = d3.sum(filteredData, s => s.ipc_revenue);
                actualTotal = d3.sum(filteredData, s => s.actual_revenue);
                stackData = Array.from(d3.rollup(filteredData,v => d3.sum(v, s => s.actual_revenue)
                    ,g => g[stackType]));
                barDataBottom25.push(getEntry(d[0],myTotal,actualTotal,stackData));
            })

            return [barData,barDataTop25,barDataBottom25,myKeys];

            function getEntry(myDate,dataTotal,actualTotal,dataStack){

                var currentEntry = {
                    "date":myDate,
                    "total": dataTotal,
                    "actual_total":actualTotal
                }
                myKeys.forEach(function(k){
                    var findValue = dataStack.find(f => f[0] === k);
                    if(findValue === undefined){
                        currentEntry[k] = 0;
                    } else {
                        currentEntry[k] = findValue[1] < 0 ? 0 : findValue[1];
                    }
                });
                return currentEntry
            }
        }


        let xDomain = new Set();
        barData.forEach(d => xDomain.add(d.date));
        xDomain = Array.from(xDomain).sort((a,b) => d3.ascending(a,b));

        const xScale = d3.scaleBand().domain(xDomain).range([0,width]);
        const xScaleTime = d3.scaleTime().domain(d3.extent(xDomain)).range([0,width]);

        if(d3.select(".xAxis" + myClass)._groups[0][0] === null) {
            svg.append("g").attr("class","axis xAxis" + myClass);
            svg.append("g").attr("class","axis yAxis" + myClass);
            svg.append("g").attr("class","zeroLine" + myClass);
            svg.append("path").attr("class","ipcLine" + myClass);
        }

        d3.select(".xAxis" + myClass)
            .call(d3.axisBottom(xScaleTime).tickValues(d3.extent(xDomain)).tickFormat(d => d3.timeFormat("%d %b %y")(d)).tickSizeOuter(0))
            .attr("transform","translate(" + margins.left + "," + (height + margins.top) + ")");

        d3.selectAll(".xAxis" + myClass + " .tick text")
            .style("text-anchor",(d,i) => i === 0 ? "start" : "end")
            .attr("y",4);

        drawBar(barData);

        function drawBar(myBarData){

            const yMax = d3.max(myBarData, d => Math.max(d.total,d.actual_total));
            const yScale = d3.scaleLinear().domain([0,yMax]).range([height,0]);
            const scaleNumber = myKeys.length < 4 ? 4 : (myKeys.length > 9 ? 9 : myKeys.length);

            const line = d3.line()
                .x(d => xScale(d.date))
                .y(d => yScale(d.total));

            const stackedData = d3.stack()
                .keys(myKeys)
                (myBarData);

            d3.select(".yAxis" + myClass)
                .call(d3.axisLeft(yScale).tickFormat(d => d > 0 ? d3.format("$.2s")(d) : "").tickSizeOuter(0))
                .attr("transform","translate(" + margins.left + "," + margins.top + ")");

            d3.selectAll(".yAxis" + myClass + " .tick text")
                .attr("x",-4)

            d3.select(".ipcLine" + myClass)
                .attr("d",line(myBarData))
                .attr("fill","none")
                .attr("stroke","#31a354")
                .attr("transform","translate(" + margins.left + "," + margins.top + ")");

            const stackGroup = svg.selectAll('.stackGroup' + myClass)
                .data(stackedData)
                .join(function(group){
                    var enter = group.append("g").attr("class","stackGroup" + myClass);
                    enter.append("g").attr("class","stackGroup");
                    return enter;
                });

            stackGroup.select(".stackGroup")
                .attr("fill",(d,i) => d3.schemeBlues[scaleNumber][scaleNumber-(i+1)])
                .attr("transform","translate(" + margins.left + "," + margins.top + ")");

            const barGroup = stackGroup.select(".stackGroup").selectAll('.barGroup' + myClass)
                .data(d => d)
                .join(function(group){
                    var enter = group.append("g").attr("class","barGroup" + myClass);
                    enter.append("rect").attr("class","stackedRect");
                    return enter;
                });

            barGroup.select(".stackedRect")
                .attr("x",d => xScale(d.data.date))
                .attr("y",d => yScale(d[1]))
                .attr("height",d => yScale(d[0]) - yScale(d[1]))
                .attr("width",xScale.bandwidth()-1)

        }

        const filterOptions = ["all","top 25","bottom 25"];

        const filterGroup = svg.selectAll('.filterGroup' + myClass)
            .data(filterOptions)
            .join(function(group){
                var enter = group.append("g").attr("class","filterGroup" + myClass);
                enter.append("text").attr("class","filterText");
                return enter;
            });

        filterGroup.select(".filterText")
            .attr("id",(d,i) => "filterText" + i)
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.4)
            .attr("y",height + margins.top + (margins.bottom/2))
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.toUpperCase())
            .attr("transform","translate(" + margins.left + ",0)")
            .on("click",function(event,d){
                d3.selectAll(".filterText").attr("opacity",0.4);
                d3.select(this).attr("opacity",1);
                if(d === "all"){
                    drawBar(barData);
                    currentData = 0;
                } else if (d === "top 25"){
                    drawBar(barDataTop25);
                    currentData = 1;
                } else {
                    drawBar(barDataBottom25);
                    currentData = 2;
                }
            });

        var filterX = 0;
        d3.selectAll(".filterText").each(function(){
            d3.select(this).attr("x",filterX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            filterX += (textWidth + 5);
        })

        filterGroup.attr("transform","translate(" + ((width - filterX)/2) + ",0)");

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
            .attr("y",margins.top - (margins.bottom/2))
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.replace(/_/g,' ').toUpperCase())
            .attr("transform","translate(" + margins.left + ",0)")
            .on("click",function(event,d){
                d3.selectAll(".stackOptionsText").attr("opacity",0.4);
                d3.select(this).attr("opacity",1);
                stackType = d;
                let newStackTypeData = getDatabyStackOption();
                [barData,barDataTop25,barDataBottom25,myKeys] = newStackTypeData;
                drawBar(newStackTypeData[currentData]);

            });


        var stackX = 0;
        d3.selectAll(".stackOptionsText").each(function(){
            d3.select(this).attr("x",stackX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            stackX += (textWidth + 5);
        })

        stackOptionsGroup.attr("transform","translate(" + ((width - stackX)/2) + ",0)");

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
        filterType = "topN";

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
                .range([chartHeight-10,0])

            const line = d3.line()
                .x(d => xScale(d.date))
                .y(d => yScale(d.ipc_revenue));

            const area = d3.area()
                .x(d => xScale(d.date))
                .y0(d => yScale(d.actual_revenue))
                .y1(yScale(0));

            const chartGroup = svg.selectAll('.chartGroup' + myClass)
                .data(wellGroup)
                .join(function(group){
                    var enter = group.append("g").attr("class","chartGroup" + myClass);
                    enter.append("rect").attr("class","wellRect");
                    enter.append("text").attr("class","wellLabel")
                    enter.append("path").attr("class","actualArea");
                    enter.append("path").attr("class","ipcLine");
                    return enter;
                });

            chartGroup
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
            .attr("opacity",(d,i) => i === 0 ? 1 : 0.4)
            .attr("y",margins.top/2)
            .attr("cursor","pointer")
            .text((d,i) => (i === 0 ? "" : "|    ") + d.replace(/_/g,' ').toUpperCase())
            .on("click",function(event,d){
                d3.selectAll(".filterText").attr("opacity",0.4);
                d3.select(this).attr("opacity",1);
                if(d === "top 25"){
                    filterType = "topN";
                } else {
                    filterType = "bottomN";
                }
                drawMultiples();
            });


        var filterX = 0;
        d3.selectAll(".filterText").each(function(){
            d3.select(this).attr("x",filterX);
            var textWidth = document.getElementById(this.id).getBoundingClientRect().width;
            filterX += (textWidth + 5);
        })

        filterGroup.attr("transform","translate(" + ((width - filterX)/2) + ",0)");



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