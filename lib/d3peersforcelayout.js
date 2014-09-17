var Myd3 = {};
Myd3.peersforcelayout = function(elem){
    var width = 960,
        height = 500;
    
    var color = d3.scale.category10();
    
    var nodes = [],
        links = [];
    
    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .charge(-400)
        .linkDistance(80)
        .size([width, height])
        .on("tick", tick);
    this.force = force;
    
    var svg = d3.select(elem)
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    
    var node = svg.selectAll(".node"),
        link = svg.selectAll(".link");
    
    function start() {
      link = link.data(force.links(), function(d) { 
        return d.source.id + "-" + d.target.id; 
      });
      link.enter().insert("line", ".node").attr("class", "link");
      link.exit().remove();
    
      node = node.data(force.nodes(), function(d) { return d.id;});
      var nodeEnter = node.enter().append('g').attr("class", function(d) { return "node " + d.id; });
      nodeEnter.append("circle").attr("class", function(d) { return "node " + d.id; }).attr("r", 8);
      nodeEnter.append('text');
      node.select('text').text(function(d){return d.name || 'Anon';});
      node.exit().remove();
    
      force.start();
    }
    this.start = start;
    
    function tick() {
      node.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});
          //.attr("cx", function(d) { return d.x; })
          //.attr("cy", function(d) { return d.y; })
    
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
    }
};