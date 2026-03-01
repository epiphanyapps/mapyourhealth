# Amplify Deployment Timeout Diagnosis

## Current Issue
- Deployment starts (Status = RUNNING)
- Takes >10 minutes and times out
- Seed Backend Data workflow fails

## Common Causes & Solutions

### 1. **Large Dependencies/Node Modules**
```bash
# Check size of dependencies
cd packages/backend && du -sh node_modules/
cd apps/mobile && du -sh node_modules/

# Solution: Add .amplifyignore to exclude large files
echo "node_modules" >> .amplifyignore  
echo "*.log" >> .amplifyignore
echo ".git" >> .amplifyignore
echo "coverage" >> .amplifyignore
```

### 2. **Slow CDK Bootstrap/Deploy**
The O&M data model changes might be causing slow CDK deployments.

**Check recent changes:**
- Issue #137: O&M data model with admin/mobile UI
- New database schemas and seed scripts  
- Multiple CloudFormation stacks

**Solution: Split deployment**
```yaml
# In amplify.yml - optimize build
version: 1
backend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID --verbose
```

### 3. **Memory/CPU Limits**
Current: `buildComputeType: STANDARD_8GB`

**Upgrade compute:**
```bash
aws amplify update-app \
  --app-id d3jl0ykn4qgj9r \
  --custom-rules '[{"source": "/<*>", "target": "/index.html", "status": "404-200"}]' \
  --build-spec '{
    "version": 1,
    "backend": {
      "phases": {
        "build": {
          "commands": ["npx ampx pipeline-deploy --branch main --app-id d3jl0ykn4qgj9r"]
        }
      }
    }
  }'
```

### 4. **Database Migration Issues**
O&M data seeding might be slow:

**Check seed scripts:**
```bash
ls -la packages/backend/data/
# Look for large seed files that might be timing out
```

### 5. **CloudWatch Logs**
Check deployment logs in console:
https://ca-central-1.console.aws.amazon.com/amplify/apps/d3jl0ykn4qgj9r/branches/main/deployments

Look for:
- CDK deployment steps taking >5 minutes
- Database connection timeouts  
- Large file transfers
- Memory issues

## Immediate Fix Applied
✅ Extended timeout from 10 minutes → 30 minutes
✅ Better error handling for cancelled deployments
✅ More detailed final status checking

## Next Steps
1. **Test the timeout fix first** - commit and trigger deployment
2. **Check CloudWatch logs** if still slow
3. **Optimize build if needed** - add .amplifyignore, upgrade compute
4. **Consider splitting** large deployments into phases