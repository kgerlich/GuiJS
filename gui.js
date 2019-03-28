function GuiJS (obj) {
  var _this = this;

  function _escape(str) {
    var new_str = "";
    str.split('').forEach(element => {
      new_str += '\\' + element;
    });
    return new_str;
  }
 
  // keep anchor
  this.anchor = obj.anchor;

  // build shadow variables
  this.shadow_vars = {};
  this.vars = {};
  this.el_with_vars = {};
  this.mouseDown = false;
  this.mouseDownSizer = false;
  
  for (var key in obj.vars) {
    // check if the property/key is defined in the object itself, not in parent
    if (obj.vars.hasOwnProperty(key)) {           
        console.log(key, obj.vars[key]);
        let _key = key;
        function object_getter(key) {
          console.log('object_getter: \'' + _key + '\'');  
          return _this.shadow_vars[_key];
        }
      
        function object_setter(value) {
          console.log('object_setter: \'' + _key + '\'');  
          _this.shadow_vars[_key] = value;
        }
      
        Object.defineProperty(_this.vars,
                        key, {
                          enumerable: true,
                          configurable: true,
                          get: object_getter,
                          set: object_setter,
                        });
        _this.shadow_vars[key] = obj.vars[key];
    }
  }

 
  this.hooks = obj.hooks ? obj.hooks : ['{{', '}}'];
  var left = _escape(this.hooks[0]);
  var right = _escape(this.hooks[1]);

  var regex = new RegExp(left + ' *(?:[0-9a-zA-Z_]*) *' + right, 'g');
  var regex_repl  = new RegExp('(' + left + ' *)|( *' + right + ')', 'g');

  function analyse_elements(_this) {
    console.log('analyse_elements');
    console.log(_this);

    // build a dict of all elements containing vars
    // starting at anchor
    var offset = 0;
    function enumerate_children(el) {
      let children = el.childNodes;
      let number_of_children = children.length;
      let pad = new Array(offset*4 + 1).join(' ');
      if (el.nodeType != Node.TEXT_NODE) {
        console.log(pad + el.nodeName);
      } else {
        console.log(pad + el.nodeName + ' ' + el.textContent);
        if(regex.test(el.textContent)) {
          console.log(pad + 'has var');
          el.textContent.replace(regex, (m, index, str) => {
            //console.log(m, str, index);
            var r_str = str.slice(index, index + m.length).replace(regex_repl, "");

            var inst = {'content': el.textContent,'el' : el };
            console.log(inst);
            if (!(r_str in _this.el_with_vars)) {
              _this.el_with_vars[r_str] = [];
            } 
            _this.el_with_vars[r_str].push(inst); 
            return r_str;
          });
        }
      }
      offset += 1;
      for (let i=0; i<number_of_children; i++) {
        if (children[i]) {
          enumerate_children(children[i]);
        }
      }
      offset -= 1;
    }

    enumerate_children(_this.anchor_element);

    var html = _this.anchor_element.innerHTML;
    html = html.replace(regex, (m, index, str) => {
      //console.log(m, str, index);
      var v = str.slice(index, index + m.length).replace(regex_repl, "");
      if (typeof _this.vars[v] == "function") {
        value = _this.vars[v]();
      } else {
        value = _this.vars[v];
      }
      return value ? value : m + ' var is not defined';
    });    
    _this.anchor_element.innerHTML = html;
    _this.tracked_window = undefined;

    for(var key in  _this.el_with_vars) {
      console.log('key: ' + key);
      var inst =_this.el_with_vars[key];
      for (var i = 0; i < inst.length; i++) {
        console.log(inst[i]);
      }
    }

    function mousemove(e) {
      //console.log('mousemove', e.clientX, e.clientY);
      //console.log(e.target.parentElement.offsetLeft, e.target.parentElement.offsetTop);
    let dx = _this.mouseDownX - e.clientX;  
    let dy = _this.mouseDownY - e.clientY;  
    _this.mouseDownX = e.clientX;
    _this.mouseDownY = e.clientY;
    if (_this.mouseDown && _this.tracked_window) {
        // e.preventDefault();        

        let el = _this.tracked_window.parentElement;
        let curr_window_x = parseInt(el.style.left.replace('px', '')) - dx;
        let curr_window_y = parseInt(el.style.top.replace('px', '')) - dy;

        el.style.left = curr_window_x + 'px';
        el.style.top = curr_window_y + 'px';
      } else if (_this.mouseDownSizer && _this.tracked_window) {
          console.log("sizer");
          let el = _this.tracked_window.parentElement;
          let curr_window_w = parseInt(el.style.width.replace('px', '')) - dx;
          let curr_window_h = parseInt(el.style.height.replace('px', '')) - dy;
  
          el.style.width = curr_window_w + 'px';
          el.style.height = curr_window_h + 'px';
        }
    }

    function bring_to_front(parent){
      // reset z-index and selection color of all
      // windows
      for (let i = 0; i < _this.gui_windows.length; i++)  {
        let el = _this.gui_windows[i];
        el.style.zIndex = -1;
        el.firstChild.style.backgroundColor = "gray";
      }

      for (let i = 0; i < _this.gui_windows.length; i++)  {
        console.log(parent.style.zIndex);
        let el = _this.gui_windows[i];
        if (el == parent) {
          el.style.zIndex = 1;
          el.firstChild.style.backgroundColor = "blue";
        }
      }
    }

    function mousedown(e) {
      console.log('mousedown', e.clientX, e.clientY);
      // e.preventDefault();        
      // e.stopPropagation();
      _this.mouseDown = true;
      _this.mouseDownX = e.clientX;
      _this.mouseDownY = e.clientY;
      console.log('mouse coord', _this.mouseDownX, _this.mouseDownY);
      bring_to_front(e.target.parentElement);
      _this.tracked_window = e.target;
    }

    function mouseup(e) {
      console.log('mouseup', e.clientX, e.clientY);
      _this.mouseDown = false;
      _this.tracked_window = undefined;
      _this.anchor_element.style.cursor = 'default';
    }

    function mouseout(e) {
      console.log('mouseout', e.clientX, e.clientY, e.target);
      if(e.target == _this.anchor_element) {
        _this.mouseDown = false;
        _this.mouseDownSizer = false;
        _this.tracked_window = undefined;
        _this.anchor_element.style.cursor = 'default';
      }
    }

    function mousedownsizer(e) {
      for (let i = 0; i < _this.gui_windows.length; i++)  {
        console.log(e.target.parentElement.style.zIndex);
        let el = _this.gui_windows[i];
        el.style.zIndex = -1;
        el.firstChild.style.backgroundColor = "gray";
      }
      for (let i = 0; i < _this.gui_windows.length; i++)  {
        console.log(e.target.parentElement.style.zIndex);
        let el = _this.gui_windows[i];
        if (el == e.target.parentElement) {
          el.style.zIndex = 1;
          el.firstChild.style.backgroundColor = "blue";
        }
      }
      _this.tracked_window = e.target.parentElement.firstChild;
      _this.mouseDownSizer = true;
      _this.anchor_element.style.cursor = 'nwse-resize';
    }

    function mousedownwindow(e) {
      console.log('mousedownwindow', e.clientX, e.clientY);
      bring_to_front(e.currentTarget);
    }

    _this.gui_windows = document.querySelectorAll('[gui-window]');

    _this.gui_windows.forEach(function (el, i, a) {
      console.log(i);
      // add style to window
      el.classList.add("gui-window");
      
      // get title text and create title div
      var t = el.attributes['gui-window'].nodeValue;
      let d = document.createElement('div');
      d.classList.add('gui-window-title');
      var c = document.createTextNode(t);
      d.appendChild(c);

      d.addEventListener('mousemove', mousemove);
      d.addEventListener('mousedown', mousedown);
      d.addEventListener('mouseup', mouseup);
      // add window title div
      el.insertBefore(d, el.childNodes[0]); 
      el.style.left = 50 + (i * 30) +'px';
      el.style.top = (i * 30) +'px';
      el.style.width = '300px';
      el.style.height = '200px';
      el.style.zIndex = -1;
      el.addEventListener('mousedown', mousedownwindow);

      // create sizer
      d = document.createElement('div');
      d.classList.add('gui-window-sizer');
      d.style.right = 0;
      d.style.bottom = 0;
      d.style.position= "absolute"; 
      d.style.width = '10px';
      d.style.height = '10px';
      d.addEventListener('mousedown', mousedownsizer)
      d.addEventListener('mouseup', mouseup)
      el.appendChild(d);

      var menu = el.querySelectorAll('gui-window-menu');
      if (menu) {
        let menu_div = document.createElement('div');
        menu_div.classList.add('gui-window-menu');

        el.insertBefore(menu_div, el.childNodes[1]); 

        // var rect = d.getBoundingClientRect();
        // console.log(rect.top, rect.right, rect.bottom, rect.left);
        
        menu.forEach(function (el, i, a) {
          console.log(el, i, a);
          var n = el.attributes['name'].value;
          var menu_text = document.createElement('div');
          menu_text.classList.add('gui-window-menu-text');
          var c = document.createTextNode(n);
          menu_text.appendChild(c);
          menu_div.appendChild(menu_text);
        });

        // // create a menu dropdown div
        // d = document.createElement('div');
        // d.classList.add('gui-window-dropdown');
        // //d.style.display = 'hidden';
        // d.style.width = '60px';
        // d.style.height = '100px';
        // var c = document.createTextNode('MENU');
        // d.appendChild(c);
        // el.insertBefore(d, el.childNodes[2]); 

      }
    });

     _this.anchor_element.addEventListener('mousemove', mousemove);
     _this.anchor_element.addEventListener('mouseout', mouseout);
     _this.anchor_element.style.cursor = 'default';
  }

  window.addEventListener("DOMContentLoaded", function() {
    console.log('load');
    _this.anchor_element = document.getElementById(_this.anchor);
    console.log(_this.anchor_element);
    analyse_elements(_this);
  });
}
