$(window).load(function () {	
	initialize(state);
	getSummary();	
	if (loop) {
		flowLoop = setInterval(function() {
       		showDirection();
    	}, 2000);			
	} 
	w3.includeHTML();
});

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
	var url_summary = "/api/summary/" + state;
	d3.json(url_summary, writeSummaryTable);
}

function getCustomers() {
	var url_customers = "/api/customers_table_info/" + state;
	d3.json(url_customers, writeCustomersTable);
}

function getSources() {
	var url_sources = "/api/sources_table_info/" + state;
	d3.json(url_sources, writeSourcesTable);
}

function getValves() {
	var url_valves = "/api/valves_table_info/" + state;
	d3.json(url_valves, writeValvesTable);
}

function getValvesDynamic() {
	var url_valves = "/api/valves_table_info/" + state;
	d3.json(url_valves, writeValvesDynamic);

}

function writeValvesDynamic(edges) {
	json_data = edges.valves_edges_list;
	create_dynamic_table('#dynamic_table_label', json_data, ['edge_id', 'head_id', 'tail_id', 'valve_status']);
}

function getSourcesDynamic(){
	var url_sources = "/api/sources_table_info/" + state;
	d3.json(url_sources, writeSourcesDynamic);

}
function writeSourcesDynamic(nodes) {
	json_data = nodes.sources_nodes_list;
	for (i =0; i < json_data.length; i++) {
		json_data[i].flow_out = parseFloat(json_data[i].flow_out).toFixed(2) 
		json_data[i].pressure = parseFloat(json_data[i].pressure).toFixed(2) 
	}
	create_dynamic_table('#dynamic_table_label', json_data, ['node_id', 'flow_out', 'pressure', 'min_pressure', 'pressure_satisfied']);
}

function getCustomersDynamic() {
	var url_customers = "/api/customers_table_info/" + state;
	d3.json(url_customers, writeCustomersDynamic);
}

function writeCustomersDynamic(nodes) {
	json_data = nodes.customers_nodes_list;	
	for (i =0; i < json_data.length; i++) {
		json_data[i].flow_in = parseFloat(json_data[i].flow_in).toFixed(2) 
		json_data[i].pressure = parseFloat(json_data[i].pressure).toFixed(2) 
	}
	create_dynamic_table('#dynamic_table_label', json_data, ['node_id', 'demand', 'flow_in', 'flow_satisfied', 'pressure', 'min_pressure', 'pressure_satisfied']);
}


// getKeyNodesDynamic
function getNodesDynamic() {
	var url_customers = "/api/nodes/" + state;
	d3.json(url_customers, writeNodesDynamic);
}

function writeNodesDynamic(nodes) {
	json_data = nodes.json_list;
	for (i =0; i < json_data.length; i++) {
		json_data[i].pressure = parseFloat(json_data[i].pressure).toFixed(2) 
	}	
	create_dynamic_table('#dynamic_table_label', json_data, ['node_id', 'demand', 'node_name', 'head', 'node_type', 'pressure']);
}

function getKeyNodesDynamicLowest() {
	var url_customers = "/api/five_lowest_pressure/" + state;
	d3.json(url_customers, writeKeyNodesDynamicLowest);
}

function writeKeyNodesDynamicLowest(nodes) {
	json_data = nodes.json_list;
	for (i =0; i < json_data.length; i++) {
		json_data[i].pressure = parseFloat(json_data[i].pressure).toFixed(2) 
	}	
	create_dynamic_table('#dynamic_table_label', json_data, ['node_id', 'demand', 'node_name', 'head', 'node_type', 'pressure']);
}

function getKeyNodesDynamicHighest() {
	var url_customers = "/api/five_highest_pressure/" + state;
	d3.json(url_customers, writeKeyNodesDynamicHighest);
}

function writeKeyNodesDynamicHighest(nodes) {
	json_data = nodes.json_list;
	for (i =0; i < json_data.length; i++) {
		json_data[i].pressure = parseFloat(json_data[i].pressure).toFixed(2) 
	}	
	create_dynamic_table('#dynamic_table_label', json_data, ['node_id', 'demand', 'node_name', 'head', 'node_type', 'pressure']);
}

function getEdgesDynamic() {
	var url_customers = "/api/edges/" + state;
	d3.json(url_customers, writeEdgesDynamic);
}

