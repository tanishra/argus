#!/usr/bin/env bash
set -euo pipefail

# ===========================================================
# ARGUS — Deploy Backend on EC2
# ===========================================================
# Prerequisites:
#   - AWS CLI installed and configured
#   - EC2 key pair exists (~/.ssh/id_rsa or specify --key-name)
# ===========================================================

REGION="${AWS_REGION:-us-east-1}"
INSTANCE_TYPE="t2.micro"
KEY_NAME="${1:-id_rsa}"
STACK_NAME="argus-backend"

echo "=== Deploying ARGUS backend to EC2 ($REGION) ==="

# 1. Create security group
SG_ID=$(aws ec2 describe-security-groups \
  --group-names "${STACK_NAME}-sg" \
  --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || true)

if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
  echo "Creating security group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name "${STACK_NAME}-sg" \
    --description "ARGUS backend: SSH + HTTP + HTTPS" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text)

  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 22 --cidr 0.0.0.0/0 \
    --region "$REGION"

  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 80 --cidr 0.0.0.0/0 \
    --region "$REGION"

  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp --port 443 --cidr 0.0.0.0/0 \
    --region "$REGION"

  echo "Security group: $SG_ID"
else
  echo "Using existing security group: $SG_ID"
fi

# 2. Find latest Ubuntu 22.04 LTS AMI
echo "Finding latest Ubuntu 22.04 AMI..."
AMI_ID=$(aws ssm get-parameters \
  --names /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
  --region "$REGION" \
  --query 'Parameters[0].Value' \
  --output text)
echo "AMI: $AMI_ID"

# 3. Get or create key pair
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
  echo "Key pair '$KEY_NAME' not found. Creating..."
  aws ec2 create-key-pair --key-name "$KEY_NAME" --region "$REGION" \
    --query 'KeyMaterial' --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "Saved to ${KEY_NAME}.pem"
fi

# 4. Launch EC2 instance with cloud-init
CLOUD_INIT_PATH="$(cd "$(dirname "$0")/.." && pwd)/ec2/cloud-init.yaml"

echo "Launching EC2 instance (${INSTANCE_TYPE})..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --user-data "$(cat "$CLOUD_INIT_PATH")" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${STACK_NAME}}]" \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instance launched: $INSTANCE_ID"
echo "Waiting for instance to enter running state..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# 5. Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo ""
echo "=============================================="
echo "✅ ARGUS backend deployed!"
echo "=============================================="
echo ""
echo "EC2 Public IP:   $PUBLIC_IP"
echo "SSH Command:     ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo ""
echo "===== STEP-BY-STEP SETUP ====="
echo ""
echo "STEP 1 — SSH into the instance:"
echo "  ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo ""
echo "STEP 2 — Set your Gemini API key:"
echo '  sudo nano /etc/argus/.env'
echo "  -> Add: GEMINI_API_KEY=your_key_here"
echo ""
echo "STEP 3 — Restart the backend container:"
echo "  sudo systemctl restart docker"
echo "  # or just: docker restart argus-backend"
echo ""
echo "STEP 4 — Add DNS record in Vercel dashboard:"
echo "  Type: A     Name: argus     Value: ${PUBLIC_IP}     TTL: 60"
echo ""
echo "STEP 5 — Set Vercel project env vars:"
echo "  VITE_API_URL=https://argus.tanish.website"
echo ""
echo "STEP 6 — Deploy frontend to Vercel:"
echo "  cd argus-dashboard && vercel --prod"
echo ""
echo "STEP 7 — Verify deployment:"
echo "  curl https://argus.tanish.website/api/health"
echo ""
echo "=============================================="
echo "⚠️  Wait ~5 min for cloud-init to finish"
echo "   (Docker build compiles Lobster Trap binary)"
echo "=============================================="
