$(window).load(function() {
    initialize(state);
    getSummary();
    if (loop) {
        flowLoop = setInterval(function() {
            showDirection();
        }, 2000);
    }
    w3.includeHTML();
});

var linspace = function(start, stop, nsteps){
    delta = (stop-start)/(nsteps-1)
    return d3.range(nsteps).map(function(i){return start+i*delta;});
}

function updateTable() {
    getCustomers();
    getSources();
    getValves();
    getKeyNodes();
    getKeyEdges();
}

function loopAnimation() {
    loop = !loop;
    if (loop) {
        $("#direction-button")
            .attr('class', 'btn btn-danger')
            .attr('value', 'Pause');
        flowLoop = setInterval(function() {
            showDirection();
        }, 2000);
    } else {
        $("#direction-button")
            .attr('class', 'btn btn-default')
            .attr('value', 'Play');
        clearInterval(flowLoop)
    }
}

function getSummary() {
    var url = "/api/summary_table/" + state;
    d3.json(url, writeSummaryTable);
}

function getCustomers() {
    var url_customers = "/api/customers_table/" + state;
    d3.json(url_customers, writeCustomersTable);
}

function getSources() {
    var url_sources = "/api/sources_table/" + state;
    d3.json(url_sources, writeSourcesTable);
}

function getValves() {
    var url_valves = "/api/valves_table/" + state;
    d3.json(url_valves, writeValvesTable);
}

// ======= SOURCE ====== //
function getSourcesDynamic() {
    var url_sources = "/api/sources_table/" + state;
    d3.json(url_sources, writeSourcesDynamic);

}

function writeSourcesDynamic(nodes) {
    json_data = nodes.json_list;
    for (i = 0; i < json_data.length; i++) {
        json_data[i].pressure = parseFloat(json_data[i].pressure.toFixed(2))
        json_data[i].flow_out = parseFloat(json_data[i].flow_out.toFixed(2))
        json_data[i].min_pressure = parseFloat(json_data[i].min_pressure).toFixed(2)
    }
    var column = ['node_id', 'flow_out', 'pressure', 'min_pressure', 'pressure_satisfied'];
    var header = ['ID', 'Flow out', 'Head', 'Height', 'Satisfy?']
    create_dynamic_table('#dynamic_table_node', json_data, column, header);
}

// ======= CUSTOMER ====== //
function getCustomersDynamic() {
    var url_customers = "/api/customers_table/" + state;
    d3.json(url_customers, writeCustomersDynamic);
}

function writeCustomersDynamic(nodes) {
    json_data = nodes.json_list;
    for (i = 0; i < json_data.length; i++) {
        json_data[i].flow_in = parseFloat(json_data[i].flow_in.toFixed(2))
        json_data[i].pressure = parseFloat(json_data[i].pressure.toFixed(2))
        json_data[i].min_pressure = parseFloat(json_data[i].min_pressure).toFixed(2)
    }
    var column = ['node_id', 'demand', 'flow_in', 'flow_satisfied', 'pressure', 'min_pressure', 'pressure_satisfied'];
    var header = ['ID', 'Demand', 'Flow in', 'Satisfy?', 'Head', 'Height', 'Satisfy?']
    create_dynamic_table('#dynamic_table_node', json_data, column, header);
}


// ======= NODES ====== //
function getNodesDynamic() {
    var url_customers = "/api/nodes/" + state;
    d3.json(url_customers, writeNodesDynamic);
}

function get_specified_node_dynamic() {
    var node_id = document.getElementById('search_dynamic_node_id').value
    var url_specified_node = "/api/nodes/" + state + "/" + node_id;
    d3.json(url_specified_node, writeNodesDynamic);
}

function getKeyNodesDynamicLowest() {
    var url_customers = "/api/five_lowest_pressure/" + state;
    d3.json(url_customers, writeNodesDynamic);
}

function getKeyNodesDynamicHighest() {
    var url_customers = "/api/five_highest_pressure/" + state;
    d3.json(url_customers, writeNodesDynamic);
}

function writeNodesDynamic(nodes) {
    json_data = nodes.json_list;
    for (i = 0; i < json_data.length; i++) {
        json_data[i].pressure = parseFloat(json_data[i].pressure).toFixed(2)
        json_data[i].head = parseFloat(json_data[i].head).toFixed(2)
    }
    var column = ['node_id', 'node_type', 'demand', 'head', 'pressure'];
    var header = ['ID', 'Type', 'Demand', 'Height', 'Head'];
    create_dynamic_table('#dynamic_table_node', json_data, column, header);
}

