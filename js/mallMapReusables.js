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

        buttonGroup.select(".buttonRect")
            .attr("cursor",d => d === "fan" || d === "map" ? "disabled" : "pointer")
            .attr("opacity",d => d === "fan" || d === "map" ? 0.2 : 1)
            .attr("id",d => d)
            .attr("width",buttonWidth)
            .attr("x",(d,i) => i * (buttonWidth + 7))
            .attr("rx",4)
            .attr("ry",4)
            .attr("height",30)
            .attr("transform","translate(" + (10 + (chartWidth*1.4) + buttonTransformX) + ",5)");

        buttonGroup.select(".buttonIcon")
            .attr("pointer-events","none")
            .attr("opacity",d => d === "fan" || d === "map" ? 0.2 : 1)
            .attr("id",d => d)
            .attr("font-size",20)
            .attr("x",(d,i) => i * (buttonWidth + 7))
            .attr("y",15 + 7)
            .text(d => buttonIcons[d])
            .attr("fill","#707070")
            .attr("transform","translate(" + (15 + (chartWidth*1.4) + buttonTransformX) + ",5)");

        buttonGroup.select(".buttonLabel")
            .attr("opacity",d => d === "fan" || d === "map" ? 0.2 : 1)
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
