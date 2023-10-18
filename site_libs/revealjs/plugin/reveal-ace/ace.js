/*
* ace.js
* Copyright (C) 2015 tox <tox@rootkit>
*
* Distributed under terms of the MIT license.
*/

window.RevealAce = function () {
  if(!Reveal.ace) Reveal.ace = {};
  function extend(o) {
    for(var i = 1; i < arguments.length; i++)
      for(var key in arguments[i])
        o[key] = arguments[i][key];
    return o;
  };
  function mkEditor(iframe) {
    var w = iframe.contentWindow, d = w.document;
    var mode = iframe.dataset.mode;
    d.write("<!DOCTYPE html><html>"+
    "<head>"+
    "<script src='https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.4/ace.min.js' type='text/javascript' charset='utf-8'></script>")
    if (mode) {
      d.write("<script src='https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.4/mode-" + mode + ".min.js' type='text/javascript' charset='utf-8'></script>");
    }
    d.write("</head>"+
    "<body>"+
    "<div id='editor' style='position:absolute; left:0; top:0; bottom:0; right:0;'>" +
    iframe.srcdoc+
    "</div>"+
    "</body>"+
    "</html>");
    iframe.onload = function() {
      function slidechanged(event) {
        var e = iframe;
        for(var e = iframe; e && e != event.currentSlide; e = e.parentNode);
          if(!e)
            return;
        iframe.focus();
        editor.focus();
      }
      var editor = w.ace.edit(d.getElementById('editor'));
      var aceConf = extend({}, options, iframe.dataset);
      editor.setOptions({
        fontSize: aceConf.fontsize || "16pt",
      });

      if (mode) {
        var fetched_mode = w.ace.require("ace/mode/" + mode).Mode;
        editor.session.setMode(new fetched_mode());
      }

      // Configuration
      if(aceConf.theme)
        editor.setTheme(aceConf.theme);
      if(aceConf.mode)
        editor.getSession().setMode(aceConf.mode);
      if(aceConf.autoFocus) {
        Reveal.addEventListener('slidechanged', slidechanged);
        slidechanged({ currentSlide: Reveal.getCurrentSlide() })
      }

      // Events
      if(options.oninit)
        options.oninit.call(editor, editor);
      if(iframe.dataset.oninit)
        (new Function("editor", iframe.dataset.oninit)).call(editor, editor);
      if(options.onchange)
        editor.getSession().on('change', options.onchange);
      if(iframe.dataset.onchange) {
        var onchange = new Function("value", "editor", iframe.dataset.onchange);
        editor.getSession().on('change', function() {
          var value = editor.getValue();
          return onchange.call(editor, value, editor);
        });
      }
      if(iframe.id) {
        Reveal.ace[iframe.id] = editor;
      }
    };
    d.close();
  }

  var module = {};
  var config = Reveal.getConfig();
  var options = extend({
    className: "ace",
    autoFocus: false,
    onchange: null,
    oninit: null
  }, config.ace || {});

  var aces = document.getElementsByClassName(options.className);
  for(var i = 0; i < aces.length; i++) {
    if(!aces[i].contentWindow) {
      console.warn("ACE Editors must be embedded in an IFrame");
      continue;
    }
    mkEditor(aces[i]);
  }

  return module;
};
