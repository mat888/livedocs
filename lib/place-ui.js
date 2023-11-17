const createHash = require('crypto').createHash;
const RBTree     = require('bintrees').RBTree;

class PlaceUI {

  constructor(mod) {
    this.mod = mod;
    
    this.gridSize  = this.mod.gridSize;
    this.gridState = this.mod.gridState;

    this.gridToFrameRatio = 10;
    this.maxScale = 30;
    this.zoomAbsoluteFactor = Math.sqrt(Math.sqrt(2));
    this.markSizeRatio = 0.1;
    this.hourglassHeightRatio = 0.5;
    this.actionsPerSecond = 10;

    this.buttonLightColor  = "#f7f7f7";
    this.buttonShadowColor = "#909090";

    this.blankTileColor = "#ffffff";
  }

  render() {
    document.body.style.margin = "0";
    this.mode = "view";

    this.renderBackground();
    this.renderForeground();
    this.loadBaseHourglass(() => {
      this.renderButtonElements();
      this.setModeRendering();
    });
    this.attachEventsToWindow();
  }

  renderBackground() {
    this.background = document.createElement("img");
    document.body.appendChild(this.background);
    this.background.src = "img/wood-background.jpg";
    this.background.style.width  = "100vw";
    this.background.style.height = "100vh";
    this.background.style.position = "absolute";
    this.background.style.left = "0px";
    this.background.style.top  = "0px";
  }

  renderForeground() {
    this.foreground = document.createElement("div");
    document.body.appendChild(this.foreground);
    this.foreground.style.width  = "100vw";
    this.foreground.style.height = "100vh";
    this.foreground.style.position = "absolute";
    this.foreground.style.left = "0px";
    this.foreground.style.top  = "0px";

    this.frameThickness = Math.min(window.innerWidth, window.innerHeight) / (this.gridToFrameRatio + 2);
    this.wholeViewGridApparentSize = Math.min(window.innerWidth, window.innerHeight) - 2 * this.frameThickness;
    this.minScale = this.wholeViewGridApparentSize / this.gridSize;
    this.currentScale = this.minScale;
    this.gridRenderingSize = this.gridSize * this.maxScale;
    this.gridApparentPosition = {
      left: window.innerWidth / 2  - this.wholeViewGridApparentSize / 2,
      top:  window.innerHeight / 2 - this.wholeViewGridApparentSize / 2
    };

    this.setForegroundRendering();
    this.renderBlankGrid();
    this.renderFrame();

    this.attachEventsToForeground();
  }

  renderBlankGrid() {
    this.gridContainer = document.createElement("div");
    this.foreground.appendChild(this.gridContainer);

    this.gridContainer.style.width  = `${this.gridRenderingSize}px`;
    this.gridContainer.style.height = `${this.gridRenderingSize}px`;
    this.gridContainer.style.position = "absolute";

    this.grid = document.createElement("canvas");
    this.gridContainer.appendChild(this.grid);
    this.grid.width  = this.gridRenderingSize;
    this.grid.height = this.gridRenderingSize;
    this.grid.style.position = "absolute";
    this.grid.style.left = "0px";
    this.grid.style.top  = "0px";

    this.gridCtx = this.grid.getContext("2d");
    this.gridCtx.imageSmoothingEnabled = false;
    this.gridCtx.fillStyle = this.blankTileColor;
    this.gridCtx.fillRect(0, 0, this.grid.width, this.grid.height);

    this.setGridRendering();
  }

  renderFrame() {
    this.frameImage = document.createElement("img");
    this.frameImage.src = "img/frame.jpg";

    this.frame = document.createElement("canvas");
    this.foreground.appendChild(this.frame);
    this.frame.style.position = "absolute";

    this.frameCtx = this.frame.getContext("2d");
    this.frameCtx.imageSmoothingEnabled = false;

    this.frameImage.onload = () => {
      this.setFrameRendering();
    };
  }

