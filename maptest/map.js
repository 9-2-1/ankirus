const canvas = document.getElementById("mapcanvas");
const ctx = canvas.getContext("2d");
const imgdata = ctx.createImageData(512, 512);
function paint(x, y, i) {
  const index = (x + y * 512) * 4;
  const c = (Math.floor(i / 20001) % 5) * 63;
  // ctx.lineTo(x, y);
  // ctx.fillText(String(i), x, y);

  imgdata.data[index] = c;
  imgdata.data[index + 1] = c;
  imgdata.data[index + 2] = c;
  imgdata.data[index + 3] = 255;
}
const rp = [
  [0, 0, true, 1],
  [0, 1, false, 0],
  [1, 1, false, 0],
  [1, 0, true, 3],
];
function itermap(x, y, a, flip, rotate, i) {
  if (a < 1) {
    paint(x, y, i);
  } else {
    for (let j = 0; j < 4; j++) {
      const c = ((flip ? 3 - j : j) + rotate) % 4;
      const xv = rp[c][0],
        yv = rp[c][1],
        fv = rp[j][2], // j, not c
        rv = rp[j][3];
      itermap(
        x + xv * a,
        y + yv * a,
        a / 2,
        flip != fv,
        (rotate + (flip ? 4 - rv : rv)) % 4,
        i + j * a * a,
      );
    }
  }
}
function drawmap(i) {
  const testmap = [2, 5, 7, 8, 14];
  for (let i = 0; i < imgdata.data.length; i += 4) {
    imgdata.data[i] = 0;
    imgdata.data[i + 1] = 0;
    imgdata.data[i + 2] = 0;
    imgdata.data[i + 3] = 255;
  }
  ctx.clearRect(0, 0, 512, 512);
  // ctx.strokeStyle = "blue";
  // ctx.fillStyle = "blue";
  // ctx.lineWidth = 1;
  // ctx.beginPath();
  // ctx.moveTo(0, 0);
  itermap(0, 0, 256, i >= 4, i % 4, 0);
  ctx.putImageData(imgdata, 0, 0);
  // ctx.stroke();
}
const buttons = document.getElementById("drawmap").children;
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", () => {
    drawmap(i);
  });
}
