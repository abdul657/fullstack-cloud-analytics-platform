terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

variable "aws_region" {
  description = "AWS region for the metrics export bucket."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name for dashboard metrics exports."
  type        = string
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "metrics_exports" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "metrics_exports" {
  bucket                  = aws_s3_bucket.metrics_exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "metrics_exports" {
  bucket = aws_s3_bucket.metrics_exports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "metrics_exports" {
  bucket = aws_s3_bucket.metrics_exports.id
  versioning_configuration {
    status = "Enabled"
  }
}

output "metrics_bucket_name" {
  description = "Configure this value as AWS_S3_BUCKET for the API."
  value       = aws_s3_bucket.metrics_exports.bucket
}