  setFrameRendering() {
    this.frame.width  = window.innerWidth;
    this.frame.height = window.innerHeight;
    this.frameCtx.clearRect(0, 0, this.frame.width, this.frame.height);

    const srcThickness = 100;
    const dstThickness = this.frameThickness;

    const leftEdge = {src: {}, dst: {}};
    leftEdge.dst.left   = this.gridApparentPosition.left - dstThickness;
    leftEdge.dst.top    = Math.max(0, this.gridApparentPosition.top - 1);
    leftEdge.dst.bottom = Math.min(window.innerHeight, this.gridApparentPosition.top + this.gridApparentSize + 1);
    leftEdge.dst.width  = dstThickness;
    leftEdge.dst.height = leftEdge.dst.bottom - leftEdge.dst.top;
    leftEdge.src.left   = 0;
    leftEdge.src.top    = srcThickness;
    leftEdge.src.width  = srcThickness;
    leftEdge.src.height = leftEdge.dst.height * srcThickness / dstThickness;
    if (this.gridApparentPosition.left > 0) {
      this.frameCtx.drawImage(
        this.frameImage,
        leftEdge.src.left, leftEdge.src.top, leftEdge.src.width, leftEdge.src.height,
        leftEdge.dst.left, leftEdge.dst.top, leftEdge.dst.width, leftEdge.dst.height
      )
    }

    const rightEdge = {src: {}, dst: {}};
    rightEdge.dst.left   = this.gridApparentPosition.left + this.gridApparentSize;
    rightEdge.dst.top    = Math.max(0, this.gridApparentPosition.top - 1);
    rightEdge.dst.bottom = Math.min(window.innerHeight, this.gridApparentPosition.top + this.gridApparentSize + 1);
    rightEdge.dst.width  = dstThickness;
    rightEdge.dst.height = rightEdge.dst.bottom - rightEdge.dst.top;
    rightEdge.src.left   = this.frameImage.width - srcThickness;
    rightEdge.src.top    = srcThickness;
    rightEdge.src.width  = srcThickness;
    rightEdge.src.height = rightEdge.dst.height * srcThickness / dstThickness;
    if (this.gridApparentPosition.left + this.gridApparentSize < window.innerWidth) {
      this.frameCtx.drawImage(
        this.frameImage,
        rightEdge.src.left, rightEdge.src.top, rightEdge.src.width, rightEdge.src.height,
        rightEdge.dst.left, rightEdge.dst.top, rightEdge.dst.width, rightEdge.dst.height
      );
    }

    const topEdge = {src: {}, dst: {}};
    topEdge.dst.left   = Math.max(0, this.gridApparentPosition.left - 1);
    topEdge.dst.right  = Math.min(window.innerWidth, this.gridApparentPosition.left + this.gridApparentSize + 1);
    topEdge.dst.top    = this.gridApparentPosition.top - dstThickness;
    topEdge.dst.width  = topEdge.dst.right - topEdge.dst.left;
    topEdge.dst.height = dstThickness;
    topEdge.src.left   = srcThickness;
    topEdge.src.top    = 0;
    topEdge.src.width  = topEdge.dst.width * srcThickness / dstThickness;
    topEdge.src.height = srcThickness;
    if (this.gridApparentPosition.top > 0) {
      this.frameCtx.drawImage(
        this.frameImage,
        topEdge.src.left, topEdge.src.top, topEdge.src.width, topEdge.src.height,
        topEdge.dst.left, topEdge.dst.top, topEdge.dst.width, topEdge.dst.height
      );
    }

    const bottomEdge = {src: {}, dst: {}};
    bottomEdge.dst.left   = Math.max(0, this.gridApparentPosition.left - 1);
    bottomEdge.dst.right  = Math.min(window.innerWidth, this.gridApparentPosition.left + this.gridApparentSize + 1);
    bottomEdge.dst.top    = this.gridApparentPosition.top + this.gridApparentSize;
    bottomEdge.dst.width  = bottomEdge.dst.right - bottomEdge.dst.left;
    bottomEdge.dst.height = dstThickness;
    bottomEdge.src.left   = srcThickness;
    bottomEdge.src.top    = this.frameImage.height - srcThickness;
    bottomEdge.src.width  = bottomEdge.dst.width * srcThickness / dstThickness;
    bottomEdge.src.height = srcThickness;
    if (this.gridApparentPosition.top + this.gridApparentSize < window.innerHeight) {
      this.frameCtx.drawImage(
        this.frameImage,
        bottomEdge.src.left, bottomEdge.src.top, bottomEdge.src.width, bottomEdge.src.height,
        bottomEdge.dst.left, bottomEdge.dst.top, bottomEdge.dst.width, bottomEdge.dst.height
      );
    }

    const leftTopCorner = {src: {}, dst: {}};
    leftTopCorner.src.left   = 0;
    leftTopCorner.src.top    = 0;
    leftTopCorner.src.width  = srcThickness;
    leftTopCorner.src.height = srcThickness;
    leftTopCorner.dst.left   = this.gridApparentPosition.left - dstThickness;
    leftTopCorner.dst.top    = this.gridApparentPosition.top  - dstThickness;
    leftTopCorner.dst.width  = dstThickness;
    leftTopCorner.dst.height = dstThickness;
    if (this.gridApparentPosition.left > 0 && this.gridApparentPosition.top > 0) {
      this.frameCtx.drawImage(
        this.frameImage,
        leftTopCorner.src.left, leftTopCorner.src.top, leftTopCorner.src.width, leftTopCorner.src.height,
        leftTopCorner.dst.left, leftTopCorner.dst.top, leftTopCorner.dst.width, leftTopCorner.dst.height
      )
    }

    const leftBottomCorner = {src: {}, dst: {}};
    leftBottomCorner.src.left   = 0;
    leftBottomCorner.src.top    = this.frameImage.height - srcThickness;
    leftBottomCorner.src.width  = srcThickness;
    leftBottomCorner.src.height = srcThickness;
    leftBottomCorner.dst.left   = this.gridApparentPosition.left - dstThickness;
    leftBottomCorner.dst.top    = this.gridApparentPosition.top  + this.gridApparentSize;
    leftBottomCorner.dst.width  = dstThickness;
    leftBottomCorner.dst.height = dstThickness;
    if (this.gridApparentPosition.left > 0 && this.gridApparentPosition.top + this.gridApparentSize < window.innerHeight) {
      this.frameCtx.drawImage(
        this.frameImage,
        leftBottomCorner.src.left, leftBottomCorner.src.top, leftBottomCorner.src.width, leftBottomCorner.src.height,
        leftBottomCorner.dst.left, leftBottomCorner.dst.top, leftBottomCorner.dst.width, leftBottomCorner.dst.height
      )
    }

    const rightTopCorner = {src: {}, dst: {}};
    rightTopCorner.src.left   = this.frameImage.width - srcThickness;
    rightTopCorner.src.top    = 0;
    rightTopCorner.src.width  = srcThickness;
    rightTopCorner.src.height = srcThickness;
    rightTopCorner.dst.left   = this.gridApparentPosition.left + this.gridApparentSize;
    rightTopCorner.dst.top    = this.gridApparentPosition.top  - dstThickness;
    rightTopCorner.dst.width  = dstThickness;
    rightTopCorner.dst.height = dstThickness;
    if (this.gridApparentPosition.left + this.gridApparentSize < window.innerWidth && this.gridApparentPosition.top > 0) {
      this.frameCtx.drawImage(
        this.frameImage,
        rightTopCorner.src.left, rightTopCorner.src.top, rightTopCorner.src.width, rightTopCorner.src.height,
        rightTopCorner.dst.left, rightTopCorner.dst.top, rightTopCorner.dst.width, rightTopCorner.dst.height
      )
    }

    const rightBottomCorner = {src: {}, dst: {}};
    rightBottomCorner.src.left   = this.frameImage.width  - srcThickness;
    rightBottomCorner.src.top    = this.frameImage.height - srcThickness;
    rightBottomCorner.src.width  = srcThickness;
    rightBottomCorner.src.height = srcThickness;
    rightBottomCorner.dst.left   = this.gridApparentPosition.left + this.gridApparentSize;
    rightBottomCorner.dst.top    = this.gridApparentPosition.top  + this.gridApparentSize;
    rightBottomCorner.dst.width  = dstThickness;
    rightBottomCorner.dst.height = dstThickness;
    if (   this.gridApparentPosition.left + this.gridApparentSize < window.innerWidth
        && this.gridApparentPosition.top  + this.gridApparentSize < window.innerHeight) {
      this.frameCtx.drawImage(
        this.frameImage,
        rightBottomCorner.src.left, rightBottomCorner.src.top, rightBottomCorner.src.width, rightBottomCorner.src.height,
        rightBottomCorner.dst.left, rightBottomCorner.dst.top, rightBottomCorner.dst.width, rightBottomCorner.dst.height
      )
    }
  }

