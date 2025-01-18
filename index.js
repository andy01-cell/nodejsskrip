const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

const threshold = 180;

// Endpoint untuk penghapusan background
app.post("/nodebg", upload.single("image"), async (req, res) => {
  const inputFilePath = req.file.path;
  const outputFileName = `output-bg-${Date.now()}.png`;
  const outputFilePath = path.join(__dirname, "outputbg", outputFileName);

  try {
    const inputImage = await loadImage(inputFilePath);
    const outputImage = removeBackground(inputImage);

    const out = fs.createWriteStream(outputFilePath);
    const stream = outputImage.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => {
      res.download(outputFilePath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).send("Error sending file");
        }
        fs.unlinkSync(inputFilePath);
      });
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).send("Error processing image");
  }
});

// Endpoint untuk penghapusan noise
app.post("/nodenoise", upload.single("image"), async (req, res) => {
  const inputFilePath = req.file.path;
  const outputFileName = `output-noise-${Date.now()}.png`;
  const outputFilePath = path.join(__dirname, "outputbg", outputFileName);

  try {
    const inputImage = await loadImage(inputFilePath);
    const outputImage = removeNoise(inputImage);

    const out = fs.createWriteStream(outputFilePath);
    const stream = outputImage.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => {
      res.download(outputFilePath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).send("Error sending file");
        }
        fs.unlinkSync(inputFilePath);
      });
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).send("Error processing image");
  }
});

function removeBackground(img) {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const index = (y * img.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      if (r > threshold && g > threshold && b > threshold && a > threshold) {
        data[index + 3] = 0; // Set alpha channel to 0 (transparent)
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function removeNoise(img) {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  const kernelSize = 3;
  const halfKernelSize = Math.floor(kernelSize / 2);

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let totalR = 0,
        totalG = 0,
        totalB = 0;

      for (let ky = -halfKernelSize; ky <= halfKernelSize; ky++) {
        for (let kx = -halfKernelSize; kx <= halfKernelSize; kx++) {
          const nx = x + kx;
          const ny = y + ky;

          if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
            const index = (ny * img.width + nx) * 4;
            totalR += data[index];
            totalG += data[index + 1];
            totalB += data[index + 2];
          }
        }
      }

      const avgR = totalR / (kernelSize * kernelSize);
      const avgG = totalG / (kernelSize * kernelSize);
      const avgB = totalB / (kernelSize * kernelSize);

      const index = (y * img.width + x) * 4;
      data[index] = avgR;
      data[index + 1] = avgG;
      data[index + 2] = avgB;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
