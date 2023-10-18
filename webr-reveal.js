var webR = undefined;
var shelter = undefined;
var aceEditorState = {
  id: 0,
  onChange: [],
}

var webRReady = import('https://webr.r-wasm.org/latest/webr.mjs').then(
  async ({ WebR, ChannelType }) => {
    webR = new WebR({
      channelType: ChannelType.PostMessage,
    });
    await webR.init();
    await webR.installPackages(["ggplot2", "palmerpenguins", "dplyr"]);
    await webR.evalRVoid("library(dplyr);");
    await webR.evalRVoid("library(ggplot2);");
    await webR.evalRVoid("library(palmerpenguins);");
    await webR.flush();
    shelter = await new webR.Shelter();
  }
);

var handleRun = function(
  code,
  out,
  button,
  canvas,
  options = { width: 1008, height: 1008 }
) {
  return async () => {
    button.disabled = true;
    canvas.style.display = 'none';
    const result = await shelter.captureR(`
    invisible(webr::canvas(width=${options.width/2}, height=${options.height/2}))
    ${code.current}
    invisible(dev.off())`, {
      withAutoprint: true,
      captureStreams: true,
      captureConditions: false
    });
    try {
      const outLines = result.output.filter(
        evt => evt.type == 'stdout' || evt.type == 'stderr'
      ).map((evt) => evt.data);
      if (out) {
        out.innerText = outLines.join('\n');
      }
    } finally {
      shelter.purge();
    }

    const messages = await webR.flush();
    messages.forEach((output) => {
      switch (output.type) {
        case 'canvas':
          if (output.data.event === 'canvasNewPage') {
            canvas.style.display = 'block';
            canvas.getContext('2d').clearRect(0, 0, options.width, options.height);
          }
          if (output.data.event === 'canvasImage') {
            canvas.getContext('2d').drawImage(output.data.image, 0, 0);
          }
          break;
        default:
          break;
      }
    });
    button.disabled = false;
  }
};

function insertAceWebR(elem, initialCode, options = {}) {
  if (!options.canvas) {
    options.canvas = { width: 1008, height: 1008 };
  }
  var code = { current: "" };
  var id = aceEditorState.id++;
  aceEditorState.onChange[id] = function(editor) { code.current = editor.getValue(); };

  var container = document.createElement("div");
  container.classList.add("interactive-code");

  // Build "Run code" button
  var button = document.createElement("button");
  button.classList.add("btn");
  button.classList.add("btn-success");
  button.innerText = 'Loading webR...';
  button.disabled = true;
  elem.parentNode.appendChild(button);

  // Build Ace editor iframe
  var ace = document.createElement("iframe");
  ace.classList.add("ace");
  ace.dataset.mode = "r";
  ace.dataset.oninit = `aceEditorState.onChange[${id}](editor)`;
  ace.dataset.onchange = `aceEditorState.onChange[${id}](editor)`;
  ace.srcdoc = initialCode;
  if (options.height) {
    ace.style.height = `${options.height}px`;
  }

  // Build output pane
  var preElem = document.createElement("pre");
  var codeElem = document.createElement("code");
  codeElem.classList.add("code-out");
  preElem.appendChild(codeElem);

  // Build output canvas
  var canvas = document.createElement("canvas");
  canvas.width = options.canvas.width;
  canvas.height = options.canvas.height;
  canvas.style.display = "none";
  canvas.style.margin = "1em auto";
  canvas.style.width = `${options.canvas.width}px`;

  // Populate container
  container.appendChild(ace);
  container.appendChild(preElem);
  elem.parentNode.appendChild(container);
  elem.parentNode.appendChild(canvas);

  // Enable button when ready
  webRReady.then(() => {
    button.onclick = handleRun(code, codeElem, button, canvas, options.canvas);
    button.innerText = 'Run code';
    button.disabled = false;
  });
}
