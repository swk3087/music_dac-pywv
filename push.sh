#!/bin/bash

read -p "커밋 메시지: " msg

git add .
git commit -m "$msg"
git push origin main -f