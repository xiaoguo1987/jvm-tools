"use strict";

function createFlameChart(hostId, data) {

    var fullData = data;
    var threadFilter = {};
    
    function updateFramePallete(hostId, dataSet) {
        var pal = "";
        for(var i = 0; i < dataSet.frameColors.length; ++i) {
            if (dataSet.frameColors[i] != null && dataSet.frameColors[i] !== undefined) {
                pal += "div." + hostId + "_fr" + i + " {background-color: " + dataSet.frameColors[i] + ";}\n";               
            }
        }
        var id = hostId + "_frameColors";
        var stBlock = document.createElement("style");
        stBlock.id = id;
        stBlock.textContent = pal;

        if ($("#" + id).length == 0) {
            $("html>head").append(stBlock);
        }
        else {
            $("#" + id).replaceWith(stBlock);
        }
    }

    function sampleCount(dataSet, prefix) {

        if (prefix === undefined) {
            prefix = [];
        }

        var count = 0;

        for(var i = 0; i < dataSet.threads.length; ++i) {
            var td = dataSet.threads[i];
            for(var j = 0; j < td.traces.length; ++j) {
                if (arrayStartsWith(td.traces[j].trace, prefix)) {
                    count += td.traces[j].samples;
                }
            }
        }

        return count;
    }

    function sampleCountForFrame(dataSet, frame) {

        var count = 0;

        for(var i = 0; i < dataSet.threads.length; ++i) {
            var td = dataSet.threads[i];
            for(var j = 0; j < td.traces.length; ++j) {
                if (td.traces[j].trace.indexOf(frame) >= 0) {
                    count += td.traces[j].samples;
                }
            }
        }

        return count;
    }

    function arrayStartsWith(a, pref) {
        if (a.length < pref.length) {
            return false;
        }
        for(var i = 0; i < pref.length; ++i) {
            if (a[i] != pref[i]) {
                return false;
            }
        }
        return true;
    }

    function toPath(a) {
        var p = "p";
        for(var i = 0; i < a.length; ++i) {
            if (p != "p") {
                p += "_";
            }
            p += a[i];
        }
        return p;
    }

    function toPrefix(a) {
        var f = a.lastIndexOf("_");
        a = a.slice(0, f);
        a = a.slice(a.lastIndexOf("p") + 1);
        var pref = a.split("_");
        for(var i = 0; i < pref.length; ++i) {
            pref[i] = Number(pref[i]);
        }
        return pref;
    }

    function selectByPath(tree, path) {
        var node = tree;
        for(var i = 0; i < path.length; ++i) {
            node = node["f" + path[i]];
            if (node === undefined) {
                return node;
            }
        }
        return node;
    }

    function collectTree(dataSet) {
        var root = {};

        var i;
        for(i = 0; i < dataSet.threads.length; ++i) {
            var j;
            var td = dataSet.threads[i];
            for(j = 0; j < td.traces.length; ++j) {
                var k;
                var t = td.traces[j].trace;
                var node = root;
                for(k = 0; k < t.length; ++k) {
                    var f = "f" +  t[k];
                    if (node[f] === undefined) {
                        node[f] = {};
                    }
                    node = node[f];
                    var pref = t.slice(0, k + 1);
                    node.path = toPath(pref);
                    node.frame = dataSet.frames[t[k]];
                    node.frameNo = t[k];
                    node.samples = sampleCount(dataSet, pref);
                }
            }
        }

        root.samples = sampleCount(dataSet, []);

        return root;
    }

    function createInfoElement(ns, treeNode) {
        if (treeNode.frame === undefined) {
            var stub = document.createElement("div");
            stub.style="display: none";
            stub.textContent="no frame";
            return stub;        
        }
        else if (treeNode.frame == "(WAITING)") {
            var wnode = document.createElement("div");
            wnode.className = "waitSmoke flameNode";
            wnode.id = treeNode.path + "_node";
            return wnode;
        }
        else if (treeNode.frame == "(TIMED_WAITING)") {
            var wnode = document.createElement("div");
            wnode.className = "sleepSmoke flameNode";
            wnode.id = treeNode.path + "_node";
            return wnode;
        }
        else if (treeNode.frame == "(BLOCKED)") {
            var bnode = document.createElement("div");
            bnode.className = "blockSmoke flameNode";
            bnode.id = treeNode.path + "_node";
            return bnode;        
        }
        else if (treeNode.frame == "(RUNNABLE)") {
            var rnode = document.createElement("div");
            rnode.className = "hotSmoke flameNode";
            rnode.id = treeNode.path + "_node";
            return rnode;        
        }
        else if (treeNode.frame == "(IO)") {
            var ionode = document.createElement("div");
            ionode.className = "ioSmoke flameNode";
            ionode.id = treeNode.path + "_node";
            return ionode;        
        }
        else if (treeNode.frame == "(???)") {
            var tnode = document.createElement("div");
            tnode.className = "termSmoke flameNode";
            tnode.id = treeNode.path + "_node";
            return tnode;        
        }
        else {
            var fnode = document.createElement("div");
            fnode.className = "execNode flameNode " + ns + "fr" + treeNode.frameNo ;
            fnode.id = treeNode.path + "_node";
            fnode.textContent = treeNode.frame;
            return fnode;        
        }
    }

    function createTreeElement(ns, treeNode, weight, threshold) {
        if (treeNode.samples < threshold) {
            var stub = document.createElement("div");
            stub.style="display: none";
            stub.textContent="samll element stub";
            return stub;
        }
        else {
            var div = document.createElement("div");
            if (treeNode.path !== undefined) {
                div.id = ns + treeNode.path + "_box";            
            }
            div.className = "flameBox";
            div.style = "flex-basis: " + weight + "%;"
            var children = [];
            for(var prop in treeNode) {
                if (prop.startsWith("f")) {
                    children[children.length] = treeNode[prop];
                }
            }

            if (children.length == 1 && children[0].samples == treeNode.samples) {
                div.appendChild(createTreeElement(ns, children[0], 100, threshold));
            }
            else if (children.length > 0) {
                children.sort(function(a, b) {a.samples - b.samples});
                var row = document.createElement("div");
                row.className = "flameRow";
                for(var i = 0; i < children.length; ++i) {
                    var cw = 100 * children[i].samples / treeNode.samples;
                    var node = createTreeElement(ns, children[i], cw, threshold);
                    row.appendChild(node);
                }
                div.append(row);
            }

            var finfo = createInfoElement(ns, treeNode);
            div.appendChild(finfo);
            return div;
        }    
    }

    function updateChart(hostId, dataSet) {

        updateFramePallete(hostId, dataSet);

        var ns = hostId + "_";
        var domNode = $("#" + hostId + ">div.flameRoot>div.flameBox");
        var totalSamples = sampleCount(dataSet, []);
        var graphWidth = domNode.innerWidth();
        var tree = collectTree(dataSet);
        var threshold = 3 * totalSamples / graphWidth;
        var graph = createTreeElement(ns, tree, 100, threshold);
        graph.id = domNode.id;

        domNode.replaceWith(graph);

        installTooltips(hostId, tree, dataSet);
    }

    function installTooltips(hostId, tree, dataSet) {
        $("#" + hostId).unbind("mouseleave");
        $("#" + hostId).unbind("mousemove");

        var lastTooltip = "";

        $("#" + hostId + ">div.flameHover").hide();

        $("#" + hostId + " .flameNode").mouseleave(function(){
            $("#" + hostId + ">div.flameHover").hide();
        });

        $("#" + hostId + " .flameNode").mousemove(
            function(e) {
                console.log("mouse", e.pageX, e.pageY, this);
                var elements = document.elementsFromPoint(e.pageX, e.pageY);
                var node = this;
                if (node == null) {
                    $("#" + hostId + ">div.flameHover").hide();
                    lastTooltip = "";
                }
                else {
                    $("#" + hostId + ">div.flameHover").show();
                    if (lastTooltip !=  node.id) {
                        lastTooltip = node.id;
                                     
                        updateHoverText($("#" + hostId + ">div.flameHover"), toPrefix(node.id), tree, dataSet);
                    }
                }            
                placeHover($("#" + hostId), $("#" + hostId + ">div.flameHover"), e);
            }
        )
    }

    function placeHover(container, hover, event) {
        var hoverx = event.pageX;
        var hovery = event.pageY + 10;
        var hw = hover.width();
        var cx = container.position().left;
        var cw = container.outerWidth();

        if (hoverx + hw > cx + cw) {
            if (hw > cw) {
                hoverx = cx;
            }
            else {
                hoverx = cx + cw - hw;
            }
        }

        hover.css({ top: hovery, left: hoverx });
    }

    function fmtPercent(val) {
        return Number(val * 100).toFixed(2) + "%";
    }
    
    function toState(frame) {
        if (frame == "(???)") {
            return "Terminal";
        }
        else {
            return frame.slice(1, frame.length - 1);
        }
    }
    
    function updateHoverText(node, prefix, tree, dataSet) {
        node.empty();
        var fid = prefix[prefix.length - 1];
        var fnode = selectByPath(tree, prefix);
        var frame = fnode.frame;
        if (frame.startsWith("(")) {
            // this is terminator frame, display last frame
            var state = toState(frame);
            var stCount = fnode.samples;
            fid = prefix[prefix.length - 2];
            fnode = selectByPath(tree, prefix.slice(0, -1));
            frame = fnode.frame;
        }
        var totalSamples = sampleCount(dataSet, []);
        var nodeSampleCount = fnode.samples;
        var globalCount = sampleCountForFrame(dataSet, fid);
        $('<p class="hoverFrame"></p>').text(frame).appendTo(node);
        if (state !== undefined) {
            var lbl = state + ": " + stCount + " (" + fmtPercent(stCount / totalSamples) + ")";
            $('<p class="hoverStats"></p>').text(lbl).appendTo(node);   
        }
        $('<p class="hoverStats"></p>').text("Sample count: " + nodeSampleCount + " (" + fmtPercent(nodeSampleCount / totalSamples) + ")").appendTo(node);
        $('<p class="hoverStats"></p>').text("Global frame frequency: " + globalCount + " (" + fmtPercent(globalCount / totalSamples) + ")").appendTo(node);
    }                
    
    
    var flameChart = {
        
        originalData: data,
        initFlameChart: function() {
            updateChart(hostId, fullData);   
        }        
    };
    
    return flameChart;
}

