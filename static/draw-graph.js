var width = 750,
    height = 500,
    margin = 10;
var JUNCTION = 0,
    CONSUMER = 1,
    SOURCE = 2,
    TANK = 3;
var PIPE = 0,
    PUMP = 1,
    VALVE = 2;
var radius = 3;

var nodes, edges;
var pressureScale, flowScale;
var xScale, yScale;

d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };

d3.selection.prototype.moveToBack = function() {  
    return this.each(function() { 
        var firstChild = this.parentNode.firstChild; 
        if (firstChild) { 
            this.parentNode.insertBefore(this, firstChild); 
        } 
    });
};

// ============== Color ============== //

function colorNodeType(d, color) {
    switch (d.node_type) {
        case CONSUMER:
            return "white" //consumer
        case SOURCE:
            return "orange" //source
        case TANK:
            return "green" //tank
        default:
            return color(d.pressure);
    }
}

function colorEdgeType(d) {
    switch (d.edge_type) {
        case PUMP:
            return "orange" //pump
        case VALVE:
            return "green" //valve
        default:
            return "steelblue"; //pipe
    }
}


// ============== Scale ============== //
function getFlowScale() {
    var flows = edges.map(function(o) {
        return o.flow;
    });
    var max_flow = arr.max(flows);
    var min_flow = arr.min(flows);
    console.log('fmax', max_flow);
    console.log('fmin', min_flow);
    var flowScale = d3.scale.linear()
        .domain([min_flow, max_flow])
        .range([1, 30]);
    return flowScale;
}

function getPressureScale() {
    var pressures = nodes.filter(function(o) {
            return o.node_type != SOURCE;
        })
        .map(function(o) {
            return o.pressure;
        });
    var mean = arr.mean(pressures);
    var sd = arr.standardDeviation(pressures)
    var color = d3.scale.linear().domain([mean - 2 * sd, mean + 2 * sd])
        .interpolate(d3.interpolateHcl)
        .range([d3.rgb("#B5F394"), d3.rgb("#2c7bb6")]);
    return color;
}

function getPositionScale() {
    var x = nodes.map(function(o) {
        return o.x;
    });
    var y = nodes.map(function(o) {
        return o.y;
    });
    var max_x = arr.max(x);
    var min_x = arr.min(x);
    var max_y = arr.max(y);
    var min_y = arr.min(y);
    xScale = d3.scale.linear()
        .domain([min_x, max_x])
        .range([0, width - 2 * margin]);
    yScale = d3.scale.linear()
        .domain([min_y, max_y])
        .range([0, height - 2 * margin]);
    return {
        x: xScale,
        y: yScale
    };
}

// ============== Draw ============== //
function drawNodes(xScale, yScale, color) {
    d3.select("#graph-canvas").selectAll("circle")
        .data(nodes).enter().append("circle")
        .attr("r", 4)
        .attr("fill", function(d) {
            return colorNodeType(d, color);
        })        
        .attr("cx", function(d) {
            return margin + xScale(d.x);
        })
        .attr("cy", function(d) {
            return margin + yScale(d.y);
        })
        .on("mouseover", function() {
            d3.select(this).attr("r", 6);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 4);
        });

    d3.select("#graph-canvas").selectAll("circle")
        .filter(function(d, i) {
            return d.node_type == CONSUMER;
        })
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.8);

    $('#graph-canvas circle').tipsy({
        gravity: 'w',
        html: true,
        title: function() {
            var d = this.__data__;
            var info = '';
            info += 'node_id: ' + d.node_id + '<br />';
            info += 'demand: ' + d.demand.toFixed(2) + '<br />';
            info += 'height: ' + d.head.toFixed(2) + '<br />';
            info += 'head: ' + d.pressure.toFixed(2);
            return info;
        }
    });
}

function drawEdges(xScale, yScale) {
    d3.select("#graph-canvas").selectAll("line")
        .data(edges).enter().append("line")
        .attr("x1", function(d) {
            return margin + xScale(nodes[d.head_id - 1].x);
        })
        .attr("y1", function(d) {
            return margin + yScale(nodes[d.head_id - 1].y);
        })
        .attr("x2", function(d) {
            return margin + xScale(nodes[d.tail_id - 1].x);
        })
        .attr("y2", function(d) {
            return margin + yScale(nodes[d.tail_id - 1].y);
        })
        .attr("stroke", function(d) {
            return colorEdgeType(d);
        })
        .attr("stroke-width", 4)
        .attr("stroke-opacity", 0.5)
        .on("mouseover", function() {
            d3.select(this).attr("stroke-opacity", 1)
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke-opacity", 0.5)
        })


    $('#graph-canvas line').tipsy({
        gravity: 'w',
        html: true,
        title: function() {
            var d = this.__data__;
            var info = '';
            info += 'edge_id: ' + d.edge_id + '<br />';
            info += 'length: ' + d.length.toFixed(2) + '<br />';
            info += 'radius: ' + (d.diameter / 2).toFixed(2) + '<br />';
            info += 'flow: ' + d.flow.toFixed(2) + '<br />';
            var pressureDiff = Math.abs(nodes[d.head_id - 1].pressure - nodes[d.tail_id - 1].pressure);
            info += 'Delta: ' + pressureDiff.toFixed(2);
            return info;
        }
    });
}

