#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Update package list and install dependencies
apt-get update && apt-get install -y libnspr4 libnss3 libgbm1

# Install npm dependencies
npm install
