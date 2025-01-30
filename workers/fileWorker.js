const { parentPort } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// Dosya işleme görevini gerçekleştir
const fileTask = async (data) => {
  const { type, payload } = data;

  switch (type) {
    case 'process':
      return await processFile(payload);
    case 'convert':
      return await convertFile(payload);
    case 'compress':
      return await compressFile(payload);
    default:
      throw new Error(`Unknown file task type: ${type}`);
  }
};

// Dosya işle
const processFile = async (data) => {
  const { filePath, operations } = data;
  let processedFile = await fs.readFile(filePath);

  for (const operation of operations) {
    switch (operation.type) {
      case 'resize':
        processedFile = await resizeImage(processedFile, operation.options);
        break;
      case 'rotate':
        processedFile = await rotateImage(processedFile, operation.options);
        break;
      case 'watermark':
        processedFile = await addWatermark(processedFile, operation.options);
        break;
      case 'filter':
        processedFile = await applyFilter(processedFile, operation.options);
        break;
      default:
        throw new Error(`Unknown file operation: ${operation.type}`);
    }
  }

  const outputPath = path.join(
    path.dirname(filePath),
    `processed_${path.basename(filePath)}`
  );

  await fs.writeFile(outputPath, processedFile);
  return { outputPath };
};

// Resim boyutlandır
const resizeImage = async (buffer, options) => {
  const { width, height, fit = 'cover' } = options;

  return await sharp(buffer)
    .resize(width, height, { fit })
    .toBuffer();
};

// Resim döndür
const rotateImage = async (buffer, options) => {
  const { angle = 0 } = options;

  return await sharp(buffer)
    .rotate(angle)
    .toBuffer();
};

// Filigran ekle
const addWatermark = async (buffer, options) => {
  const { text, font = 'Arial', fontSize = 48, color = 'rgba(255, 255, 255, 0.5)' } = options;

  const svg = `
    <svg width="500" height="100">
      <style>
        .title { fill: ${color}; font-size: ${fontSize}px; font-family: ${font}; }
      </style>
      <text x="50%" y="50%" text-anchor="middle" class="title">${text}</text>
    </svg>
  `;

  return await sharp(buffer)
    .composite([{
      input: Buffer.from(svg),
      gravity: 'center'
    }])
    .toBuffer();
};

// Filtre uygula
const applyFilter = async (buffer, options) => {
  const { type } = options;

  const image = sharp(buffer);

  switch (type) {
    case 'grayscale':
      return await image.grayscale().toBuffer();
    case 'sepia':
      return await image
        .modulate({ brightness: 1, saturation: 0.5, hue: 20 })
        .toBuffer();
    case 'blur':
      return await image.blur(3).toBuffer();
    case 'sharpen':
      return await image.sharpen().toBuffer();
    default:
      throw new Error(`Unknown filter type: ${type}`);
  }
};

// Dosya dönüştür
const convertFile = async (data) => {
  const { inputPath, outputFormat } = data;
  const outputPath = path.join(
    path.dirname(inputPath),
    `${path.parse(inputPath).name}.${outputFormat}`
  );

  const inputBuffer = await fs.readFile(inputPath);
  let outputBuffer;

  switch (outputFormat.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      outputBuffer = await sharp(inputBuffer)
        .jpeg({ quality: 80 })
        .toBuffer();
      break;
    case 'png':
      outputBuffer = await sharp(inputBuffer)
        .png({ compressionLevel: 9 })
        .toBuffer();
      break;
    case 'webp':
      outputBuffer = await sharp(inputBuffer)
        .webp({ quality: 80 })
        .toBuffer();
      break;
    case 'avif':
      outputBuffer = await sharp(inputBuffer)
        .avif({ quality: 80 })
        .toBuffer();
      break;
    default:
      throw new Error(`Unsupported output format: ${outputFormat}`);
  }

  await fs.writeFile(outputPath, outputBuffer);
  return { outputPath };
};

// Dosya sıkıştır
const compressFile = async (data) => {
  const { inputPath, options } = data;
  const outputPath = path.join(
    path.dirname(inputPath),
    `compressed_${path.basename(inputPath)}`
  );

  const inputBuffer = await fs.readFile(inputPath);
  let outputBuffer;

  const ext = path.extname(inputPath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      outputBuffer = await sharp(inputBuffer)
        .jpeg({ quality: options.quality || 80 })
        .toBuffer();
      break;
    case '.png':
      outputBuffer = await sharp(inputBuffer)
        .png({ compressionLevel: options.compressionLevel || 9 })
        .toBuffer();
      break;
    case '.webp':
      outputBuffer = await sharp(inputBuffer)
        .webp({ quality: options.quality || 80 })
        .toBuffer();
      break;
    case '.avif':
      outputBuffer = await sharp(inputBuffer)
        .avif({ quality: options.quality || 80 })
        .toBuffer();
      break;
    default:
      throw new Error(`Unsupported file format for compression: ${ext}`);
  }

  await fs.writeFile(outputPath, outputBuffer);
  
  const inputStats = await fs.stat(inputPath);
  const outputStats = await fs.stat(outputPath);
  
  return {
    outputPath,
    compressionRatio: outputStats.size / inputStats.size,
    originalSize: inputStats.size,
    compressedSize: outputStats.size
  };
};

// Ana mesaj dinleyicisi
parentPort.on('message', async (data) => {
  try {
    const result = await fileTask(data);
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