function writeEdgesDynamic(nodes) {
	json_data = nodes.json_list;
	for (i =0; i < json_data.length; i++) {
		json_data[i].flow = parseFloat(json_data[i].flow).toFixed(2) 
		json_data[i].gap = parseFloat(json_data[i].gap).toFixed(2) 
	}			
	create_dynamic_table('#dynamic_table_label', json_data, ['edge_id', 'head_id', 'tail_id', 'flow', 'gap','edge_type']);
}

function getKeyEdgesDynamicLowest() {
	var url_customers = "/api/five_lowest_flow/" + state;
	d3.json(url_customers, writeKeyEdgesDynamicLowest);
}

function writeKeyEdgesDynamicLowest(nodes) {
	json_data = nodes.json_list;
	for (i =0; i < json_data.length; i++) {
		json_data[i].flow = parseFloat(json_data[i].flow).toFixed(2) 
		json_data[i].gap = parseFloat(json_data[i].gap).toFixed(2) 
	}			
	create_dynamic_table('#dynamic_table_label', json_data, ['edge_id', 'head_id', 'tail_id', 'flow','gap', 'edge_type']);
}

function getKeyEdgesDynamicHighest() {
	var url_customers = "/api/five_highest_flow/" + state;
	d3.json(url_customers, writeKeyEdgesDynamicHighest);
}

function writeKeyEdgesDynamicHighest(nodes) {
	json_data = nodes.json_list;
	for (i =0; i < json_data.length; i++) {
		json_data[i].flow = parseFloat(json_data[i].flow).toFixed(2) 
		json_data[i].gap = parseFloat(json_data[i].gap).toFixed(2) 
	}			
	create_dynamic_table('#dynamic_table_label', json_data, ['edge_id', 'head_id', 'tail_id', 'flow', 'gap','edge_type']);
}

function get_specified_node_dynamic() {
	var node_id = document.getElementById('search_dynamic_node_id').value
	var url_specified_node= "/api/nodes/" + state + "/" + node_id;
	d3.json(url_specified_node, writeNodesDynamic);
}


function get_specified_edge_dynamic() {
	var edge_id = document.getElementById('search_dynamic_edge_id').value
	var url_specified_edge= "/api/edges/" + state + "/" + edge_id;
	d3.json(url_specified_edge, writeEdgesDynamic);
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
	var url_top_five_flow_edges= "/api/five_lowest_flow/" + state;
	d3.json(url_top_five_flow_edges, writeTopFiveFlowTable);
	
}
function get_specified_node() {
	var node_id = document.getElementById('search_node_id').value
	var url_specified_node= "/api/nodes/" + state + "/" + node_id;
	d3.json(url_specified_node, writeTopFivePressureTable);
}


