var d3map = d3map || {};

(function(){
  "use strict";
  
  /**
	d3map.layer - base for creating other layers 
  **/
  d3map.layer = (function(){
      var id = function(){
          return this._id;
      };
      var setOpacity = function(value){
            this._opacity = value;
            this.redraw();
      };
      var setVisibility = function(value){
        this._isvisible = value;
        this.redraw();
        this.refresh();
      };
      
      
      
      return {
          id: id,
          setOpacity: setOpacity,
          setVisibility: setVisibility
      };
  })();
  
  
  
})();