#!/bin/bash

# Copy the image_wasm.wasm file to the public/image_wasm directory
mkdir -p node_modules/image_wasm/
cp image_wasm/pkg/* node_modules/image_wasm/.