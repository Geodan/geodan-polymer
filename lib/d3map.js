var d3map = d3map || {};

(function(){
  "use strict";

  
  d3map.map = function(elem, config){
    var self = this;
    this._layers = [];
    
    var width = Math.max(960, window.innerWidth),
    height = Math.max(500, window.innerHeight);
    this.elem = elem;
    var tile = d3.geo.tile()
        .size([width, height]);
    this.tile = tile;
    
    var projection = d3.geo.mercator()
        .scale(( config.zoom << 12 || 1 << 12) / 2 / Math.PI)
        .translate([width / 2, height / 2]);
    this.projection = projection;
        
    var center = projection(config.center || [0,0]);
    this.center = center;
    
    var path = d3.geo.path()
        .projection(projection);
    this.path = path;
    
    function redraw() {
      var tiles = tile
          .scale(zoom.scale())
          .translate(zoom.translate())();
      self.tiles = tiles;
      projection
          .scale(zoom.scale() / 2 / Math.PI)
          .translate(zoom.translate());
     
      //vector
      //    .attr("d", path);
     //vector
     // .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
     // .style("stroke-width", 1 / zoom.scale());
     //TODO: compare with transform option:
     //http://bl.ocks.org/mbostock/5914438
      raster
          .attr("transform", "scale(" + tiles.scale + ")translate(" + tiles.translate + ")");
      self.layers().forEach(function(d){
          d.refresh();
      });
    }
    this.redraw = redraw;
 
    var zoom = d3.behavior.zoom()
        .scale(projection.scale() * 2 * Math.PI)
        .scaleExtent([1 << 8, 1 << 24])
        .translate([width - center[0], height - center[1]])
        .on("zoom", redraw);
    this.zoom = zoom; 
    var svg = d3.select(elem)//d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
    this.svg = svg;
    svg.on('click', function(){
        self.svg.selectAll('.popup').remove();
        //menu(this);
    });
    var raster = svg.append("g").attr('id', 'raster');
    this.raster = raster;
    
    var vector = svg.append("g").attr('id', 'vector');
    this.vector = vector;
    
    svg.call(zoom);
    
    //Show a menu on the map
    function menu(obj,feat){
        var feature = feat;
        var loc = d3.mouse(obj);
        d3.event.stopPropagation();
        self.svg.selectAll('.popup').remove();
        var g = self.svg.append('g');
        g.attr('class','popup')
        .attr("transform", function(z){
            var x = loc[0];
            var y = loc[1];
            return "translate(" + x + "," + y + ")";
        });
        var menuconfig = {
             "name": "root",
             "children": [{
                  name: "model.populator",
                  icon: './images/menuicons/users_icon.png',
                  label: "Populatie",
                  size: 1,
                  action: function(feature){
                      //TODO
                  }
              },{
                  name: "edit.geom",        
                  icon: './images/menuicons/pencil_icon.png',
                  label: 'Bewerken',
                  value: 1, 
                  action: function(feature){
                      self.draw({feature:feature});
                  }
             },{
                  name: "delete",
                  icon: './images/menuicons/clipboard_cut_icon.png',
                  label: 'Verwijderen',
                  value: 1,
                  action: function(feature){
                      core.project().items(feature.id).deleted(true).sync();
                  }
             },{
                  name: "edit.text",
                  icon: './images/menuicons/text_letter_t_icon.png',
                  label: "Tekst",
                  size: 1,
                  action: function(feature){
                      //TODO
                  }
             }]
        };
        var data = menuconfig; 
        width = 150;
        height = 150;
        var radius = Math.min(width, height) / 2;
        var partition = d3.layout.partition()
            .sort(null)
            .size([2 * Math.PI, radius * radius])
            .value(function(d) { return d.value || 1; });
        var arc = d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y * 0.7); })
            .outerRadius(function(d) {
                return Math.sqrt((d.y + d.dy)*1.5);
        });
        var color = d3.scale.category10();
        var entity = g.append('g');
        var chart = entity.append('g')
            .classed('pie popup',true)
            .attr('width',width)
            .attr('height',height)
            .append('g')
            .attr('class','zoomable');
            
         g = chart.datum(data).selectAll("arc1")
            .data(partition.nodes)
            .enter().append("g")
            .attr("class", "arc1")
            .on('click', function(d, feat){
                 self.svg.selectAll('.popup').remove();
                 d3.event.stopPropagation();//Prevent the map from firing click event as well
                 var action = d.action;
                 if (d.action){
                     action(feature);
                 }
                 else{
                     console.warn('No action defined for menu item');
                 }
                 //self.trigger(name, {fid: fid, layer: feature, obj: d});
            })
            .on('mouseover', function(d){ //Mouseover menulabel
                d3.select(this)
                     .append("text")
                      .classed('menu_shadow',true)
                      //.attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                      .attr("dy", 0)
                      .attr("dx", 0)
                      .text(function(d) { 
                              return d.label; 
                      });
                d3.select(this)
                 .append("text")
                  .classed('menu',true)
                  //.attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                  .attr("dy", 0)
                  .attr("dx", 0)
                  .text(function(d) { 
                          return d.label; 
                  });
                  
            })
            .on('mouseout', function(d){
                d3.select(this)
                    .style('opacity',1)
                    .selectAll('text').remove();
            });
            
        g.append("path")
            .style('opacity',0)
            .transition()
            .style('opacity',1)
            .attr("d", function(d){
                return arc(d);
            })
            
            .style("stroke", "#fff")
            .style("fill", function(d) {
                if (d.name == 'root') {
                    return 'none';
                }
                else if (d.parent && d.parent.name == 'P'){
                    return 'none';
                }
                else if (d.parent && d.parent.name == 'root'){
                    return color(d.name);
                }
                else{ 
                    return color(d.name);
                }
            });
            
            
        g.append("svg:image")
            .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
           .attr('x',-9)
           .attr('y',-12)
           .attr('width', 20)
           .attr('height', 24)
           .attr("xlink:href",function(d){
                   return d.icon;
           });
    }
    this.menu = menu;
    
    
    
    function resize(size){
        this.tile.size(size);
    }
    this.resize = resize;
    
    function layers(){
        return this._layers;
    }
    this.layers = layers;
    
    function addLayer(layer){
        if (!layer.id()){
            console.warn('Not a valid layer. (No ID)');
            return false;
        }
        //Replace existing ID
        this._layers.forEach(function(d){
            if (d.id() == layer.id()){
                layer = d;
                return true;
            }
        });
        this._layers.push(layer);
        return true;
    }
    this.addLayer = addLayer;
    
    function removeLayer(id){
        this._layers.forEach(function(d,i){
            if (d.id() == id){
                this._layers.splice(i,1);
                return true;
            }
        });
        return false;
    }
    this.removeLayer = removeLayer;
    

    function drawpoint(me){
       var icon = self.vector.append('g').attr('id', 'drawpointer').append('image')
            .attr("xlink:href", self.curUrl)
            .attr("width",30).attr("height",30)
            .attr('x',-100)
            .attr('y',-100);
       //Make the icon follow the pointer
       self.svg.on('mousemove', function(d){
           var loc  = d3.mouse(this);
           icon.attr('x', loc[0] -15);
           icon.attr('y', loc[1] -15);
       });
       //Add an item on click
       self.svg.on('click', function(d){
           var loc = d3.mouse(this);
           self.vector.selectAll('#drawpointer').remove();
           self.svg.on('mousemove',null);
           self.svg.on('click',null);
           var coords = self.projection.invert(loc);
           if (core.project()){
               //Feature is newly created
               if (self.status=='new'){
                   var newid = 'ID' + new Date().getTime();
                   var item = {
                       _id: newid,
                       data: {
                           type: 'feature',
                           id: newid,
                           feature: {
                               type: 'Feature',
                               geometry: {
                                   type: self.curType,
                                   coordinates: coords
                               },
                               style: {
                                   'marker-url': self.curUrl
                               }
                           }
                       }
                   };
                   core.project().items(item).sync();
               }
               else {
                   //Feature only changes coordinates
                   self.feature.geometry.coordinates = coords;
                   core.project().items(self.feature.id).data('feature', self.feature).sync();
                   self.redraw();
               }
           }
           else {
               console.warn('Can\'t draw. (No active project)');
           }
       });
    }
    
    function drawline(){
        //TT: not sure if this pointer adds to the user experience...
        /*
        var icon = self.vector.append('g').attr('id', 'drawpointer'); 
        if (self.curType == 'Linestring'){
            icon.append('line')
                .attr('x1',0).attr('y1',0)
                .attr('x2',20).attr('y2',20)
                .style('stroke', self.curStroke)
                .style('stroke-width', 4);
        } else if (self.curType == 'Polygon'){
            icon.append('polygon')
                .attr('points',"22,1 30,21 17,25 12,23")
                .style('stroke', self.curStroke)
                .style('fill', self.curFill)
                .style('fill-opacity', 0.5)
                .style('stroke-width', 4);
        }
        
        
       //Make the icon follow the pointer
       self.svg.on('mousemove', function(d){
           var loc  = d3.mouse(this);
           icon.attr('transform',"translate("+ (loc[0] -15) + ","+ (loc[1] -15)+ ")");
       });*/
        var npoints = 100;
        var ptdata = [];
        var line = d3.svg.line()
            .interpolate("basis")
            .x(function(d, i) { return d[0]; })
            .y(function(d, i) { return d[1]; });
        var path = self.vector.append('g').attr('id', 'drawpointer')
          .append("path")
            .data([ptdata])
            .attr("class", "line")
            .attr("d", line)
            .style('stroke', self.curStroke)
            .style('stroke-width', '3px')
            .style('fill', self.curFill)
            .style('fill-opacity', 0.3);
        function startDrawing(){
            function dotick(){
                d3.event.preventDefault();
                d3.event.stopPropagation();
                var pt = d3.mouse(this);
                tick(pt);
                //console.log('Move', pt);
            }
            function endDrawing(){
                //console.log('Enddraw');
                self.vector.selectAll('#drawpointer').remove();
                self.svg.on('mousemove',null);
                self.svg.on('touchmove',null);
                self.svg.on('click',null);
                self.svg.on('touchstart', null);
                self.svg.on('touchend', null);
                
                //For simplify.js it is needed to rewrite the array to {x: , y: }
                var linedata = [];
                ptdata.forEach(function(d){
                    linedata.push({x:d[0], y: d[1]});
                });
                linedata = simplify(linedata);
                ptdata = [];
                linedata.forEach(function(d){
                    ptdata.push([d.x, d.y]);
                });
                
                
                if (self.curType == 'Polygon'){
                    ptdata.push(ptdata[0]);//This is different from the linedraw
                }
                
                //Find out clockwise http://stackoverflow.com/questions/14505565/detect-if-a-set-of-points-in-an-array-that-are-the-vertices-of-a-complex-polygon
                function polygonArea(vertices) { 
                    var area = 0;
                    var j = 0;
                    for (var i = 0; i < vertices.length; i++) {
                        j = (i + 1) % vertices.length;
                        area += vertices[i][0] * vertices[j][1];
                        area -= vertices[j][0] * vertices[i][1];
                    }
                    return area / 2;
                }
                var clockwise = polygonArea(ptdata) > 0;
                if (!clockwise){ //if not clockwise drawn, we have to reverse the order of coords
                    ptdata.reverse();
                }
                
                var coords = []; 
                ptdata.forEach(function(d){
                    coords.push(self.projection.invert(d));
                });
                
                //Polygons need an extra array dimension
                if (self.curType == 'Polygon'){
                    coords = [coords];
                }
                
                if (core.project()){
                    //Feature is newly created
                    if (self.status=='new'){
                        var newid = 'ID' + new Date().getTime();
                        var item = {
                            _id: newid,
                            data: {
                                type: 'feature',
                                feature: {
                                    type: 'Feature',
                                    id: newid,
                                    geometry: {
                                        type: self.curType,
                                        coordinates: coords
                                    },
                                    style: {
                                        'stroke': self.curStroke,
                                        'fill': self.curFill
                                    }
                                }
                            }
                        };
                        core.project().items(item).sync();
                    }
                    else {
                        //Feature only changes coordinates
                       self.feature.geometry.coordinates = coords;
                       core.project().items(self.feature.id).data('feature', self.feature).sync();
                       self.redraw();
                    }
                }
                else {
                    console.warn('Can\'t draw. (No active project)');
                }
            }
            //console.log('Startdraw');
            self.svg.on("mousemove", dotick);
            self.svg.on("touchmove", dotick);
            self.svg.on('click', endDrawing);
            self.svg.on('touchend', endDrawing);
        }
        self.svg.on("touchmove", function(d){
                console.log('Touchmove',d3.mouse(this));
        });
        self.svg.on('click', startDrawing);
        //self.svg.on('touchstart', startDrawing);
        self.svg.on('touchstart', function(){
                d3.event.preventDefault();
                console.log('Touchstart');
                self.svg.on("touchmove", function(){
                        console.log('Touchmove',d3.mouse(this));
                });
                self.svg.on('touchend', function(){
                        console.log('Touchend');
                        self.svg.on('touchstart', null);
                        self.svg.on('touchend', null);
                        self.svg.on('touchmove', null);
                });
        });
        
        
        function tick(pt) {
          // push a new data point onto the back
          ptdata.push(pt);
          // Redraw the path:
          path.attr("d", function(d) { 
            return line(d);
          });
        }
    }
    
    function draw(msg){
        var self = this;
        //Remove existing drawpointer
        this.vector.selectAll('#drawpointer').remove();
        if (msg.detail){
            this.status = 'new';
            this.curType = msg.detail.type;
            this.curUrl = msg.detail.url;
            this.curStroke = msg.detail.stroke;
            this.curFill = msg.detail.fill || 'none';
        }
        else {
            this.status = 'exists';
            this.feature = msg.feature;
            this.curType = msg.feature.geometry.type;
            this.curUrl = msg.feature.style['marker-url'];
            this.curStroke = msg.feature.style.stroke;
            this.curFill = msg.feature.style.fill || 'none';
        }
        if (this.curType == 'Point') {
            drawpoint();
        }
        else if (this.curType == 'LineString') {
            drawline();
        }
        else if (this.curType == 'Polygon') {
            drawline();
        }
    }
    this.draw = draw;
    return this;
};
})();