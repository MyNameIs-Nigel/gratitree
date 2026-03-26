# Deploy GratiTree to AWS EC2 (Terraform)

Provisions an Ubuntu 22.04 instance, installs Apache, clones this repository, and serves `frontend/` from `/var/www/html`.

## Prerequisites

- [Terraform](https://www.terraform.io/) >= 1.0
- AWS credentials configured (`aws configure` or environment variables)
- (Optional) An EC2 Key Pair for SSH

## Usage

```bash
cd deploy
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set key_name if you need SSH

terraform init
terraform plan
terraform apply
```

Open the `http_url` output in a browser (HTTP port 80).

## Manual bootstrap script

To run the same steps on an existing Ubuntu host (or to test without Terraform), use [`setup.sh`](./setup.sh):

```bash
sudo GRATITREE_REPO_URL=https://github.com/MyNameIs-Nigel/gratitree.git \
  GRATITREE_REPO_BRANCH=terraform \
  bash setup.sh
```

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GRATITREE_REPO_URL` | GitHub URL | Repository to clone |
| `GRATITREE_REPO_BRANCH` | `terraform` | Branch to check out (`git clone --branch`) |
| `GRATITREE_CLONE_DIR` | `/tmp/gratitree` | Clone path |
| `GRATITREE_WEB_ROOT` | `/var/www/html` | Apache document root |

Terraform variable `repo_branch` (default `terraform`) sets `GRATITREE_REPO_BRANCH` in EC2 user-data.

## Security note

The default security group allows SSH and HTTP from `0.0.0.0/0`. Restrict SSH to your IP in production.
