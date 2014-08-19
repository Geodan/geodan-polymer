var d3map = d3map || {};

(function(){
  "use strict";
        
  /**
	d3map.layer 
  **/
  d3map.vectorlayer = function(id, map, config){
    _.extend(this, d3map.layer);
	this._data = config.data;
	this._id = id;
	this._map = map;
	this._r = config.r;
	this._type = config.type || 'path';
	this._maxzoom = config.maxzoom;
	this._minzoom = config.minzoom;
	this._labels = config.labels || false;
	this._labelconfig = config.labelconfig;
	this._style = config.style || {};
	this._g = this._map.vector.append('g').attr('id',this._id); //now we have a layer to add data on
	this._onmouseover = config.onmouseover;
	this._onclick = config.onclick;
	this._mouseoverContent = config.mouseoverContent;
	this._opacity = config.opacity || 1;
	this._isvisible = config.visible || true;
  };

  d3map.vectorlayer.prototype.clear = function(){
      var entities = this._map.vector.select('#' + this._id).selectAll(".entity").remove();
  };
  
  d3map.vectorlayer.prototype.redraw = function(){
	var projection = this._map.projection;
	this.projection = projection;
	var pointprojection = this._map.pointprojection;
	var clicked = this._map.clicked;
	var path = this._map.path;
	var self = this;
	var style = this._style;
	var labels = this._labels;
	var labelconfig = this._labelconfig;
	var tooltipdiv = d3.select(self._map.elem.parentElement)
	    .append('div')
	    .attr('id', 'tooltipdiv')
	    .style('position', 'absolute');
	var mouseover = function(d){
        if (!d.origopac){
            d.origopac = d3.select(this).style('opacity');
        }
        d3.select(this)
            .transition().duration(100)
            .style('opacity',d.origopac * 0.2);
        
        var content = '';
        _(d.properties).each(function(value,key){
                content = content + '<b>' + key + '</b>' + value + '<br>';
        });
        tooltipdiv.transition()        
            .duration(200)      
            .style("opacity", 0.9);      
        tooltipdiv.html(content + "<br/>")  
            .style("left", (d3.event.pageX) + "px")     
            .style("top", (d3.event.pageY - 28) + "px");
    };
    
    var mouseout = function(d){
        d3.select(this)
            .transition().duration(100)
            .style('opacity',d.origopac);
        tooltipdiv.transition()        
            .duration(500)      
            .style("opacity", 0);
        tooltipdiv.transition().delay(1500)
            .style('top', '-100px');
    };
	
	
	var click = function(d,e){
	    self._map.menu(this,d);
	};
	
	 //Build up the element
    var build = function(d){
      var entity = d3.select(this);
      //Point/icon feature
      if (d.style && d.style['marker-url'] && d.geometry.type == 'Point'){ 
          var x = projection(d.geometry.coordinates)[0];
          var y = projection(d.geometry.coordinates)[1];
          var img = entity.append("image")
                //.transition().duration(500)
                .on("click", click)
                .on('mouseover',mouseover)
                .on('mouseout',mouseout);
      }
      //Path feature
      else{
        var path = entity.append("path")
            //.transition().duration(500)
            .on("click", click)
            .on('mouseover',mouseover)
            .on('mouseout',mouseout);
      }
    };
        
    //A per feature styling method
    var styling = function(d){
      var entity = d3.select(this);
      //Point/icon feature
      if (d.style && d.style['marker-url'] && d.geometry.type == 'Point'){ 
          var x = projection(d.geometry.coordinates)[0];
          var y = projection(d.geometry.coordinates)[1];
          var img = entity.select("image")
                .attr("xlink:href", function(d){
                        return d.style['marker-url'];
                })
                .classed("nodeimg",true)
                .attr("width", 32)
                .attr("height", 37)
                .style('opacity',function(d){ //special case: opacity for icon
                        return d.style.opacity || style.opacity || 1;
                });
         
      }
      //Path feature
      else{                 
        var path = entity.select("path");
        _(style).each(function(val, key) { 
            //First check for generic layer style
            path.style(key,function(d){
                
                    if (typeof(style[key]) == "function") {
                        var f = style[key];
                        return  f(d);
                    }
                    else {//..or by generic style string
                        return style[key]; 
                    }
            });
        });
        //Now apply style in feature
        _(d.style).each(function(val, key){
                path.style(key,val);
        });
      }
    };
    //A per feature styling method
    var textstyling = function(d){
        var obj = this;
        _(labelconfig.style).each(function(val, key) { //First check for generic layer style
            d3.select(obj).style(key,function(d){
                if (d.labelconfig && d.labelconfig.style && d.labelconfig.style[key]){
                    return d.labelconfig.style[key]; //Override with features style if present
                }
                else {	
                    return labelconfig.style[key]; //Apply generic style
                }
            });
        });
        //Now apply remaining styles of feature (possible doing a bit double work from previous loop)
        if (d.labelconfig && d.labelconfig.style) { //If feature has style information
            _(d.labelconfig.style).each(function(val, key){ //run through the styles
                d3.select(obj).style(key,d.labelconfig.style[key]); //and apply them
            });
        }
    };
    //Some path specific styles (point radius, label placement eg.)
    var pathStyler = function(d){ 
        if (d.style && d.style.radius){
            path.pointRadius(d.style.radius);
        }
        else if (style && style.radius){
            path.pointRadius(style.radius);
        }
        return path(d);
    };
    this.pathStyler = pathStyler;
    //Calculating the location of the label, based on settings
    var textLocation = function(d){
        var textLocation = path.centroid(d);
        var bounds = path.bounds(d);
        if (style && style.textlocation){
            switch(style.textlocation){
              case 'ul':
                textLocation[0] = bounds[0][0];
                textLocation[1] = bounds[0][1];
                break;
              case 'ur':
                textLocation[0] = bounds[1][0];
                textLocation[1] = bounds[1][1];
                break;
              //TODO: add other positions
            }
        }
        else {
            textLocation[1] = textLocation[1] + 20; //a bit down..
        }
        return textLocation;
    };
    this.textLocation = textLocation;
	//TODO move out of core
    var labelgenerator = function(d){
        if (labelconfig.field && d.properties){
            var str = d.properties[labelconfig.field];
            if (str && str.length > 10) {
                  return str.substr(0,16) + "..."; //Only first 16 chars
            }
            else {
                return str;
            }
        }
        else {
            return d.id;
        }
    };
	this.labelgenerator = labelgenerator;
    
    
    var entities = this._map.vector.select('#' + this._id).selectAll(".entity")
        .data(this._data, function(d) {
            return d.id;
        });
        
    if (this._isvisible){
        //On enter
        var newentity = entities.enter()
            .append("g")
            .classed('entity',true)
            .attr('id',function(d){
                    return 'entity'+ d.id;
            });
        newentity.each(build);
       
        if (labels){
            var label = newentity.append('g')
                .classed('place-label',true);
            //On new:	
            label
                .append('text')
                .attr("x",function(d) {return textLocation(d)[0] ;})
                .attr("y",function(d) {return textLocation(d)[1] ;})
                .attr('text-anchor', 'left')
                .style('stroke','white')
                .style('stroke-width','3px')
                .style('stroke-opacity',0.8)
                .text(function(d){return labelgenerator(d);});
            label
                .append('text')
                .attr("x",function(d) {return textLocation(d)[0] ;})
                .attr("y",function(d) {return textLocation(d)[1] ;})
                .attr('text-anchor', 'left')
                .each(textstyling)
                .text(function(d){return labelgenerator(d);});
      } //End of new label
   }
   else {
       entities.remove();
   }
   
  //On update
  entities.each(styling);
    
  //On exit
  entities.exit().remove().transition().duration(500);
  this.refresh(); //position the features
};

/**
    layer.refresh() - relocated the features after zoom
**/
d3map.vectorlayer.prototype.refresh = function(){
    var self = this;
    var entities = this._map.vector.select('#' + this._id).selectAll(".entity");
    var path = this._map.path;
    var textLocation = this.textLocation;
    var labels = this._labels;
    var pathStyler = this.pathStyler;
    this._map.vector.select('#' + this._id).style('opacity',this._opacity);
    entities.each(function(d,i){
        var entity = d3.select(this);
        
        var x = path.centroid(d)[0];
        var y = path.centroid(d)[1];
        
        if (d.style && d.style['marker-url'] && d.geometry.type == 'Point'){
            entity.select('image')
                .attr("x",x-12.5)
                .attr("y",y-25);
        }
        else{
            entity.select('path') //Only 1 path per entity
                .attr("d",pathStyler(d));
        }
        
        if (labels){
            var opacity = 1;
            if (self._labelconfig && self._labelconfig.minzoom && self._map.zoom.scale() < self._labelconfig.minzoom){
                opacity =0;
            }
            entity.select('.place-label')
                .style('opacity',opacity)
                .selectAll('text')
                .attr("x", textLocation(d)[0] )
                .attr("y", textLocation(d)[1] );
        }
    });
};


/** 
	layer.data(features) - adds/replaces features for specific layer
**/
d3map.vectorlayer.prototype.data = function(data){
	var projection = this._map.projection;
	var pointprojection = this._map.pointprojection;
	var clicked = this._map.clicked;
	var self = this;
	var style = this._style;
	this._data = data;
	this.redraw();
};
})();