  setForegroundRendering() { // variables common to grid and frame
    this.gridApparentSize = this.gridSize * this.currentScale;
  }

  setGridRendering() {
    const gridRenderingPosition = {
      left: this.gridApparentPosition.left - (this.gridRenderingSize - this.gridApparentSize) / 2,
      top:  this.gridApparentPosition.top  - (this.gridRenderingSize - this.gridApparentSize) / 2
    }
    this.gridContainer.style.left = `${gridRenderingPosition.left}px`;
    this.gridContainer.style.top  = `${gridRenderingPosition.top}px`;
    this.gridContainer.style.transform = `scale(${this.currentScale / this.maxScale})`;
  }

  updateForegroundRendering() {
    this.setForegroundRendering();
    this.updateGridRendering();
    this.updateFrameRendering();
  }

  updateGridRendering() {
    this.setGridRendering();
  }

  updateFrameRendering() {
    this.setFrameRendering();
  }

  renderButtonElements() {
    this.renderButtonContainers();
    this.renderButtons();
    this.renderButtonImages();
    this.renderColorPicker();
    this.attachEventsToButtons();
    this.attachEventsToColorPicker();
  }

  renderButtonContainers() {
    this.viewModeButtonContainer  = document.createElement("div");
    this.paintModeButtonContainer = document.createElement("div");
    this.colorPickerContainer     = document.createElement("div");

    this.buttonContainers = [this.viewModeButtonContainer, this.paintModeButtonContainer, this.colorPickerContainer];
    for (const buttonContainer of this.buttonContainers) {
      document.body.appendChild(buttonContainer);
      buttonContainer.style.position = "absolute";
      buttonContainer.style.left   = "50%";
      buttonContainer.style.bottom = "0px";
      buttonContainer.style.transform = "translateX(-50%)";
      buttonContainer.style.justifyContent = "space-between";
    }
  }

