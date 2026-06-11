# Roster App

A containerized full-stack roster management application deployed on AWS using Docker, Amazon ECR, Amazon EC2, and GitHub Actions.

---

# Architecture

```text
Developer
    │
    ▼
GitHub Repository
    │
    ▼
GitHub Actions Runner
    │
    ├── Build Backend Image
    ├── Build Frontend Image
    └── Build Admin Image
    │
    ▼
Amazon ECR
    │
    ├── roster-backend
    ├── roster-frontend
    └── roster-admin
    │
    ▼
AWS EC2 Instance
    │
    ▼
Docker Compose
    │
    ├── Backend Container
    ├── Frontend Container
    └── Admin Container
```

---

# Tech Stack

## Frontend

* React
* Vite
* Nginx
* Docker

## Admin Panel

* React
* Vite
* Nginx
* Docker

## Backend

* Node.js
* Express
* Docker

## DevOps & Cloud

* AWS EC2
* Amazon ECR
* GitHub Actions
* Docker Compose
* IAM Roles

---

# AWS Infrastructure

## EC2

Amazon Linux 2023 instance hosting all application containers using Docker Compose.

## Amazon ECR

Private container registry used for storing Docker images.

Repositories:

```text
530558031194.dkr.ecr.ap-south-1.amazonaws.com/roster-backend
530558031194.dkr.ecr.ap-south-1.amazonaws.com/roster-frontend
530558031194.dkr.ecr.ap-south-1.amazonaws.com/roster-admin
```

## IAM Role

An IAM Role is attached to the EC2 instance to allow secure authentication with Amazon ECR.

Permissions include:

* Pull container images from ECR
* Authenticate with AWS services

No AWS credentials are stored on the EC2 instance.

---

# CI/CD Pipeline

The application uses GitHub Actions for Continuous Integration.

## Workflow

```text
Push to main
      │
      ▼
GitHub Actions Runner
      │
      ▼
Build Docker Images
      │
      ▼
Push Images to Amazon ECR
      │
      ▼
EC2 Pulls Latest Images
      │
      ▼
Docker Compose Restarts Services
```

## Pipeline Steps

### 1. Checkout Source Code

```yaml
uses: actions/checkout@v4
```

### 2. Configure AWS Credentials

```yaml
uses: aws-actions/configure-aws-credentials@v4
```

### 3. Login to Amazon ECR

```yaml
uses: aws-actions/amazon-ecr-login@v2
```

### 4. Build Docker Images

* Backend
* Frontend
* Admin

### 5. Push Images to ECR

Latest images are pushed to:

```text
roster-backend:latest
roster-frontend:latest
roster-admin:latest
```

---

# Project Structure

```text
roster-app/
│
├── backend/
│   ├── Dockerfile
│   └── ...
│
├── frontend/
│   ├── Dockerfile
│   └── ...
│
├── admin/
│   ├── Dockerfile
│   └── ...
│
├── docker-compose.yml
│
└── .github/
    └── workflows/
        └── deploy.yml
```

---

# Environment Variables

## Backend

Runtime variables are loaded through:

```text
backend.env
```

and injected into the container via Docker Compose.

## Frontend & Admin

Build-time variables are provided using GitHub Secrets.

Example:

```text
VITE_API_URL
```

This value is injected during the Docker build process.

---

# GitHub Secrets

The following repository secrets are configured:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
VITE_API_URL
```

---

# Deployment

## Build & Push Images

Triggered automatically on:

```text
Push to main branch
```

## Deploy Latest Images

Connect to EC2:

```bash
ssh -i secure.pem ec2-user@<EC2_PUBLIC_IP>
```

Pull latest images:

```bash
docker compose pull
```

Restart containers:

```bash
docker compose up -d --remove-orphans
```

---

# Docker Services

## Backend

```text
Container Port: 3000
Host Port: 3000
```

## Frontend

```text
Container Port: 80
Host Port: 5174
```

## Admin

```text
Container Port: 80
Host Port: 5173
```

---

# Security Group Rules

| Port | Purpose     |
| ---- | ----------- |
| 22   | SSH         |
| 3000 | Backend API |
| 5173 | Admin Panel |
| 5174 | Frontend    |

---

# Useful Commands

## View Running Containers

```bash
docker ps
```

## View Container Logs

```bash
docker logs roster-backend
docker logs roster-frontend
docker logs roster-admin
```

## Pull Latest Images

```bash
docker compose pull
```

## Restart Services

```bash
docker compose up -d --remove-orphans
```

## Stop Services

```bash
docker compose down
```

---

# Current CI/CD Status

## Automated

* Build Docker images
* Push Docker images to Amazon ECR
* Manage build-time environment variables
* Authenticate with AWS

## Manual

* Pull latest images on EC2
* Restart Docker Compose services

Current setup:

```text
CI  ✅ Automated
CD  ⚠️ Manual
```

---

# Future Improvements

* Fully automated deployment to EC2
* Nginx reverse proxy
* Custom domain configuration
* HTTPS using Let's Encrypt
* AWS Systems Manager Parameter Store
* AWS Secrets Manager
* CloudWatch monitoring
* Terraform Infrastructure as Code
* Image versioning and rollback strategy

---

# Author

**Shivam Kalra**

Containerized deployment pipeline using AWS EC2, Amazon ECR, Docker, Docker Compose, IAM Roles, and GitHub Actions.
