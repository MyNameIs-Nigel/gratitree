#!/bin/bash
# Bootstrap GratiTree static frontend on Ubuntu (Apache).
# Run as root (e.g. EC2 user-data). Installs Apache, clones the repo, copies frontend/ to the web root.

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

REPO_URL="${GRATITREE_REPO_URL:-https://github.com/MyNameIs-Nigel/gratitree.git}"
CLONE_DIR="${GRATITREE_CLONE_DIR:-/tmp/gratitree}"
WEB_ROOT="${GRATITREE_WEB_ROOT:-/var/www/html}"

apt-get update -y
apt-get install -y apache2 git

rm -rf "${CLONE_DIR}"
git clone --depth 1 "${REPO_URL}" "${CLONE_DIR}"

rm -rf "${WEB_ROOT:?}"/*
cp -a "${CLONE_DIR}/frontend/." "${WEB_ROOT}/"

chown -R www-data:www-data "${WEB_ROOT}"

a2enmod rewrite

cat > /etc/apache2/conf-available/gratitree-static.conf << 'APACHE_CONF'
# GratiTree static site — custom 404 and allow .htaccess overrides
ErrorDocument 404 /404.html

<Directory /var/www/html>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
APACHE_CONF

a2enconf gratitree-static

systemctl enable apache2
systemctl restart apache2

echo "GratiTree static site deployed to ${WEB_ROOT}"