function drawGraph() {
    var scale = getPositionScale(nodes);
    var color = getPressureScale(nodes);
    drawEdges(scale.x, scale.y);
    drawNodes(scale.x, scale.y, color);
}

function render(error, node_info, edge_info, summary) {
    if (error) {
        console.log(error);
    }
    nodes = node_info.json_list.map(function(d) {
        return {
            node_id: +d.node_id,
            node_name: d.node_name,
            demand: +d.demand,
            head: +d.head,
            node_type: +d.node_type,
            pressure: +d.head,
            x: +d.x,
            y: +d.y
        };
    });

    edges = edge_info.json_list.map(function(d) {
        return {
            edge_id: +d.edge_id,
            head_id: +d.head_id,
            tail_id: +d.tail_id,
            length: +d.length,
            diameter: +d.diameter,
            roughness: +d.roughness,
            edge_type: +d.edge_type,
            flow: 0.00
        };
    })

    drawGraph();		    
}

function initialize(name) {
    state = name;
    d3.select("#graph-canvas").selectAll("*").remove();
    var url_nodes = "/api/nodes/" + state;
    var url_edges = "/api/edges/" + state;		    
    d3.queue()
        .defer(d3.json, url_nodes)
        .defer(d3.json, url_edges)		        
        .await(render);
}

function getNewDirection() {
    var url_direction = "/api/predirection/" + state;
    d3.json(url_direction, function(info) {        
        edges = _.merge(edges, info.json_list); 
        document.getElementById("imaginary-button").classList.remove("disabled");       
    });
}

function showDirection() {

    var tempFlow = d3.select("#graph-canvas").selectAll("temp-circle")
        .data(edges).enter().append("circle")
        .moveToBack()
        .attr("r", 2)
        .attr("cx", function(d) {                        
            return margin + xScale(nodes[d.head_id - 1].x);
        })
        .attr("cy", function(d) {
            return margin + yScale(nodes[d.head_id - 1].y);
        })                
        .attr("fill", "steelblue")
        .transition().duration(2000)        
        .attr("cx", function(d) {
            return margin + xScale(nodes[d.tail_id - 1].x);
        })
        .attr("cy", function(d) {
            return margin + yScale(nodes[d.tail_id - 1].y);
        });
        

    tempFlow.remove();
}

function update(error, info) {
    nodes = _.merge(nodes, info.nodes);
    edges = _.merge(edges, info.edges);

    pressureScale = getPressureScale();
    flowScale = getFlowScale();

    d3.select("#graph-canvas").selectAll("line")
        .transition().duration(2000)
        .attr("stroke-width", function(d) {
            return flowScale(d.flow);
        });

    d3.select("#graph-canvas").selectAll("circle").filter(function(d, i) {
            return d.node_type == JUNCTION;
        })
        .transition().duration(2000)
        .attr("fill", function(d) {
            return pressureScale(d.pressure);
        });

    d3.select("#graph-canvas").selectAll("circle").filter(function(d, i) {
            return d.node_type == CONSUMER;
        })
        .transition().duration(2000)
        .attr("fill", function(d) {
            if (d.d_satisfy && d.h_satisfy) {
                return "#F6416C";
            }
            return "white"
        });

    updateTable();
    document.getElementById("iteration-button").classList.remove("disabled"); 

}

function update_node(error, info) {
    nodes = _.merge(nodes, info.nodes);

    d3.select("#graph-canvas").selectAll("circle").filter(function(d, i) {
            return d.node_type == JUNCTION;
        })
        .transition().duration(500)
        .attr("r", 5)
        .transition().duration(500)
        .attr("r", 2);

    d3.select("#graph-canvas").selectAll("circle").filter(function(d, i) {
            return d.node_type == CONSUMER;
        })
        .transition().duration(2000)
        .attr("fill", function(d) {
            if (d.d_satisfy && d.h_satisfy) {
                return "#F6416C";
            }
            return "white"
        });
}

function update_edge(error, info) {

    edges = _.merge(edges, info.edges);

    d3.select("#graph-canvas").selectAll("line")
        .transition().duration(500)
        .attr("stroke-width", function(d) {
            return flowScale(d.flow) + 2;
        })
        .transition().duration(500)
        .attr("stroke-width", function(d) {
            return flowScale(d.flow);
        });
}

function updateData() {
    var url = "/api/imaginary/" + state;
    d3.queue()
        .defer(d3.json, url)
        .await(update);
}

function updateData1() {
    var url = "/api/imaginary_pressure/" + state;
    d3.queue()
        .defer(d3.json, url)
        .await(update_node);
}

function updateData2() {
    var url = "/api/max_flow/" + state;
    d3.queue()
        .defer(d3.json, url)
        .await(update_edge);
}

function updateData3() {
    var iter = document.getElementById('iteration').value;
    if (!iter) {
        iter = 1;
    }
    var url = "/api/iter/" + state + "/" + iter;        
    console.log(url)
    d3.queue()
        .defer(d3.json, url)
        .await(test);
}