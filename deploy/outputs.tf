output "public_ip" {
  description = "Public IPv4 address of the GratiTree EC2 instance"
  value       = aws_instance.gratitree.public_ip
}

output "public_dns" {
  description = "Public DNS name of the instance"
  value       = aws_instance.gratitree.public_dns
}

output "http_url" {
  description = "Base URL for the static site"
  value       = "http://${aws_instance.gratitree.public_ip}"
}