// ====== VALVES ====== //
function getValvesDynamic() {
    var url_valves = "/api/valves_table/" + state;
    d3.json(url_valves, writeValvesDynamic);

}

function writeValvesDynamic(edges) {
    json_data = edges.json_list;
    var column = ['edge_id', 'head_id', 'tail_id', 'valve_status'];
    var header = ['ID', 'Head ID', 'TAIL ID', 'Status'];
    create_dynamic_table('#dynamic_table_edge', json_data, column, header);
}

// ====== EDGES ====== //

function getEdgesDynamic() {
    var url_customers = "/api/edges/" + state;
    d3.json(url_customers, writeEdgesDynamic);
}

function getKeyEdgesDynamicLowest() {
    var url_customers = "/api/five_lowest_flow/" + state;
    d3.json(url_customers, writeEdgesDynamic);
}

function getKeyEdgesDynamicHighest() {
    var url_customers = "/api/five_highest_flow/" + state;
    d3.json(url_customers, writeEdgesDynamic);
}

function get_specified_edge_dynamic() {
    var edge_id = document.getElementById('search_dynamic_edge_id').value
    var url_specified_edge = "/api/edges/" + state + "/" + edge_id;
    d3.json(url_specified_edge, writeEdgesDynamic);
}

function get_pump_curve() {
	var pump_id = document.getElementById('search_pump_id').value
	var url = "/api/pumps/" + state + "/" + pump_id
	d3.json(url, function(pump) {
        d3.select("#pump-curve-canvas").selectAll("*").remove();
        pump_data = pump.json_list[0]
        // get edge information
        var url_specified_edge = "/api/edges/" + state + "/" + pump_data.edge_id;
        d3.json(url_specified_edge, writePumpsDynamic);
    });
}

function writePumpsDynamic(edges) {
    json_data = edges.json_list;
    for (i = 0; i < json_data.length; i++) {
        json_data[i].flow = parseFloat(json_data[i].flow).toFixed(2)
        json_data[i].gap = parseFloat(json_data[i].gap).toFixed(2)
    }
    
    var dh_max = pump_data.coeff[1]
    var gamma = pump_data.coeff[0]
    var xMax = parseFloat(json_data[0].flow)/1000
    var q = linspace(0, xMax, 20)
    var dh = q.map(function(i){return dh_max + gamma*Math.pow(i,2)})
    plot("#pump-curve-canvas", pump_data.x, pump_data.y, q, dh, "Pressure")

    var column = ['edge_id', 'edge_type', 'head_id', 'tail_id', 'flow', 'gap']
    var header = ['ID', 'Type', 'Head ID', 'TAIL ID', 'Flow', 'Gap'];
    create_dynamic_table('#dynamic_table_pump', json_data, column, header);
}

function writeEdgesDynamic(edges) {
    json_data = edges.json_list;
    for (i = 0; i < json_data.length; i++) {
        json_data[i].flow = parseFloat(json_data[i].flow).toFixed(2)
        json_data[i].gap = parseFloat(json_data[i].gap).toFixed(2)
    }
    var column = ['edge_id', 'edge_type', 'head_id', 'tail_id', 'flow', 'gap']
    var header = ['ID', 'Type', 'Head ID', 'TAIL ID', 'Flow', 'Gap'];
    create_dynamic_table('#dynamic_table_edge', json_data, column, header);
}


function getKeyNodes() {
    document.getElementById("top-five-flow").click();
}

function getKeyEdges() {
    document.getElementById("top-five-pressure").click();
}

function get_top_five_highest_pressure_nodes() {
    var url_top_five_pressure_nodes = "/api/five_highest_pressure/" + state;
    d3.json(url_top_five_pressure_nodes, writeTopFivePressureTable);

}

function get_top_five_lowest_pressure_nodes() {
    var url_top_five_pressure_nodes = "/api/five_lowest_pressure/" + state;
    d3.json(url_top_five_pressure_nodes, writeTopFivePressureTable);

}

function get_top_five_highest_flow_edges() {
    var url_top_five_flow_edges = "/api/five_highest_flow/" + state;
    d3.json(url_top_five_flow_edges, writeTopFiveFlowTable);

}

