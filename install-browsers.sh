#!/bin/bash

echo "Installing Playwright browsers for Vercel deployment..."

# Install only Chromium browser for smaller bundle size
npx playwright install chromium

echo "Playwright browsers installed successfully!"