  renderButtons() {
    this.paintButton   = document.createElement("button");
    this.cancelButton  = document.createElement("button");
    this.undoButton    = document.createElement("button");
    this.colorButton   = document.createElement("button");
    this.redoButton    = document.createElement("button");
    this.confirmButton = document.createElement("button");

    this.buttons = [
      this.paintButton, this.cancelButton, this.undoButton, this.colorButton, this.redoButton, this.confirmButton
    ];
    for (const button of this.buttons) {
      button.style.margin = "15px 10px";
      button.style.width  = "65px";
      button.style.height = "65px";
      button.style.border = "0";
      button.style.borderRadius = "50%";
      button.style.backgroundImage = `linear-gradient(to bottom, ${this.buttonLightColor}, ${this.buttonShadowColor})`;
      button.style.backgroundRepeat = "no-repeat";
      button.style.backgroundPosition = "center";
      button.style.boxShadow = "0px 6px 3px 0px rgba(0, 0, 0, 0.5)";
    }
    this.colorButton.style.boxShadow = "0px 6px 3px 0px rgba(0, 0, 0, 0)";

    this.viewModeButtons = [this.paintButton];
    for (const button of this.viewModeButtons) {
      this.viewModeButtonContainer.appendChild(button);
    }
    this.paintModeButtons = [this.cancelButton, this.undoButton, this.colorButton, this.redoButton, this.confirmButton];
    for (const button of this.paintModeButtons) {
      this.paintModeButtonContainer.appendChild(button);
    }
  }

  renderButtonImages() {
    this.paintButtonImage = document.createElement("img");
    this.paintButton.appendChild(this.paintButtonImage);
    this.paintButtonImage.src = "img/brush-colors-mini.png";
    this.paintButtonImage.style = "width: 35px; height: 35px";

    this.cancelButtonImage = document.createElement("img");
    this.cancelButton.appendChild(this.cancelButtonImage);
    this.cancelButtonImage.src = "img/cancel-mini.png";
    this.cancelButtonImage.style = "width: 25px; height: 21px";

    this.undoButtonImage = document.createElement("img");
    this.undoButton.appendChild(this.undoButtonImage);
    this.undoButtonImage.src = "img/undo-mini.png";
    this.undoButtonImage.style = "width: 40px; height: 34px";

    this.redoButtonImage = document.createElement("img");
    this.redoButton.appendChild(this.redoButtonImage);
    this.redoButtonImage.src = "img/redo-mini.png";
    this.redoButtonImage.style = "width: 40px; height: 34px";

    this.confirmButtonImage = document.createElement("img");
    this.confirmButton.appendChild(this.confirmButtonImage);
    this.confirmButtonImage.src = "img/confirm-mini.png";
    this.confirmButtonImage.style = "width: 25px; height: 21px";
  }

