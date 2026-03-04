import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    headline: {
      type: String,
      required: true,
      index: true,
    },
    summary: {
      type: String,
      default: "",
    },
    source_name: {
      type: String,
      required: true,
    },
    source_url: {
      type: String,
      required: true,
      unique: true,
    },
    published_at: {
      type: Date,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["NIFTY50", "BANKNIFTY", "FII_DII", "RBI", "GLOBAL", "EARNINGS", "GEOPOLITICAL", "OTHER"],
      default: "OTHER",
    },
    sentiment_score: {
      type: Number,
      required: true,
      min: -1.0,
      max: 1.0,
    },
    sentiment_label: {
      type: String,
      enum: ["bullish", "neutral", "bearish"],
      required: true,
    },
    sentiment_confidence: {
      type: Number,
      default: 0.5,
      min: 0.0,
      max: 1.0,
    },
    impact_level: {
      type: String,
      enum: ["high", "medium", "low"],
      required: true,
    },
    fetched_at: {
      type: Date,
      default: Date.now,
    },
    date_key: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

newsSchema.index({ sentiment_score: -1 });
newsSchema.index({ date_key: 1, published_at: -1 });

const News = mongoose.model("News", newsSchema);

export default News;
