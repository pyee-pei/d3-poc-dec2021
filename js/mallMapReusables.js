function mallMapChart() {

    var width=0,
        height=0,
        myData = [],
        myClass="",
        midTransition = false;

    function my(svg) {

        svg = d3.select(".zoomSvg" + myClass);

        const chartWidth = Math.min(width, height);
        const radius = chartWidth/2;
        const translateStr = "translate(" + (width/2) + "," + (height/2) + ")";

        const myHierarchy = getHierarchy(myData);

        function getHierarchy(myDataset){
            var currentHierarchy = d3.hierarchy(myDataset);
            return currentHierarchy.sum(d => d.children ? 0 : isNaN(d.value) ? 1 : d.value);
        }
        const root = getPartition(myHierarchy,radius);

        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        function getPartition(myDataset,myRadius){

            return d3.partition().size([2 * Math.PI, myRadius])(myDataset);

        }
        function zoomToBounds(expandable,transitionTime){


            var [scale,newX,newY] = getValues();

            function getValues(){
                const chartGroup = d3.select(".zoomSvg" + myClass).node().getBBox();
                //calculate outer limits of data

                const scale = (chartWidth-20)/Math.max(chartGroup.width,chartGroup.height);

                const newX = ((width - (chartGroup.width*scale))/2) - (chartGroup.x*scale);
                const newY = ((height - (chartGroup.height*scale))/2) - (chartGroup.y*scale);

                return [scale,newX,newY]

            }
            //flickering problem is when zoom object (click rect) is not the same size as the svg.
            //now the zoom object is a direct descendant of the svg
            //the variable svg is in fact a group (see draw_svg in cgraphs.js).

            //for the initial zoom to bounds.  Define the transform string.

            const transform_str = d3.zoomIdentity
                .translate(newX, newY)
                .scale(scale);

            mallMap.currentScale = scale;

            //transform the svg
            svg
                .interrupt()
                .transition()
                .duration(transitionTime)
                .attr("transform",transform_str)
                .on("end",function(){
                    if(expandable === true){
                        midTransition = true;
                        d3.selectAll(".pathLabel")
                            .attr("opacity",1)
                            .interrupt()
                            .transition()
                            .duration(500)
                            .attr("opacity",0)
                            .transition()
                            .duration(0)
                            .attr("transform", d =>  "rotate(" + (d.foldoutTransformX - 90) + ") translate("
                                + d.foldoutHeight + ",0) rotate(" + (d.foldoutTransformX < 180 ? 0 : 180) + ")")
                            .transition()
                            .delay(500)
                            .duration(300)
                            .style("font-size",(mallMap.fontSize*2) + "px")
                            .attr("opacity",1);

                        d3.selectAll(".sunburstTexturePath")
                            .transition()
                            .duration(500)
                            .attr("opacity",0);

                        d3.selectAll(".sunburstPath")
                            .attr("opacity",1)
                            .interrupt()
                            .transition()
                            .duration(500)
                            .attr("opacity",0)
                            .transition()
                            .duration(0)
                            .attr("d", d =>  d.foldoutPath)
                            .on("end",function(){
                                var [zoomedScale,zoomedX,zoomedY] = getValues();
                                svg.transition()
                                    .duration(0)
                                    .attr("transform",d3.zoomIdentity.translate(zoomedX, zoomedY).scale(zoomedScale));
                            })
                            .transition()
                            .delay(500)
                            .duration(500)
                           .attr("opacity",1)
                            .on("end",function(){
                                midTransition = false;
                            });


                    }
                })

        }



        drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"}])
        drawSunburst(root.descendants(),true);
        zoomToBounds(false,1000);

        function drawSunburst(sunburstData,allData){

            var minDepth = d3.min(sunburstData, d => d.depth);
            var maxDepth = d3.max(sunburstData, d => d.depth);
            var depthWidth = radius/(maxDepth-minDepth);
            midTransition = false;


            if(allData === true || sunburstData.data === undefined || sunburstData.data.expandable === undefined){
                d3.selectAll("#fan").attr("cursor","disabled").attr("opacity",0.2);
                d3.selectAll("#map").attr("cursor","disabled").attr("opacity",0.2);
            } else {
                d3.selectAll("#fan").attr("cursor","disabled").attr("opacity",0.2);
                d3.selectAll("#map").attr("cursor","pointer").attr("opacity",1);
            }
            d3.selectAll(".miniMapPath").attr("fill","#707070");

            if(allData === false){
                sunburstData.descendants().forEach(d => d3.selectAll("#miniMap" + d.data.id).attr("fill",getPathFill));
            }
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
                .on("mousemove",function(event,d){
                    if(midTransition === true){
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
                        const breadcrumbData = getBreadcrumbs(d);
                        drawBreadcrumbs(breadcrumbData);
                        if(d.data.expandable !== undefined){
                            addFoldoutData(d);
                        }
                        drawSunburst(d,false);
                        zoomToBounds(d.data.expandable === undefined ? false : true,1000);
                    }
                });

            pathGroup.select(".pathLabel")
                .attr("opacity",1)
                .text(d => pathText(d,depthWidth))
                .attr("pointer-events", "none")
                .attr("text-anchor", "middle")
                .style("font-size", mallMap.fontSize)
                .attr("transform", function(d) {
                    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                    const y = (d.y0 + d.y1) / 2;
                    return "rotate(" + (x - 90) + ") translate(" + y + ",0) rotate(" + (x < 180 ? 0 : 180) + ")";
                })
                .attr("y", mallMap.fontSize*0.3)
                .attr("fill", d => {
                    while (!d.data.colors[selectedColor] && d.parent) d = d.parent;
                    return d3.lab(d.data.colors[selectedColor] || mallMap.colors.fillColor).l < 60 ? mallMap.colors.lightColor
                        : mallMap.colors.darkColor;
                });

            function pathText(d,currentDepthWidth){

                //first check arc height
                if(((d.y0 + d.y1) / 2 * (d.x1 - d.x0) > mallMap.fontSize)  && d.depth > 0){
                    //all good, now check width
                    console.log(d.data.name, measureWidth(d.data.name),currentDepthWidth);
                    if(measureWidth(d.data.name) < currentDepthWidth/mallMap.currentScale){
                        return d.data.name;
                    } else {
                        return "";
                    }

                } else {
                    return "";
                }
            }
        }


        function addFoldoutData(d){

            //I've got my current path.
            //Which is drawn using my current dimensions and depth.

            //I need to copy the hierarchy.
            var myCopy = {"value":d.value,"name":d.data.name,"id":d.data.id,"colors":d.data.colors,"children":[]};
            addChildren(d.children,myCopy);

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
            //flatten it and add hierarchy
            var currentRadius = (d.x1 - d.x0)/2;
            var flattenCopy = getPartition(getHierarchy(myCopy),radius);
            flattenCopy = flattenCopy.descendants();
            flattenCopy.map(m => m.foldoutPath = arc(m));
            d.descendants().map(function(m){
                var myFoldout = flattenCopy.find(f => f.data.id === m.data.id);
                m.foldoutPath = myFoldout.foldoutPath;
                //.replace(/-/g,' -');
                //m.foldoutPath =  m.foldoutPath.replace(/e /g,'e');
                //m.foldoutPath =  m.foldoutPath.replace(/A/g,' A ');
                 //m.foldoutPath =  m.foldoutPath.replace(/L/g,' L ');
                //console.log(m.foldoutPath);
                m.foldoutWidth = myFoldout.x1 - myFoldout.x0;
                m.foldoutHeight = (myFoldout.y0 + myFoldout.y1)/2;
                m.foldoutTransformX = (myFoldout.x0 + myFoldout.x1) / 2 * 180 / Math.PI;
            });


        }
        function getPathFill(d){
            while (!d.data.colors[selectedColor] && d.parent) d = d.parent;
            return d.depth === 0 ? "transparent" : (d.data.colors[selectedColor] || mallMap.fillColor);
        }

        function measureWidth(my_text){
            const context = document.createElement("canvas").getContext("2d");
            return context.measureText(my_text).width;
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
                    if(midTransition === false){
                        var myRoot = root.descendants().find(f => f.depth === d.depth && f.data.name === d.label);
                        var allData = false;
                        if(d.depth > 0) {
                            var breadcrumbData = getBreadcrumbs(myRoot);
                            drawBreadcrumbs(breadcrumbData);
                        } else {
                            allData = true;
                            drawBreadcrumbs([{"depth":0,"label":"Home","fill":"white"}]);
                        }
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
