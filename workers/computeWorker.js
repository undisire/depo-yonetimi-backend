const { parentPort } = require('worker_threads');

// CPU yoğun işlemleri gerçekleştir
const computeTask = async (data) => {
  const { type, payload } = data;

  switch (type) {
    case 'calculate':
      return await performCalculation(payload);
    case 'analyze':
      return await analyzeData(payload);
    case 'optimize':
      return await optimizeData(payload);
    default:
      throw new Error(`Unknown compute task type: ${type}`);
  }
};

// Hesaplama yap
const performCalculation = async (data) => {
  const { operation, values } = data;

  switch (operation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
    case 'standardDeviation': {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const squareDiffs = values.map(value => Math.pow(value - avg, 2));
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
      return Math.sqrt(avgSquareDiff);
    }
    default:
      throw new Error(`Unknown calculation operation: ${operation}`);
  }
};

// Veri analizi yap
const analyzeData = async (data) => {
  const { dataset, metrics } = data;
  const results = {};

  for (const metric of metrics) {
    switch (metric) {
      case 'distribution':
        results.distribution = calculateDistribution(dataset);
        break;
      case 'correlation':
        results.correlation = calculateCorrelation(dataset);
        break;
      case 'trends':
        results.trends = analyzeTrends(dataset);
        break;
      case 'outliers':
        results.outliers = detectOutliers(dataset);
        break;
      default:
        throw new Error(`Unknown analysis metric: ${metric}`);
    }
  }

  return results;
};

// Dağılım hesapla
const calculateDistribution = (dataset) => {
  const distribution = {};
  for (const item of dataset) {
    distribution[item] = (distribution[item] || 0) + 1;
  }
  return distribution;
};

// Korelasyon hesapla
const calculateCorrelation = (dataset) => {
  if (!Array.isArray(dataset) || dataset.length === 0 || !Array.isArray(dataset[0])) {
    throw new Error('Invalid dataset for correlation calculation');
  }

  const n = dataset.length;
  const vars = dataset[0].length;
  const correlationMatrix = Array(vars).fill().map(() => Array(vars).fill(0));

  for (let i = 0; i < vars; i++) {
    for (let j = i; j < vars; j++) {
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

      for (let k = 0; k < n; k++) {
        const x = dataset[k][i];
        const y = dataset[k][j];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
      }

      const correlation = 
        (n * sumXY - sumX * sumY) /
        Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

      correlationMatrix[i][j] = correlation;
      correlationMatrix[j][i] = correlation;
    }
  }

  return correlationMatrix;
};

// Trendleri analiz et
const analyzeTrends = (dataset) => {
  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw new Error('Invalid dataset for trend analysis');
  }

  const trends = {
    increasing: [],
    decreasing: [],
    stable: []
  };

  for (let i = 1; i < dataset.length; i++) {
    const diff = dataset[i] - dataset[i - 1];
    if (diff > 0) {
      trends.increasing.push({ index: i, value: diff });
    } else if (diff < 0) {
      trends.decreasing.push({ index: i, value: diff });
    } else {
      trends.stable.push({ index: i, value: 0 });
    }
  }

  return trends;
};

// Aykırı değerleri tespit et
const detectOutliers = (dataset) => {
  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw new Error('Invalid dataset for outlier detection');
  }

  const sorted = [...dataset].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return dataset.reduce((outliers, value, index) => {
    if (value < lowerBound || value > upperBound) {
      outliers.push({ index, value });
    }
    return outliers;
  }, []);
};

// Veri optimizasyonu yap
const optimizeData = async (data) => {
  const { dataset, options } = data;
  const results = {
    original: {
      size: getDataSize(dataset),
      complexity: calculateComplexity(dataset)
    }
  };

  // Veri optimizasyonu
  const optimized = await performOptimization(dataset, options);

  results.optimized = {
    data: optimized,
    size: getDataSize(optimized),
    complexity: calculateComplexity(optimized)
  };

  return results;
};

// Veri boyutunu hesapla
const getDataSize = (data) => {
  return Buffer.from(JSON.stringify(data)).length;
};

// Karmaşıklık hesapla
const calculateComplexity = (data) => {
  if (typeof data !== 'object' || data === null) {
    return 1;
  }

  let complexity = 1;
  for (const key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      complexity += calculateComplexity(data[key]);
    } else {
      complexity += 1;
    }
  }

  return complexity;
};

// Veri optimizasyonu yap
const performOptimization = async (dataset, options) => {
  const { method, parameters } = options;
  let optimized = [...dataset];

  switch (method) {
    case 'compression':
      optimized = compressData(optimized, parameters);
      break;
    case 'sampling':
      optimized = sampleData(optimized, parameters);
      break;
    case 'aggregation':
      optimized = aggregateData(optimized, parameters);
      break;
    default:
      throw new Error(`Unknown optimization method: ${method}`);
  }

  return optimized;
};

// Ana mesaj dinleyicisi
parentPort.on('message', async (data) => {
  try {
    const result = await computeTask(data);
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
