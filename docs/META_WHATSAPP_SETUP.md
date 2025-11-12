# Meta WhatsApp Business API Setup Guide

This guide will help you set up Meta for Developers WhatsApp Business API for OTP verification in CampusAffordHub.

## Prerequisites

- A Facebook Business Account
- A verified business on Facebook Business Manager
- A phone number for WhatsApp Business (cannot be used with regular WhatsApp)

## Step-by-Step Setup

### 1. Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Select **"Business"** as the app type
4. Fill in your app details:
   - App name: e.g., "CampusAffordHub"
   - Contact email: your email
   - Business account: select your business account
5. Click **"Create App"**

### 2. Add WhatsApp Product

1. In your app dashboard, scroll to **"Add Products to Your App"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Follow the setup wizard to:
   - Select or add a WhatsApp Business Account
   - Add a phone number (or use the test number provided)

### 3. Get Your Credentials

#### Phone Number ID

1. In the WhatsApp product dashboard, go to **"API Setup"**
2. You'll see your **"Phone number ID"** - copy this
3. Save it as `META_WHATSAPP_PHONE_NUMBER_ID` in your `.env` file

#### Access Token (Temporary - for testing)

1. In the same "API Setup" section, you'll see a **"Temporary access token"**
2. This token expires in 24 hours - use it only for initial testing

#### Permanent Access Token (for production)

1. Go to **Business Settings** (https://business.facebook.com/settings)
2. Navigate to **"Users" > "System Users"**
3. Click **"Add"** to create a new system user
4. Give it a name like "CampusAffordHub WhatsApp Service"
5. Assign the system user to your app with **"Admin"** access
6. Click **"Generate New Token"**
7. Select your app and check the following permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
8. Click **"Generate Token"** and copy it
9. Save it as `META_WHATSAPP_ACCESS_TOKEN` in your `.env` file

### 4. Configure Environment Variables

Add these to your `.env` file:

```env
META_WHATSAPP_PHONE_NUMBER_ID=123456789012345
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxx
META_WHATSAPP_API_VERSION=v18.0
```

### 5. Create WhatsApp Message Template (Optional but Recommended)

For better delivery rates, create a pre-approved message template:

1. In WhatsApp Manager, go to **"Message Templates"**
2. Click **"Create Template"**
3. Template details:
   - **Category**: Authentication
   - **Name**: `otp_verification`
   - **Languages**: English
   - **Body**: 
     ```
     Your CampusAffordHub verification code is {{1}}. This code is valid for 10 minutes. Do not share this code with anyone.
     ```
   - **Button**: Add a copy code button with the code {{1}}

4. Submit for approval (usually takes a few hours)

**Note**: If you don't create a template, the service will fall back to sending plain text messages, which requires business verification.

### 6. Business Verification (Required for Production)

To send messages to any phone number (not just test numbers):

1. In Meta Business Manager, go to **"Business Info"**
2. Click **"Start Verification"**
3. Provide required business documents:
   - Business registration documents
   - Tax ID or business license
   - Proof of address
4. Wait for approval (can take 1-5 business days)

### 7. Test Your Integration

1. Start your application:
   ```bash
   npm run dev
   ```

2. Try registering as a seller with a test phone number
3. Check console logs for success/error messages
4. Verify you receive the WhatsApp message

### 8. Test Numbers

During development, you can add test numbers:

1. In WhatsApp API Setup, scroll to **"To"** section
2. Click **"Manage phone number list"**
3. Add phone numbers you want to test with
4. These numbers will receive messages without business verification

## Troubleshooting

### Error: "Phone number not registered"

- Make sure your WhatsApp Business phone number is properly set up
- Check that the phone number ID is correct

### Error: "Access token expired"

- Generate a permanent access token instead of using the temporary one
- Follow the "Permanent Access Token" instructions above

### Error: "Template not found"

- The template name in code must match exactly (case-sensitive)
- Wait for template approval before using it
- Service will fall back to plain text if template fails

### Messages not being delivered

- Verify your business is approved
- Check that recipient phone numbers are in correct format (with country code)
- Add recipient numbers to test list if business not verified

### Error: "User's number is part of an experiment"

- This happens when the number is registered with regular WhatsApp
- Use a different phone number for WhatsApp Business
- Or disconnect the number from regular WhatsApp first

## Rate Limits

Meta WhatsApp Business API has the following limits:

- **Tier 1** (new accounts): 1,000 business-initiated conversations per day
- **Tier 2**: 10,000 per day
- **Tier 3**: 100,000 per day
- **Tier 4**: Unlimited

Tiers increase automatically based on:
- Phone number quality rating
- Message delivery success rate
- User feedback

## Costs

- **User-initiated conversations** (within 24h window): FREE
- **Business-initiated conversations**: 
  - Authentication templates: ~$0.005 - $0.02 per message (varies by country)
  - Marketing/utility templates: ~$0.01 - $0.05 per message

For OTP use case, most messages are user-initiated (free) since users request the OTP.

## Best Practices

1. **Use message templates** for better deliverability
2. **Keep messages concise** - users prefer short OTP messages
3. **Include validity period** - e.g., "Valid for 10 minutes"
4. **Don't spam** - respect rate limits and user preferences
5. **Handle errors gracefully** - implement retry logic with exponential backoff
6. **Monitor quality rating** - low ratings reduce your tier/limits
7. **Use webhooks** - to receive delivery status and user messages

## Additional Resources

- [Official Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhooks Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Business Verification](https://www.facebook.com/business/help/2058515294227817)

## Support

If you encounter issues:
1. Check the [Meta Developer Community](https://developers.facebook.com/community)
2. Review [WhatsApp Business API Status](https://developers.facebook.com/status/dashboard/)
3. Contact Meta Business Support through your Business Manager