  renderColorPicker() {
    this.colorPickerInput = document.createElement("input");
    this.colorPickerContainer.appendChild(this.colorPickerInput);
    this.colorPickerInput.type = "color";
    this.colorPickerInput.id = "color-picker-input";
    this.colorPickerInput.style.position = "absolute";
    this.colorPickerInput.style.left = "0px";
    this.colorPickerInput.style.top  = "0px";
    this.colorPickerInput.style.display = "none";

    this.colorPickerButton = document.createElement("label");
    this.colorPickerContainer.appendChild(this.colorPickerButton);
    this.colorPickerButton.htmlFor = "color-picker-input";
    this.colorPickerButton.style.margin = "15px";
    this.colorPickerButton.style.right  = "0px";
    this.colorPickerButton.style.bottom = "0px";
    this.colorPickerButton.style.width  = "65px";
    this.colorPickerButton.style.height = "65px";
    this.colorPickerButton.style.borderRadius = "50%";
    this.colorPickerButton.style.backgroundImage =
      `linear-gradient(to bottom, ${this.buttonLightColor}, ${this.buttonShadowColor})`;
    this.colorPickerButton.style.backgroundRepeat = "no-repeat";
    this.colorPickerButton.style.backgroundPosition = "center";
    this.colorPickerButton.style.boxShadow = "0px 6px 3px 0px rgba(0, 0, 0, 0.5)";

    this.selectedColor = document.createElement("div");
    this.colorPickerButton.appendChild(this.selectedColor);
    this.selectedColor.style.position = "absolute";
    this.selectedColor.style.left = "50%";
    this.selectedColor.style.top = "50%";
    this.selectedColor.style.width = "40px";
    this.selectedColor.style.height = "40px";
    this.selectedColor.style.transform = "translate(-50%, -50%)";
    this.selectedColor.style.borderRadius = "50%";
    this.selectedColor.style.background = this.colorPickerInput.value;
  }

  attachEventsToWindow() {
    window.addEventListener("resize", () => {
      this.updateFrameRendering();
    });
  }

  attachEventsToForeground() {
    this.mousePosition = {x: null, y: null, i: null, j: null};
    this.mousedown = false;
    this.lastMousedownButton = null;
    this.lastMousedownInsideGrid = null;
    this.draftedTiles = new RBTree((a,b) => { return this.tileHash(a) - this.tileHash(b); });

    this.foreground.addEventListener("wheel",       (event) => { this.onWheelOverForeground(event);       });
    this.foreground.addEventListener("mousedown",   (event) => { this.onMousedownOverForeground(event);   });
    this.foreground.addEventListener("mousemove",   (event) => { this.onMousemoveOverForeground(event);   });
    this.foreground.addEventListener("mouseup",     ()      => { this.onMouseupOverForeground();          });
    this.foreground.addEventListener("contextmenu", (event) => { this.onContextMenuOverForeground(event); });
  }

  moveForeground(event) {
    this.gridApparentPosition.left += event.clientX - this.mousePosition.x;
    this.gridApparentPosition.top  += event.clientY - this.mousePosition.y;
    if (this.gridApparentPosition.left > window.innerWidth / 2) {
      this.gridApparentPosition.left = window.innerWidth / 2;
    } else if (this.gridApparentPosition.top > window.innerHeight / 2) {
      this.gridApparentPosition.top  = window.innerHeight / 2;
    } else if (this.gridApparentPosition.left < window.innerWidth / 2 - this.gridApparentSize) {
      this.gridApparentPosition.left = window.innerWidth / 2 - this.gridApparentSize;
    } else if (this.gridApparentPosition.top  < window.innerHeight / 2 - this.gridApparentSize) {
      this.gridApparentPosition.top  = window.innerHeight / 2 - this.gridApparentSize;
    }
    this.updateForegroundRendering();
  }

  onWheelOverForeground(event) {
    event.preventDefault();
    const zoomFactor = this.updateScale(
      (event.deltaY < 0) ? this.zoomAbsoluteFactor : 1 / this.zoomAbsoluteFactor
    );
    this.gridApparentPosition.left = event.clientX + zoomFactor * (this.gridApparentPosition.left - event.clientX);
    this.gridApparentPosition.top  = event.clientY + zoomFactor * (this.gridApparentPosition.top  - event.clientY);
    this.updateForegroundRendering();
  }

  onMousedownOverForeground(event) {
    this.lastMousedownButton = event.button;
    this.lastMousedownInsideGrid = this.isInsideGrid({x: event.clientX, y: event.clientY});
    if (this.lastMousedownButton === 0 || this.lastMousedownButton === 2) {
      this.mousedown = true;
      const i = Math.floor((event.clientX - this.gridApparentPosition.left) / this.currentScale);
      const j = Math.floor((event.clientY - this.gridApparentPosition.top)  / this.currentScale);
      if (this.mode === "paint" && this.lastMousedownInsideGrid) {
        this.actOnTile(i, j);
      }
      this.updateMousePosition(event, i, j);
    }
  }

