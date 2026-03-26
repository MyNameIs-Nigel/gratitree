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
  # Prepend repo URL so setup.sh matches var.repo_url; strip duplicate shebang from file.
  user_data = <<-EOT
#!/bin/bash
export GRATITREE_REPO_URL="${var.repo_url}"
${trimspace(regexreplace(file("${path.module}/setup.sh"), "^#!.*\n", ""))}
EOT
  user_data_replace_on_change = true

  key_name = var.key_name != "" ? var.key_name : null

  tags = {
    Name = "gratitree-static"
  }
}
