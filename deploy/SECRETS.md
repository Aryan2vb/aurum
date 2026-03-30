# GitHub Secrets — Setup Reference
# ════════════════════════════════════════════════════════
# Add these in:
#   GitHub repo → Settings → Secrets and variables → Actions
# Both repos (aurum + back-aurum) need the EC2 secrets.
# ════════════════════════════════════════════════════════

# ── Shared (add to BOTH repos) ─────────────────────────

EC2_HOST          # Your EC2 public IP or domain (e.g. 54.123.45.67)
EC2_USER          # SSH login user  (e.g. ubuntu)
EC2_SSH_KEY       # Full contents of your .pem private key
                  # cat my-key.pem | pbcopy  → paste into secret

# ── aurum (frontend repo only) ─────────────────────────

GH_PAT            # GitHub Personal Access Token with repo scope
                  # Needed to checkout back-aurum during E2E tests
                  # Generate at: github.com/settings/tokens

CI_DATABASE_URL   # Supabase connection string for CI test runs
                  # e.g. postgresql://user:pass@db.xxx.supabase.co:5432/postgres?sslmode=require
CI_JWT_SECRET     # Any random string, only used during CI
                  # e.g. openssl rand -base64 32

# ── back-aurum (backend repo only) ─────────────────────

# (No extra secrets beyond the shared EC2 ones above)
# Jest integration tests use an ephemeral postgres service container,
# so no Supabase connection needed during backend CI.

# ════════════════════════════════════════════════════════
# EC2 .env file — lives at /opt/aurum/.env on the instance
# (NOT in GitHub — managed manually or via AWS Secrets Manager)
# ════════════════════════════════════════════════════════

DATABASE_URL      # postgresql://user:pass@db.xxx.supabase.co:5432/postgres?sslmode=require
JWT_SECRET        # openssl rand -base64 32
JWT_EXPIRES_IN    # 7d
VITE_API_URL      # https://yourdomain.com/api
