terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "agi-ecosystem"
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    control_plane = {
      name           = "control-plane"
      instance_types = ["t3.medium"]
      min_size       = 3
      max_size       = 10
      desired_size   = 3
    }
    execution = {
      name           = "execution"
      instance_types = ["t3.large"]
      min_size       = 5
      max_size       = 50
      desired_size   = 5
    }
    storage = {
      name           = "storage"
      instance_types = ["t3.xlarge"]
      min_size       = 1
      max_size       = 3
      desired_size   = 1
    }
  }
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "agi-ecosystem"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
}

# RDS (Postgres Event Store)
resource "aws_db_instance" "event_store" {
  identifier           = "agi-event-store"
  engine              = "postgres"
  engine_version        = "16.1"
  instance_class        = "db.r6g.xlarge"
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"

  db_name  = "agi_events"
  username = "agi_admin"
  password = var.db_password

  multi_az               = true
  backup_retention_period = 7
  deletion_protection     = true

  vpc_security_group_ids = [aws_security_group.postgres.id]
  db_subnet_group_name   = aws_db_subnet_group.agi.name

  tags = {
    Name = "agi-event-store"
  }
}

# ElastiCache (Redis for Swarm)
resource "aws_elasticache_cluster" "swarm_cache" {
  cluster_id           = "agi-swarm-cache"
  engine              = "redis"
  node_type           = "cache.r6g.large"
  num_cache_nodes     = 2
  parameter_group_name = "default.redis7"
  port                = 6379

  security_group_ids = [aws_security_group.redis.id]
}

# MSK (Kafka)
resource "aws_msk_cluster" "event_streaming" {
  cluster_name           = "agi-event-streaming"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = module.vpc.private_subnets
    security_groups = [aws_security_group.kafka.id]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }
}

# Security Groups
resource "aws_security_group" "postgres" {
  name_prefix = "agi-postgres-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "agi-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}

resource "aws_security_group" "kafka" {
  name_prefix = "agi-kafka-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}