  onMousemoveOverForeground(event) {
    const i = Math.floor((event.clientX - this.gridApparentPosition.left) / this.currentScale);
    const j = Math.floor((event.clientY - this.gridApparentPosition.top)  / this.currentScale);
    if (this.mousedown) {
      if (this.mode == "view" || !this.lastMousedownInsideGrid) {
        this.moveForeground(event);
      } else if (this.isInsideGrid({x: event.clientX, y: event.clientY})) {
        if (i !== this.mousePosition.i || j !== this.mousePosition.j) {
          this.actOnTile(i, j);
        }
      }
    }
    this.updateMousePosition(event, i, j);
  }

  isInsideGrid(position) {
    return position.x >= this.gridApparentPosition.left
        && position.x < this.gridApparentSize + this.gridApparentPosition.left
        && position.y >= this.gridApparentPosition.top
        && position.y < this.gridApparentSize + this.gridApparentPosition.top;
  }

  actOnTile(i, j) {
    if (this.lastMousedownButton === 0) {
      this.tryAndDraftTile(i, j);
    } else if (this.lastMousedownButton === 2) {
      this.tryAndUndraftTile(i, j);
    } else {
      console.error("Unexpected mousedown button: " + this.lastMousedownButton);
    }
  }

  updateMousePosition(event, i, j) {
    this.mousePosition.x = event.clientX;
    this.mousePosition.y = event.clientY;
    if (this.isInsideGrid(this.mousePosition)) {
      this.mousePosition.i = i;
      this.mousePosition.j = j;
    } else {
      this.mousePosition.i = null;
      this.mousePosition.j = null;
    }
  }

  onMouseupOverForeground() {
    this.mousedown = false;
  }

  onContextMenuOverForeground(event) {
    if (this.mode === "paint") {
      event.preventDefault();
    }
  }

  attachEventsToButtons() {
    this.attachStyleEventsToButtons();
    this.attachFeatureEventsToButtons();
  }

  attachEventsToColorPicker() {
    this.colorPickerInput.addEventListener("input", () => {
      this.selectedColor.style.background = this.colorPickerInput.value;
    });
  }

  attachStyleEventsToButtons() {
    this.buttons.forEach(button => {
      button.addEventListener("mousedown", () => {
        button.style.backgroundImage = `linear-gradient(to bottom, ${this.buttonShadowColor}, ${this.buttonLightColor})`;
      });
      button.addEventListener("mouseup", () => {
        button.style.backgroundImage = `linear-gradient(to bottom, ${this.buttonLightColor}, ${this.buttonShadowColor}`;
      });
      button.addEventListener("mouseleave", () => {
        button.style.backgroundImage = `linear-gradient(to bottom, ${this.buttonLightColor}, ${this.buttonShadowColor})`;
      });
    });
  }

  attachFeatureEventsToButtons() {
    this.paintButton.addEventListener("mouseup", () => { this.onMouseupOverPaintButton(); });
    this.cancelButton.addEventListener("mouseup", () => { this.onMouseupOverCancelButton(); });
    this.confirmButton.addEventListener("mouseup", () => { this.onMouseupOverConfirmButton(); });

    this.attachFeatureEventsToUndoButton();
    this.attachFeatureEventsToRedoButton();
  }

  loadBaseHourglass(callback) {
    this.baseHourglass = document.createElement("canvas");
    this.baseHourglassCtx = this.baseHourglass.getContext("2d");
    this.baseHourglassImage = new Image();
    this.baseHourglassImage.src = "img/hourglass-mini.png";

    this.hourglassWidthRatio  = this.hourglassHeightRatio * this.baseHourglassImage.width / this.baseHourglassImage.height;
    this.baseHourglass.width  = this.hourglassWidthRatio  * this.maxScale;
    this.baseHourglass.height = this.hourglassHeightRatio * this.maxScale;

    this.baseHourglassImage.onload = () => {
      this.baseHourglassCtx.drawImage(this.baseHourglassImage, 0, 0, this.baseHourglass.width, this.baseHourglass.height);
      callback();
    }
  }

  onMouseupOverPaintButton() {
    this.mode = "paint";
    this.updateModeRendering();
  }

  onMouseupOverCancelButton() {
    this.clearDraft();
    this.mode = "view";
    this.updateModeRendering();
  }

  updateModeRendering() {
    this.setModeRendering();
  }

  setModeRendering() {
    console.assert(this.mode === "view" || this.mode === "paint");
    this.viewModeButtonContainer.style.display  = (this.mode === "view") ? "flex" : "none";
    this.paintModeButtonContainer.style.display = (this.mode === "view") ? "none" : "flex";
    this.colorPickerContainer.style.display     = (this.mode === "view") ? "none" : "flex";
  }

