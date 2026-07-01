const { toNumber } = require("./dataNormalizer");

function buildForecast(series = [], horizonDays = 30) {
  const points = series
    .map((point) => ({ date: point.date, value: toNumber(point.value) }))
    .filter((point) => Number.isFinite(point.value));

  if (!points.length) {
    return {
      forecast: [],
      confidence: 0,
      model_info: { model: "moving_average", reason: "no historical points" },
    };
  }

  const window = points.slice(-Math.min(points.length, 6));
  const average = window.reduce((sum, point) => sum + point.value, 0) / window.length;
  const first = window[0]?.value || average;
  const last = window[window.length - 1]?.value || average;
  const slope = window.length > 1 ? (last - first) / (window.length - 1) : 0;
  const days = Math.min(Math.max(Number(horizonDays) || 30, 7), 180);
  const steps = Math.min(Math.ceil(days / 7), 12);
  const start = new Date();

  const forecast = Array.from({ length: steps }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + (index + 1) * 7);
    return {
      date: date.toISOString().slice(0, 10),
      value: Math.max(0, Math.round(average + slope * (index + 1))),
    };
  });

  const volatility = window.reduce((sum, point) => sum + Math.abs(point.value - average), 0) / Math.max(window.length, 1);
  const confidence = Math.max(35, Math.min(92, Math.round(90 - (volatility / Math.max(average, 1)) * 100)));

  return {
    forecast,
    confidence,
    model_info: {
      model: "moving_average_with_trend",
      points_used: window.length,
      horizon_days: days,
      generated_at: new Date().toISOString(),
    },
  };
}

function predictFromMetrics(metrics = {}, predictionConfigs = []) {
  return predictionConfigs.map((config) => {
    const metric = config.metric;
    const current = toNumber(metrics[metric]);
    const series = [
      { date: "baseline", value: current * 0.9 },
      { date: "current", value: current },
    ];
    const result = buildForecast(series, config.horizon_days || 30);
    return {
      metric,
      forecast_data: result.forecast,
      confidence: result.confidence,
      horizon_days: config.horizon_days || 30,
      model_info: result.model_info,
    };
  });
}

module.exports = { buildForecast, predictFromMetrics };