function get_top_five_lowest_flow_edges() {
    var url_top_five_flow_edges = "/api/five_lowest_flow/" + state;
    d3.json(url_top_five_flow_edges, writeTopFiveFlowTable);

}

function get_specified_node() {
    var node_id = document.getElementById('search_node_id').value
    var url_specified_node = "/api/nodes/" + state + "/" + node_id;
    d3.json(url_specified_node, writeTopFivePressureTable);
}


function get_specified_edge() {
    var edge_id = document.getElementById('search_edge_id').value
    var url_specified_edge = "/api/edges/" + state + "/" + edge_id;
    d3.json(url_specified_edge, writeTopFiveFlowTable);
}

function writeSummaryTable(summary) {
    d3.select("#td-name").text(summary.name);
    d3.select("#td-num_node").text(summary.num_node);
    d3.select("#td-num_edge").text(summary.num_edge);
    d3.select("#td-num_customer").text(summary.num_customer);
    d3.select("#td-num_source").text(summary.num_source);
    d3.select("#td-num_tank").text(summary.num_tank);
    d3.select("#td-num_pump").text(summary.num_pump);
    d3.select("#td-num_valve").text(summary.num_valve);
}

function writeCustomersTable(nodes) {
    var customers_nodes_list = nodes.json_list;

    for (i = 1; i <= 5; i++) {
        d3.select("#customers-name" + i).text("");
        d3.select("#customers-id" + i).text("");
        d3.select("#customers-demand" + i).text("");
        d3.select("#customers-flow_in" + i).text("");
        d3.select("#customers-flow_satisfied" + i).selectAll("span").remove();
        d3.select("#customers-pressure" + i).text("");
        d3.select("#customers-min_pressure" + i).text("");
        d3.select("#customers-pressure_satisfied" + i).selectAll("span").remove();
    }

    for (i = 1; i <= customers_nodes_list.length; i++) {
        d3.select("#customers-name" + i).text(customers_nodes_list[i - 1].name);
        d3.select("#customers-id" + i).text(customers_nodes_list[i - 1].node_id);
        d3.select("#customers-demand" + i).text(customers_nodes_list[i - 1].demand);
        d3.select("#customers-flow_in" + i).text(parseFloat(customers_nodes_list[i - 1].flow_in).toFixed(2));

        if (customers_nodes_list[i - 1].flow_satisfied) {
            d3.select("#customers-flow_satisfied" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-ok")
                .attr("style", "color:#5cb85c");
        } else {
            d3.select("#customers-flow_satisfied" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-remove")
                .attr("style", "color:#d9534f");
        }

        d3.select("#customers-pressure" + i).text(parseFloat(customers_nodes_list[i - 1].pressure).toFixed(2));
        d3.select("#customers-min_pressure" + i).text(customers_nodes_list[i - 1].min_pressure);

        if (customers_nodes_list[i - 1].pressure_satisfied) {
            d3.select("#customers-pressure_satisfied" + i)
                .append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-ok")
                .attr("style", "color:#5cb85c");
        } else {
            d3.select("#customers-pressure_satisfied" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-remove")
                .attr("style", "color:#d9534f");
        }
    }
}


function writeSourcesTable(nodes) {
    var sources_nodes_list = nodes.json_list;

    for (i = 1; i <= 5; i++) {
        d3.select("#sources-id" + i).text("");
        d3.select("#sources-flow_out" + i).text("");
        d3.select("#sources-pressure" + i).text("");
        d3.select("#sources-min_pressure" + i).text("");
        d3.select("#sources-pressure_satisfied" + i).selectAll("span").remove();
    }

    for (i = 1; i <= 5; i++) {
        d3.select("#sources-id" + i).text(sources_nodes_list[i - 1].node_id);
        d3.select("#sources-flow_out" + i).text(parseFloat(sources_nodes_list[i - 1].flow_out).toFixed(2));
        d3.select("#sources-pressure" + i).text(parseFloat(sources_nodes_list[i - 1].pressure).toFixed(2));
        d3.select("#sources-min_pressure" + i).text(sources_nodes_list[i - 1].min_pressure);

        if (sources_nodes_list[i - 1].pressure >= sources_nodes_list[i - 1].min_pressure) {
            d3.select("#sources-pressure_satisfied" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-ok")
                .attr("style", "color:#5cb85c");
        } else {
            d3.select("#sources-pressure_satisfied" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-remove")
                .attr("style", "color:#d9534f");
        }
    }
}

function writeValvesTable(valves) {
    var valves_edges_list = valves.json_list;

    for (i = 1; i <= 5; i++) {
        d3.select("#valves-edge_id" + i).text("");
        d3.select("#valves-head_id" + i).text("");
        d3.select("#valves-tail_id" + i).text("");
        d3.select("#valves-valve_flow" + i).text("");
        d3.select("#valves-valve_status" + i).selectAll("span").remove();
    }

    for (i = 1; i <= 5; i++) {
        d3.select("#valves-edge_id" + i).text(valves_edges_list[i - 1].edge_id);
        d3.select("#valves-head_id" + i).text(valves_edges_list[i - 1].head_id);
        d3.select("#valves-tail_id" + i).text(valves_edges_list[i - 1].tail_id);
        d3.select("#valves-valve_flow" + i).text(parseFloat(valves_edges_list[i - 1].valve_flow).toFixed(2));

        if (valves_edges_list[0].valve_status) {
            d3.select("#valves-valve_status" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-ok-circle")
                .attr("style", "color:#5cb85c");
        } else {
            d3.select("#valves-valve_status" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-ban-circle")
                .attr("style", "color:#d9534f");
        }
    }
}


function writeTopFivePressureTable(nodes) {
    var top_five_pressure_nodes_list = nodes.json_list;

    for (i = 1; i <= 5; i++) {
        d3.select("#top_five_pressure-id" + i).text("");
        d3.select("#top_five_pressure-min_pressure" + i).text("");
        d3.select("#top_five_pressure-pressure" + i).text("");
        d3.select("#top_five_pressure-type" + i).selectAll("span").remove();
        d3.select("#top_five_pressure-satisfied" + i).selectAll("span").remove();
    }

    for (i = 1; i <= top_five_pressure_nodes_list.length; i++) {
        d3.select("#top_five_pressure-id" + i).text(top_five_pressure_nodes_list[i - 1].node_id);
        d3.select("#top_five_pressure-min_pressure" + i).text(parseFloat(top_five_pressure_nodes_list[i - 1].head).toFixed(2));
        d3.select("#top_five_pressure-pressure" + i).text(parseFloat(top_five_pressure_nodes_list[i - 1].pressure).toFixed(2));
        var node_type = top_five_pressure_nodes_list[i - 1].node_type;
        switch (node_type) {
            case CONSUMER:
                d3.select("#top_five_pressure-type" + i).append("xhtml:span")
                    .attr("class", "label label-danger")
                    .text("consumer");
                break;
            case SOURCE:
                d3.select("#top_five_pressure-type" + i).append("xhtml:span")
                    .attr("class", "label label-warning")
                    .text("source");
                break;
            case TANK:
                d3.select("#top_five_pressure-type" + i).append("xhtml:span")
                    .attr("class", "label label-success")
                    .text("tank");
                break;
            default:
                d3.select("#top_five_pressure-type" + i).append("xhtml:span")
                    .attr("class", "label label-primary")
                    .text("junction");
        }
        d3.select("#top_five_pressure-type" + i).text();
        if (top_five_pressure_nodes_list[i - 1].pressure >= top_five_pressure_nodes_list[i - 1].head) {
            d3.select("#top_five_pressure-satisfied" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-ok")
                .attr("style", "color:#5cb85c");
        } else {
            d3.select("#top_five_pressure-satisfied" + i).append("xhtml:span")
                .attr("class", "control glyphicon glyphicon-remove")
                .attr("style", "color:#d9534f");
        }
    }
}


function writeTopFiveFlowTable(edges) {
    var top_five_flow_edges_list = edges.json_list;

    for (i = 1; i <= 5; i++) {
        d3.select("#top_five_flow-edge_id" + i).text("");
        d3.select("#top_five_flow-head_id" + i).text("");
        d3.select("#top_five_flow-tail_id" + i).text("");
        d3.select("#top_five_flow-flow" + i).text("");
        d3.select("#top_five_flow-type" + i).selectAll("span").remove();
        d3.select("#top_five_flow-gap" + i).text("");
        // d3.select("#top_five_pressure-satisfied" + i).selectAll("span").remove();
    }

    for (i = 1; i <= top_five_flow_edges_list.length; i++) {
        d3.select("#top_five_flow-edge_id" + i)
            .text(top_five_flow_edges_list[i - 1].edge_id)
            .on("mouseover", function(d) {
                d3.select(this)
                    .style('background-color', "red");

                var thisID = d3.select(this).text()

                d3.select("#graph-canvas").selectAll("line")
                    .filter(function(d) {
                        return d.edge_id == parseInt(thisID);
                    })
                    .attr("stroke-width", 100)
                    .attr("stroke", "red");
            })
            .on("mouseout", function(d) {
                d3.select(this)
                    .style('background-color', "white");
                var thisID = d3.select(this).text()

                d3.select("#graph-canvas").selectAll("line")
                    .filter(function(d) {
                        return d.edge_id == parseInt(thisID);
                    })
                    .attr("stroke-width", 4)
                    .attr("stroke", "steelblue");
            });
        d3.select("#top_five_flow-head_id" + i).text(top_five_flow_edges_list[i - 1].head_id);
        d3.select("#top_five_flow-tail_id" + i).text(top_five_flow_edges_list[i - 1].tail_id);
        d3.select("#top_five_flow-flow" + i).text(parseFloat(top_five_flow_edges_list[i - 1].flow).toFixed(2));
        d3.select("#top_five_flow-gap" + i).text(parseFloat(top_five_flow_edges_list[i - 1].gap).toFixed(2));


        var edge_type = top_five_flow_edges_list[i - 1].edge_type;
        switch (edge_type) {
            case PUMP:
                d3.select("#top_five_flow-type" + i).append("xhtml:span")
                    .attr("class", "label label-warning")
                    .text("pump");
                break;
            case VALVE:
                d3.select("#top_five_flow-type" + i).append("xhtml:span")
                    .attr("class", "label label-success")
                    .text("valve");
                break;
            default:
                d3.select("#top_five_flow-type" + i).append("xhtml:span")
                    .attr("class", "label label-primary")
                    .text("pipe");
        }
    }

}

function print_test() {
    console.log("testtest");
}



function create_dynamic_table(label_identifier, data, columns, header) {
    d3.select(label_identifier).selectAll('table').remove()
    var table = d3.select(label_identifier).append('table')
        .style("width", "100%")
        .attr("class", "table");
    var thead = table.append('thead')

    var tbody = table.append('tbody')

    thead.append('tr')
        .selectAll('th')
        .style("padding-top", 10)
        .style("padding-left", 2)
        .style("text-align", "center")
        .data(header).enter()
        .append('th')
        .style("padding-top", 10)
        .style("padding-left", 2)
        .style("text-align", "center")
        .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll('tr')
        .data(data)
        .enter()
        .append('tr')
        .attr("id", "new_row")
        .style("padding-top", 10)
        .style("padding-left", 2)
        .style("text-align", "center")
        .on("mouseover", function(d) {
            d3.select(this)
                .style('background-color', "#F9F2F4");

            var cells = d3.select(this).selectAll('td')
            var cell_select_node_id = cells.filter(function(d) { return d.column == "node_id" ? this : null })
            if (cell_select_node_id[0].length > 0) {
                var node_id = cell_select_node_id.text()
                d3.select("#graph-canvas").selectAll("circle")
                    .filter(function(d) {
                        return d.node_id == parseInt(node_id);
                    })
                    .moveToFront()
                    .attr("r", 8);
            }

            var cell_select_edge_id = cells.filter(function(d) { return d.column == "edge_id" ? this : null })
            if (cell_select_edge_id[0].length > 0) {
                var cell_select_head_id = cells.filter(function(d) { return d.column == "head_id" ? this : null })
                var cell_select_tail_id = cells.filter(function(d) { return d.column == "tail_id" ? this : null })
                var head_id = cell_select_head_id.text()
                var tail_id = cell_select_tail_id.text()

                var edge_id = cell_select_edge_id.text()
                d3.select("#graph-canvas").selectAll("line")
                    .filter(function(d) {
                        return d.edge_id == parseInt(edge_id);
                    })
                    .attr("stroke", "red");

                d3.select("#graph-canvas").selectAll("circle")
                    .filter(function(d) {
                        return (d.node_id == parseInt(head_id)) || (d.node_id == parseInt(tail_id));
                    })
                    .moveToFront()
                    .attr("r", 8);
            }
        })
        .on("mouseout", function(d) {
            d3.select(this)
                .style('background-color', "white");

            var cells = d3.select(this).selectAll('td')
            var cell_select_node_id = cells.filter(function(d) { return d.column == "node_id" ? this : null })
            if (cell_select_node_id[0].length > 0) {
                var node_id = cell_select_node_id.text()
                d3.select("#graph-canvas").selectAll("circle")
                    .filter(function(d) {
                        return d.node_id == parseInt(node_id);
                    })
                    .attr("r", 4);
            }

            var cell_select_edge_id = cells.filter(function(d) { return d.column == "edge_id" ? this : null })
            if (cell_select_edge_id[0].length > 0) {
                var cell_select_head_id = cells.filter(function(d) { return d.column == "head_id" ? this : null })
                var cell_select_tail_id = cells.filter(function(d) { return d.column == "tail_id" ? this : null })
                var head_id = cell_select_head_id.text()
                var tail_id = cell_select_tail_id.text()

                var edge_id = cell_select_edge_id.text()
                d3.select("#graph-canvas").selectAll("line")
                    .filter(function(d) {
                        return d.edge_id == parseInt(edge_id);
                    })
                    .attr("stroke", "steelblue");

                d3.select("#graph-canvas").selectAll("circle")
                    .filter(function(d) {
                        return (d.node_id == parseInt(head_id)) || (d.node_id == parseInt(tail_id));
                    })
                    .moveToFront()
                    .attr("r", 4);
            }


        });

    // create a cell in each row for each column
    var cells = rows.selectAll('td')
        .attr("id", "new_cell")
        .style("padding-top", 10)
        .style("padding-left", 2)
        .style("text-align", "center")
        .data(function(row) {
            return columns.map(function(column) {
                return { column: column, value: row[column] };
            });
        })
        .enter()
        .append('td')
        .attr("id", "new_cell")
        .style("padding-top", 15)
        .style("padding-left", 2)
        .style("text-align", "center")
        .text(function(d) {            
            return d.value;
        });

    var cell_select = cells.filter(function(d) { return d.column == "valve_status" ? this : null })
        .filter(function(d) { return d.value == 1 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "control glyphicon glyphicon-ok-circle")
        .attr("style", "color:#5cb85c");
    var cell_select = cells.filter(function(d) { return d.column == "valve_status" ? this : null })
        .filter(function(d) { return d.value == 0 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "control glyphicon glyphicon-ban-circle")
        .attr("style", "color:#d9534f");

    var cell_select = cells.filter(function(d) { return d.column == "flow_satisfied" ? this : null })
        .filter(function(d) { return d.value == 1 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "control glyphicon glyphicon-ok-circle")
        .attr("style", "color:#5cb85c");
    var cell_select = cells.filter(function(d) { return d.column == "flow_satisfied" ? this : null })
        .filter(function(d) { return d.value == 0 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "control glyphicon glyphicon-ban-circle")
        .attr("style", "color:#d9534f");

    var cell_select = cells.filter(function(d) { return d.column == "pressure_satisfied" ? this : null })
        .filter(function(d) { return d.value == 1 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "control glyphicon glyphicon-ok-circle")
        .attr("style", "color:#5cb85c");
    var cell_select = cells.filter(function(d) { return d.column == "pressure_satisfied" ? this : null })
        .filter(function(d) { return d.value == 0 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "control glyphicon glyphicon-ban-circle")
        .attr("style", "color:#d9534f");


    var cell_select = cells.filter(function(d) { return d.column == "edge_type" ? this : null })
        .filter(function(d) { return d.value == 1 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "label label-warning")
        .text("pump");
    var cell_select = cells.filter(function(d) { return d.column == "edge_type" ? this : null })
        .filter(function(d) { return d.value == 2 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "label label-success")
        .text("valve");
    var cell_select = cells.filter(function(d) { return d.column == "edge_type" ? this : null })
        .filter(function(d) { return d.value == 0 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "label label-primary")
        .text("pipe");

    var cell_select = cells.filter(function(d) { return d.column == "node_type" ? this : null })
        .filter(function(d) { return d.value == 1 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "label label-danger")
        .text("customer");
    var cell_select = cells.filter(function(d) { return d.column == "node_type" ? this : null })
        .filter(function(d) { return d.value == 2 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "label label-warning")
        .text("source");
    var cell_select = cells.filter(function(d) { return d.column == "node_type" ? this : null })
        .filter(function(d) { return d.value == 3 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "label label-success")
        .text("tank");
    var cell_select = cells.filter(function(d) { return d.column == "node_type" ? this : null })
        .filter(function(d) { return d.value == 0 ? this : null })
        .text("")
        .append("xhtml:span")
        .attr("class", "label label-primary")
        .text("junction");

}