  onMouseupOverConfirmButton() {
    if (this.draftedTiles.size !== 0) {
      const tilesToSend = [];
      const it = this.draftedTiles.iterator(); let draftedTile;
      while ((draftedTile = it.next()) !== null) {
        tilesToSend.push(draftedTile);
      }
      this.mod.sendPaintingTransaction(tilesToSend).then((ordinal) => {
        console.log("*+* Painting transaction signed and sent successfully.");
        for (tile of tilesToSend) {
          this.mod.updateTile(tile, "pending", ordinal);
        }
        this.clearDraft();
        this.mode = "view";
        this.updateModeRendering();
      });
    }
  }

  attachFeatureEventsToUndoButton() {
    this.undoStack = [];
    let undoIntervalId;
    this.undoButton.addEventListener("mousedown", () => {
      if (this.undoStack.length != 0) {
        this.undo();
        undoIntervalId = setInterval(() => {
          if (this.undoStack.length != 0) {
            this.undo();
          } else {
            clearInterval(undoIntervalId);
          }
        }, 1000 / this.actionsPerSecond);
      }
    });
    this.undoButton.addEventListener("mouseup",    () => { clearInterval(undoIntervalId); });
    this.undoButton.addEventListener("mouseleave", () => { clearInterval(undoIntervalId); });
  }

  attachFeatureEventsToRedoButton() {
    this.redoStack = [];
    let redoIntervalId;
    this.redoButton.addEventListener("mousedown", () => {
      if (this.redoStack.length != 0) {
        this.redo();
        redoIntervalId = setInterval(() => {
          if (this.redoStack.length != 0) {
            this.redo();
          } else {
            clearInterval(redoIntervalId);
          }
        }, 1000 / this.actionsPerSecond);
      }
    });
    this.redoButton.addEventListener("mouseup",    () => { clearInterval(redoIntervalId); });
    this.redoButton.addEventListener("mouseleave", () => { clearInterval(redoIntervalId); });
  }

  undo() {
    const lastAction = this.undoStack.pop();
    this.redoStack.push(lastAction);
    const reversedLastActionType = this.actionType(this.reversedAction(lastAction));
    const tile = {i: lastAction.i, j: lastAction.j};
    if (reversedLastActionType === "undraft" || reversedLastActionType === "redraft") {
      this.draftedTiles.remove(tile);
    }
    if (reversedLastActionType === "draft"   || reversedLastActionType === "redraft") {
      tile.color = lastAction.oldDraftColor;
      this.draftedTiles.insert(tile);
    } else {
      tile.color = null;
    }
    this.mod.updateTile(tile, "drafted");
  }

  redo() {
    const lastUndoneAction = this.redoStack.pop();
    this.undoStack.push(lastUndoneAction);
    const lastUndoneActionType = this.actionType(lastUndoneAction);
    const tile = {i: lastUndoneAction.i, j: lastUndoneAction.j};
    if (lastUndoneActionType === "undraft" || lastUndoneActionType === "redraft") {
      this.draftedTiles.remove(tile);
    }
    if (lastUndoneActionType === "draft"   || lastUndoneActionType === "redraft") {
      tile.color = lastUndoneAction.newDraftColor;
      this.draftedTiles.insert(tile);
    } else {
      tile.color = null;
    }
    this.mod.updateTile(tile, "drafted");
  }

  actionType(action) {
    if (action.oldDraftColor === null && action.newDraftColor !== null) {
      return "draft";
    } else if (action.oldDraftColor !== null && action.newDraftColor !== null) {
      return "redraft";
    } else if (action.oldDraftColor !== null && action.newDraftColor === null) {
      return "undraft";
    } else {
      console.error("Unexpected action: " + action);
    }
  }

  reversedAction(action) {
    return {i: action.i, j: action.j, oldDraftColor: action.newDraftColor, newDraftColor: action.oldDraftColor};
  }

  clearDraft() {
    const it = this.draftedTiles.iterator(); let draftedTile;
    while ((draftedTile = it.next()) !== null) {
      this.mod.updateTile({i: draftedTile.i, j: draftedTile.j, color: null}, "drafted");
    }
    this.draftedTiles.clear();
  }

