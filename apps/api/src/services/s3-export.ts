import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../config.js";
import type { DashboardMetrics } from "./metrics.js";

const s3 = new S3Client({ region: config.awsRegion });

export async function exportMetricsToS3(metrics: DashboardMetrics): Promise<string> {
  if (!config.awsS3Bucket) throw new Error("AWS_S3_BUCKET is not configured");
  const date = new Date();
  const key = `metrics/metrics-${date.toISOString().replace(/[:.]/g, "-")}.json`;
  await s3.send(new PutObjectCommand({
    Bucket: config.awsS3Bucket,
    Key: key,
    Body: JSON.stringify({ generatedAt: date.toISOString(), metrics }, null, 2),
    ContentType: "application/json"
  }));
  return key;
}
