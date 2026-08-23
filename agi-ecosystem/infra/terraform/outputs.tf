output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "event_store_endpoint" {
  description = "RDS event store endpoint"
  value       = aws_db_instance.event_store.endpoint
}

output "kafka_brokers" {
  description = "MSK Kafka broker endpoints"
  value       = aws_msk_cluster.event_streaming.bootstrap_brokers
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.swarm_cache.cache_nodes[0].address
}