  tryAndDraftTile(i, j) {
    const alreadyDraftedTile = this.draftedTiles.find({i: i, j: j});
    if (alreadyDraftedTile === null) {
      this.draftTile(i, j, null, this.colorPickerInput.value);
    } else {
      if (this.colorPickerInput.value !== alreadyDraftedTile.color) {
        this.draftedTiles.remove(alreadyDraftedTile);
        this.draftTile(i, j, alreadyDraftedTile.color, this.colorPickerInput.value);
      }
    }
  }

  draftTile(i, j, oldDraftColor, newDraftColor) {
    this.undoStack.push({i: i, j: j, oldDraftColor: oldDraftColor, newDraftColor: newDraftColor});
    this.redoStack = [];
    const draftTile = {i: i, j: j, color: newDraftColor};
    this.draftedTiles.insert(draftTile);
    this.mod.updateTile(draftTile, "drafted");
  }

  tryAndUndraftTile(i, j) {
    const alreadyDraftedTile = this.draftedTiles.find({i: i, j: j});
    if (alreadyDraftedTile !== null) {
      this.undraftTile(i, j, alreadyDraftedTile.color);
    }
  }

  undraftTile(i, j, oldDraftColor) {
    this.undoStack.push({i: i, j: j, oldDraftColor: oldDraftColor, newDraftColor: null});
    this.redoStack = [];
    this.draftedTiles.remove({i: i, j: j});
    this.mod.updateTile({i: i, j: j, color: null}, "drafted");
  }

  updateScale(zoomFactor) {
    const newScale = this.currentScale * zoomFactor;
    if (newScale < this.minScale) {
      zoomFactor = this.minScale / this.currentScale;
      this.currentScale = this.minScale;
    } else if (newScale > this.maxScale) {
      zoomFactor = this.maxScale / this.currentScale;
      this.currentScale = this.maxScale;
    } else {
      this.currentScale = newScale;
    }
    return zoomFactor;
  }

  updateTileRendering(i, j, updatedTileState) {
    if (updatedTileState.drafted !== null) {
      this.drawTile(i, j, updatedTileState.drafted.color);
      this.drawDraftMark(i, j, updatedTileState.drafted.color);
    } else if (updatedTileState.pending !== null) {
      this.drawTile(i, j, updatedTileState.pending.color);
      this.drawHourglass(i, j, updatedTileState.pending.color);
    } else if (updatedTileState.confirmed !== null) {
      this.drawTile(i, j, updatedTileState.confirmed.color);
    } else {
      this.drawTile(i, j, this.blankTileColor);
    }
  }

  drawTile(i, j, color) {
    this.gridCtx.fillStyle = color;
    console.log(`*+* BEGIN`);
    this.gridCtx.fillRect(i * this.maxScale, j * this.maxScale, this.maxScale, this.maxScale);
    console.log(`*+* END`);
  }

  drawDraftMark(i, j, tileColor) {
    this.gridCtx.fillStyle = this.markColor(tileColor);
    this.gridCtx.fillRect(
      (i + 0.5 - this.markSizeRatio / 2) * this.maxScale,
      (j + 0.5 - this.markSizeRatio / 2) * this.maxScale,
      this.markSizeRatio * this.maxScale,
      this.markSizeRatio * this.maxScale
    );
  }

  drawHourglass(i, j, tileColor) {
    const hourglassImageData = this.baseHourglassCtx.getImageData(0, 0, this.baseHourglass.width, this.baseHourglass.height);
    const components = this.mod.colorToComponents(tileColor);
    for (let s = 0; s < hourglassImageData.data.length; s += 4) {       
      for (k of [0, 1, 2]) {
        hourglassImageData.data[s+k] = this.mixedComponent(
          components[k], this.oppositeComponent(components[k]), hourglassImageData.data[s+3]
        );
      }
      hourglassImageData.data[s+3] = 255;
    }
    this.gridCtx.putImageData(
      hourglassImageData,
      (i + 0.5 - this.hourglassWidthRatio  / 2) * this.maxScale,
      (j + 0.5 - this.hourglassHeightRatio / 2) * this.maxScale,
    );
  }

  markColor(color) {
    const intComponents = this.mod.colorToComponents(color);
    const markIntComponents = intComponents.map(this.oppositeComponent);
    return this.mod.componentsToColor(markIntComponents);
  }

  oppositeComponent(component) {
    return (component > 127) ? 0 : 255;
  }

  mixedComponent(component1, component2, alpha2) {
    return Math.round(component1 + (alpha2 / 255) * (component2 - component1));
  }

  tileHash(tile) {
    const id = tile.i * this.gridSize + tile.j;
    return parseInt(createHash("md5").update(id.toString()).digest("hex"), 16) % (10 ** 15);
  }
}

module.exports = PlaceUI;