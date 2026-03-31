# ─────────────────────────────────────────────────────────────
# AWS OIDC Setup for GitHub Actions — run these once via CLI
# Gives GitHub Actions temporary AWS credentials with no stored
# access keys. More secure than AWS_ACCESS_KEY_ID secrets.
# ─────────────────────────────────────────────────────────────

export AWS_PAGER=""

# ── Step 1: Create the OIDC Identity Provider (once per account) ──
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# ── Step 2: Create the IAM role trust policy ──────────────────
# Save this as trust-policy.json first, then run the command below.
# Replace YOUR_GITHUB_ORG and YOUR_REPO with your actual values.
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::533924338505:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:Aryan2vb/aurum:ref:refs/heads/main",
            "repo:Aryan2vb/aurum:environment:production",
            "repo:Aryan2vb/back-aurum:ref:refs/heads/main",
            "repo:Aryan2vb/back-aurum:environment:production"
          ]
        }
      }
    }
  ]
}
EOF

# ── Step 3: Create the role ───────────────────────────────────
aws iam create-role \
  --role-name GitHubActionsAurumDeploy \
  --assume-role-policy-document file:///tmp/trust-policy.json

# ── Step 4: Attach the minimal permission policy ──────────────
# This role can ONLY describe EC2 instances — nothing else.
cat > /tmp/ec2-describe-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DescribeInstancesOnly",
      "Effect": "Allow",
      "Action": "ec2:DescribeInstances",
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name GitHubActionsAurumDeploy \
  --policy-name EC2DescribeInstances \
  --policy-document file:///tmp/ec2-describe-policy.json

# ── Step 5: Get the Role ARN to paste into GitHub Secrets ─────
aws iam get-role \
  --role-name GitHubActionsAurumDeploy \
  --query "Role.Arn" \
  --output text

# ── GitHub Secrets to set ─────────────────────────────────────
# AWS_OIDC_ROLE_ARN  → output of Step 5 above
# AWS_REGION         → e.g. us-east-1
# EC2_INSTANCE_ID    → i-xxxxxxxxxxxxxxxxx  (never changes)
# EC2_USER           → ubuntu
# EC2_SSH_KEY        → contents of your .pem file
