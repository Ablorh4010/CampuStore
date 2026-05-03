#!/bin/bash

# Configuration
SERVICE_NAME="campustore"
REGION="europe-west1"
PROJECT_ID="chromatic-force-480509-j5"
CLOUDSQL_INSTANCE="chromatic-force-480509-j5:europe-west1:campus-db"

echo "🚀 Starting migration from App Engine to Cloud Run..."

# 1. Build the application
echo "📦 Building application..."
npm run build

# 2. Extract environment variables from app.yaml
echo "🔍 Extracting environment variables from app.yaml..."
# This is a bit hacky but works for simple app.yaml files
ENV_VARS=$(grep -A 20 "env_variables:" app.yaml | grep "  [A-Z_]*:" | sed 's/  //g' | tr '\n' ',' | sed 's/,$//')

# 3. Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --add-cloudsql-instances $CLOUDSQL_INSTANCE \
  --set-env-vars "$ENV_VARS" \
  --memory 1Gi \
  --cpu 1

echo "✅ Deployment complete!"
echo "🔗 Your service is running at: $(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')"

echo ""
echo "⚠️  Important Next Steps:"
echo "1. Verify the application is working correctly at the new URL."
echo "2. Update any DNS or frontend URLs to point to the new Cloud Run service."
echo "3. To stop App Engine costs, you can disable the App Engine application:"
echo "   gcloud app versions list"
echo "   gcloud app versions stop <version-id> --service=default"
echo "   (Or disable the entire app in the GCP Console under App Engine > Settings > Disable Application)"
