variable "aws_region" {
  description = "AWS region for the EC2 instance"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type (e.g. t2.micro for free tier)"
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "Optional name of an existing EC2 Key Pair for SSH access"
  type        = string
  default     = ""
}

variable "repo_url" {
  description = "Public git URL to clone (must contain frontend/)"
  type        = string
  default     = "https://github.com/MyNameIs-Nigel/gratitree.git"
}

variable "repo_branch" {
  description = "Git branch to clone (shallow clone)"
  type        = string
  default     = "terraform"
}