function get_specified_edge() {
	var edge_id = document.getElementById('search_edge_id').value
	var url_specified_edge= "/api/edges/" + state + "/" + edge_id;
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
	console.log(nodes)
	var customers_nodes_list = nodes.customers_nodes_list;

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
		d3.select("#customers-name" + i).text(customers_nodes_list[i-1].name);
    	d3.select("#customers-id" + i).text(customers_nodes_list[i-1].node_id);
    	d3.select("#customers-demand" + i).text(customers_nodes_list[i-1].demand);
    	d3.select("#customers-flow_in" + i).text(parseFloat(customers_nodes_list[i-1].flow_in).toFixed(2));

	    if (customers_nodes_list[i-1].flow_satisfied) {
	    	d3.select("#customers-flow_satisfied" + i).append("xhtml:span")
		    .attr("class", "control glyphicon glyphicon-ok")
		    .attr("style", "color:#5cb85c");
	    } else {
	    	d3.select("#customers-flow_satisfied" + i).append("xhtml:span")
		    .attr("class", "control glyphicon glyphicon-remove")
		    .attr("style", "color:#d9534f");
	    }

	    d3.select("#customers-pressure" + i).text(parseFloat(customers_nodes_list[i-1].pressure).toFixed(2));
	    d3.select("#customers-min_pressure" + i).text(customers_nodes_list[i-1].min_pressure);

	    if (customers_nodes_list[i-1].pressure_satisfied) {
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
	console.log(nodes)
	var sources_nodes_list = nodes.sources_nodes_list;

	for (i = 1; i <= 5; i++) {
		d3.select("#sources-id" + i).text("");
	    d3.select("#sources-flow_out" + i).text("");
	    d3.select("#sources-pressure" + i).text("");
	    d3.select("#sources-min_pressure" + i).text("");
	    d3.select("#sources-pressure_satisfied" + i).selectAll("span").remove();
	}

	for (i = 1; i <= 5; i++) {
		d3.select("#sources-id" + i).text(sources_nodes_list[i-1].node_id);
	    d3.select("#sources-flow_out" + i).text(parseFloat(sources_nodes_list[i-1].flow_out).toFixed(2));
	    d3.select("#sources-pressure" + i).text(parseFloat(sources_nodes_list[i-1].pressure).toFixed(2));
	    d3.select("#sources-min_pressure" + i).text(sources_nodes_list[i-1].min_pressure);

	    if (sources_nodes_list[i-1].pressure >= sources_nodes_list[i-1].min_pressure) {
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
	console.log(valves)
	var valves_edges_list = valves.valves_edges_list;

	for (i = 1; i <= 5; i++) {
		d3.select("#valves-edge_id" + i).text("");
	    d3.select("#valves-head_id" + i).text("");
	    d3.select("#valves-tail_id" + i).text("");
	    d3.select("#valves-valve_flow" + i).text("");
	    d3.select("#valves-valve_status" + i).selectAll("span").remove();
	}

	for (i = 1; i <= 5; i++) {
		d3.select("#valves-edge_id" + i).text(valves_edges_list[i-1].edge_id);
	    d3.select("#valves-head_id" + i).text(valves_edges_list[i-1].head_id);
	    d3.select("#valves-tail_id" + i).text(valves_edges_list[i-1].tail_id);
	    d3.select("#valves-valve_flow" + i).text(parseFloat(valves_edges_list[i-1].valve_flow).toFixed(2));

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


function writeTopFivePressureTable(nodes){
	console.log(nodes)
	var top_five_pressure_nodes_list = nodes.json_list;

	for (i = 1; i <= 5; i++) {
		d3.select("#top_five_pressure-id" + i).text("");
	    d3.select("#top_five_pressure-min_pressure" + i).text("");
	    d3.select("#top_five_pressure-pressure" + i).text("");
	    d3.select("#top_five_pressure-type" + i).selectAll("span").remove();
	    d3.select("#top_five_pressure-satisfied" + i).selectAll("span").remove();
	}

	for (i = 1; i <= top_five_pressure_nodes_list.length; i++) {
		d3.select("#top_five_pressure-id" + i).text(top_five_pressure_nodes_list[i-1].node_id);
	    d3.select("#top_five_pressure-min_pressure" + i).text(parseFloat(top_five_pressure_nodes_list[i-1].head).toFixed(2));
	    d3.select("#top_five_pressure-pressure" + i).text(parseFloat(top_five_pressure_nodes_list[i-1].pressure).toFixed(2));
	    var node_type = top_five_pressure_nodes_list[i-1].node_type;
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
	    if (top_five_pressure_nodes_list[i-1].pressure >= top_five_pressure_nodes_list[i-1].head) {	    		    	
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


function writeTopFiveFlowTable(edges){
	console.log(edges)
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
		.text(top_five_flow_edges_list[i-1].edge_id)
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
	    d3.select("#top_five_flow-head_id" + i).text(top_five_flow_edges_list[i-1].head_id);
	    d3.select("#top_five_flow-tail_id" + i).text(top_five_flow_edges_list[i-1].tail_id);
	    d3.select("#top_five_flow-flow" + i).text(parseFloat(top_five_flow_edges_list[i-1].flow).toFixed(2));	   
	    d3.select("#top_five_flow-gap" + i).text(parseFloat(top_five_flow_edges_list[i-1].gap).toFixed(2));
	    

	    var edge_type = top_five_flow_edges_list[i-1].edge_type;
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
	    // if (top_five_pressure_nodes_list[i-1].pressure >= top_five_pressure_nodes_list[i-1].head) {	    		    	
	    // 	d3.select("#top_five_pressure-satisfied" + i).append("xhtml:span")
		   //  .attr("class", "control glyphicon glyphicon-ok")
		   //  .attr("style", "color:#5cb85c");
	    // } else {	    		    
	    // 	d3.select("#top_five_pressure-satisfied" + i).append("xhtml:span")
		   //  .attr("class", "control glyphicon glyphicon-remove")
		   //  .attr("style", "color:#d9534f");
	    // }
	}

}

function print_test() {
	console.log("testtest");
}



function create_dynamic_table(label_identifier,data, columns) {
	d3.select(label_identifier).selectAll('table').remove()
	var table = d3.select(label_identifier).append('table')
			.style("width", "100%")
			.attr("class", "table-striped");

	var thead = table.append('thead')

		

	var	tbody = table.append('tbody')


	
	var columns_with_space = new Array(columns.length)
		for (i = 0; i < columns.length; i++) {
		columns_with_space[i] = columns[i].replace('_',' ')
	}
	
	thead.append('tr')
		.selectAll('th')
		.style("padding-top", 10)
		.style("padding-left",2)
		.style("text-align", "center")		
		.data(columns_with_space).enter()
		.append('th')
		.style("padding-top", 10)
		.style("padding-left",2)
		.style("text-align", "center")
		.text(function (column) { return column; });

		// create a row for each object in the data
	var rows = tbody.selectAll('tr')
		.data(data)
		.enter()
		.append('tr')
		.attr("id", "new_row")
		.style("padding-top", 10)
		.style("padding-left",2)
		.style("text-align", "center")	;

		// create a cell in each row for each column
	var cells = rows.selectAll('td')
		.attr("id", "new_cell")	
		.style("padding-top", 10)
		.style("padding-left",2)
		.style("text-align", "center")
		.data(function (row) {
		    return columns.map(function (column) {
		      return {column: column, value: row[column]};
		    });
		  })
		  .enter()
		  .append('td')	
		  .attr("id", "new_cell")
		  .style("padding-top", 15)
		  .style("padding-left",2)		
		  .style("text-align", "center")	  
		    .text(function (d) { return d.value; });

		 console.log(cells)
		 var cell_select = cells.filter(function (d) {return d.column == "valve_status" ? this: null})
		 .filter(function (d) {return d.value == 1 ? this: null})
		 .text("")
		 .append("xhtml:span")
		    .attr("class", "control glyphicon glyphicon-ok-circle")
		    .attr("style", "color:#5cb85c");
		var cell_select = cells.filter(function (d) {return d.column == "valve_status" ? this: null})
		 .filter(function (d) {return d.value == 0 ? this: null})
		 .text("")
		 .append("xhtml:span")
		    .attr("class", "control glyphicon glyphicon-ban-circle")
		    .attr("style", "color:#d9534f");

		var cell_select = cells.filter(function (d) {return d.column == "pressure_satisfied" ? this: null})
		 .filter(function (d) {return d.value == 1 ? this: null})
		 .text("")
		 .append("xhtml:span")
		    .attr("class", "control glyphicon glyphicon-ok-circle")
		    .attr("style", "color:#5cb85c");
		var cell_select = cells.filter(function (d) {return d.column == "pressure_satisfied" ? this: null})
		 .filter(function (d) {return d.value == 0 ? this: null})
		 .text("")
		 .append("xhtml:span")
		    .attr("class", "control glyphicon glyphicon-ban-circle")
		    .attr("style", "color:#d9534f");


		var cell_select = cells.filter(function (d) {return d.column == "edge_type" ? this: null})
		 .filter(function (d) {return d.value == 1 ? this: null})
		 .text("")
		 .append("xhtml:span")
		.attr("class", "label label-warning")
		.text("pump");
		var cell_select = cells.filter(function (d) {return d.column == "edge_type" ? this: null})
		 .filter(function (d) {return d.value == 2 ? this: null})
		 .text("")
		 .append("xhtml:span")
		 .attr("class", "label label-success")
		 .text("valve");	
		var cell_select = cells.filter(function (d) {return d.column == "edge_type" ? this: null})
		 .filter(function (d) {return d.value == 0 ? this: null})
		 .text("")
		 .append("xhtml:span")
		 .attr("class", "label label-primary")
		 .text("pipe");

		var cell_select = cells.filter(function (d) {return d.column == "node_type" ? this: null})
		 .filter(function (d) {return d.value == 1 ? this: null})
		 .text("")
		 .append("xhtml:span")
		.attr("class", "label label-danger")
		.text("customer");
		var cell_select = cells.filter(function (d) {return d.column == "node_type" ? this: null})
		 .filter(function (d) {return d.value == 2 ? this: null})
		 .text("")
		 .append("xhtml:span")
		 .attr("class", "label label-warning")
		 .text("source");	
		var cell_select = cells.filter(function (d) {return d.column == "node_type" ? this: null})
		 .filter(function (d) {return d.value == 3 ? this: null})
		 .text("")
		 .append("xhtml:span")
		 .attr("class", "label label-success")
		 .text("tank");
		var cell_select = cells.filter(function (d) {return d.column == "node_type" ? this: null})
		 .filter(function (d) {return d.value == 0 ? this: null})
		 .text("")
		 .append("xhtml:span")
		 .attr("class", "label label-primary")
		 .text("junction");

}

