# GitHub Secrets — aurum-ops
# Settings → Secrets and variables → Actions → New repository secret
# Add these to BOTH repos: aurum + back-aurum
# ─────────────────────────────────────────────────────────────

AWS_OIDC_ROLE_ARN   # arn:aws:iam::123456789012:role/GitHubActionsAurumDeploy
                    # Output of: aws iam get-role --role-name GitHubActionsAurumDeploy --query Role.Arn

AWS_REGION          # us-east-1  (or whichever region your EC2 is in)

EC2_INSTANCE_ID     # i-xxxxxxxxxxxxxxxxx
                    # This NEVER changes on stop/start — it's the permanent identifier
                    # Find it: EC2 Console → Instances → Instance ID column

EC2_USER            # ubuntu  (or ec2-user for Amazon Linux)

EC2_SSH_KEY         # Full contents of your .pem private key file
                    # cat ~/.ssh/your-key.pem | pbcopy  → paste into secret
