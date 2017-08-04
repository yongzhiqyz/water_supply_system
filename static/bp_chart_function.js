

function bpFuntion() {
    var url_data = "/api/get_gap_statistics/" + state;
    d3.json(url_data, create_bp_chart);
}

function create_bp_chart(nodes){
nodes = nodes.json_list
console.log(nodes)
nodes = nodes.map(function(d){ return [['gap_flow_positive', d.gap_flow_positive],['gap_flow_zero', d.gap_flow_zero], ['no_gap', d.no_gap]]})


var data = [['gap_flow_positive','valves', 0],
['gap_flow_zero', 'valves', 0],
['no_gap', 'valves', 0],
['gap_flow_positive', 'pump', 0],
['gap_flow_zero', 'pump', 0],
['no_gap', 'pump', 0],
['gap_flow_positive', 'pipe', 0],
['gap_flow_zero', 'pipe', 0],
['no_gap', 'pipe', 0]
];
console.log(data)

for (i = 0; i < 3; i++){
    for (j = 0; j<3; j++){
        data[i*3+j][2] = nodes[i][j][1]
    }    
}

console.log(data)

var color ={gap_flow_positive:"#3366CC", gap_flow_zero:"#DC3912", no_gap:"#FF9900"};
var svg = d3.select("#bP-graph").append("svg").attr("width", 960).attr("height", 800);

svg.append("text").attr("x",250).attr("y",70)
    .attr("class","header").text("Gap");
    

var g =[svg.append("g").attr("transform","translate(150,100)")];

var bp=[ viz.bP()
        .data(data)
        .min(12)
        .pad(1)
        .height(600)
        .width(200)
        .barSize(35)
        .fill(d=>color[d.primary])      
    ,viz.bP()
        .data(data)
        .value(d=>d[3])
        .min(12)
        .pad(1)
        .height(600)
        .width(200)
        .barSize(35)
        .fill(d=>color[d.primary])
];
        
[0].forEach(function(i){
    g[i].call(bp[i])
    
    g[i].append("text").attr("x",-50).attr("y",-8).style("text-anchor","middle").text("Gap");
    g[i].append("text").attr("x", 250).attr("y",-8).style("text-anchor","middle").text("Type");
    
    g[i].append("line").attr("x1",-100).attr("x2",0);
    g[i].append("line").attr("x1",200).attr("x2",300);
    
    g[i].append("line").attr("y1",610).attr("y2",610).attr("x1",-100).attr("x2",0);
    g[i].append("line").attr("y1",610).attr("y2",610).attr("x1",200).attr("x2",300);
    
    g[i].selectAll(".mainBars")
        .on("mouseover",mouseover)
        .on("mouseout",mouseout);

    g[i].selectAll(".mainBars").append("text").attr("class","label")
        .attr("x",d=>(d.part=="primary"? -30: 30))
        .attr("y",d=>+6)
        .text(d=>d.key)
        .attr("text-anchor",d=>(d.part=="primary"? "end": "start"));
    
    g[i].selectAll(".mainBars").append("text").attr("class","perc")
        .attr("x",d=>(d.part=="primary"? -100: 80))
        .attr("y",d=>+6)
        .text(function(d){ return d3.format("0.0%")(d.percent)})
        .attr("text-anchor",d=>(d.part=="primary"? "end": "start"));
});


function mouseover(d){
    [0].forEach(function(i){
        bp[i].mouseover(d);
        
        g[i].selectAll(".mainBars").select(".perc")
        .text(function(d){ return d3.format("0.0%")(d.percent)});
    });
}
function mouseout(d){
    [0].forEach(function(i){
        bp[i].mouseout(d);
        
        g[i].selectAll(".mainBars").select(".perc")
        .text(function(d){ return d3.format("0.0%")(d.percent)});
    });
}



}

