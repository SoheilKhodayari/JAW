// inter-procedural data-flow test

var img, height, width, canvas, context;

function rgb2grayscale(r,g,b) {
    var gray = Math.floor(r * 0.21 + g * 0.71 + b * 0.07);
    return [gray,gray,gray];
}
  
function imgOnClick() {
    context.drawImage(img, 10, 10, width, height);
}

function canvasOnClick() {
	var imgData = context.getImageData(10,10,width, height);
    for (var index = 0; index < imgData.data.length; index += 4) {
        var pixel = rgb2grayscale(imgData.data[index],
                                  imgData.data[index+1],
                                  imgData.data[index+2]);
        imgData.data[index] = pixel[0];
        imgData.data[index+1] = pixel[1];
        imgData.data[index+2] = pixel[2];
    }
    context.putImageData(imgData, 10, 10);
}

function getSourceHeight() {
    height = window.getComputedStyle(img).getPropertyValue('height');
    height = height.slice(0, height.indexOf('px'));
    height = parseInt(height);
}
    
function getSourceWidth() {
    width = window.getComputedStyle(img).getPropertyValue('width');
    width = width.slice(0, width.indexOf('px'));
    width = parseInt(width);
}

function setCanvasSize() {
    canvas.width = width + 20;
    canvas.height = height + 20;
}

function initializeCanvas() {
	canvas = document.querySelector('canvas');
    setCanvasSize();
    context = canvas.getContext('2d');
    context.drawImage(img, 10, 10, width, height);
	canvas.addEventListener('click', canvasOnClick);
}

function initializeSource() {
	img=document.querySelector('#srcImg');
	img.addEventListener('click', imgOnClick);
}

initializeSource();
getSourceHeight();
getSourceWidth();
initializeCanvas();