#!/bin/bash

mkdir -p test-resources/external-docs
mkdir -p test-resources/target-app

# Create a sample external reference file
cat << 'EOF' > test-resources/external-docs/external-config.json
{
  "externalServiceUrl": "https://api.github.com/zen",
  "timeout": 30,
  "retries": 3
}
EOF

# Create a mock target source file
cat << 'EOF' > test-resources/target-app/ApiClient.php
<?php

namespace App\Services;

class ApiClient {
    // TODO: Implement external resource loader here
}
EOF
