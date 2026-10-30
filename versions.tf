terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region in which to deploy the ingestion pipeline."
  type        = string
  default     = "eu-north-1"
}

variable "openai_api_key" {
  description = "API key used by the ingestion Lambda to create embeddings."
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "URL of the Supabase project that stores document chunks."
  type        = string
}

variable "supabase_service_role_key" {
  description = "Supabase service-role key used by the ingestion Lambda."
  type        = string
  sensitive   = true
}
