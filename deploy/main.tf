terraform {
  required_version = ">= 1.0"

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

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "gratitree_web" {
  name        = "gratitree-web-${var.aws_region}"
  description = "HTTP and SSH for GratiTree static demo"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "gratitree-web"
  }
}

resource "aws_instance" "gratitree" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.gratitree_web.id]
  user_data = <<-EOT
#!/bin/bash
export GRATITREE_REPO_URL="${var.repo_url}"
export GRATITREE_REPO_BRANCH="${var.repo_branch}"
${trimspace(regexreplace(file("${path.module}/setup.sh"), "^#!.*\n", ""))}
EOT
  user_data_replace_on_change = true

  key_name = var.key_name != "" ? var.key_name : null

  tags = {
    Name = "gratitree-static"
  }
}

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
