# Registration and Authentication System Implementation

## Overview
This implementation provides a comprehensive authentication and verification system for CampusAffordHub with clear separation between buyers, sellers, and administrators.

## Key Features Implemented

### 1. Database Schema Updates
**File**: `shared/schema.ts`

#### Users Table Enhancements
- `userType`: Identifies user as buyer/seller/admin
- `whatsappNumber` & `isWhatsappVerified`: For seller WhatsApp OTP authentication
- `buyerIdScanUrl` & `buyerFaceScanUrl`: Buyer verification documents for checkout
- `buyerVerifiedAt`: Timestamp of buyer verification

#### Stores Table Enhancements
- `address`: Full address for seller location
- `latitude` & `longitude`: Geographic coordinates
- `shippingModes`: Array of available shipping options (seller_delivery, affordcampus_pickup, ems)
- `deliveryRadius`: Delivery range for seller's own delivery service

#### Orders Table Enhancements
- `shippingMode`: Selected shipping method
- `deliveryStatus`: Tracks delivery progress (pending, in_transit, delivered, rejected)
- `buyerConfirmation`: Buyer's acceptance status (received, rejected)
- `buyerConfirmationAt`: Timestamp of buyer confirmation
- `payoutStatus`: Seller payout status (pending, processed, cancelled)
- `payoutProcessedAt`: Timestamp of payout processing

#### OTP Codes Table Updates
- `phoneNumber`: For WhatsApp OTP storage
- `otpType`: Distinguishes between email and WhatsApp OTP

### 2. WhatsApp OTP Service
**File**: `server/whatsapp.ts`

A comprehensive WhatsApp OTP service with:
- Mock implementation for development (logs OTP to console)
- Production-ready integration templates for:
  - Twilio WhatsApp API
  - Green API
- Configurable service interface for easy provider switching

### 3. Backend API Endpoints

#### Authentication Routes
- `POST /api/auth/send-whatsapp-otp`: Send OTP to seller's WhatsApp
- `POST /api/auth/seller/register`: Register seller with WhatsApp OTP verification
- `POST /api/auth/login`: Updated to support WhatsApp OTP, email OTP, and email/password
- `POST /api/auth/admin/register`: Admin registration with email/password (no OTP)

#### Verification Routes
- `POST /api/upload/buyer-verification`: Upload buyer ID and face scan at checkout
- `POST /api/upload/verification`: Upload seller ID and face scan during registration

#### Order Management Routes
- `PUT /api/orders/:id/buyer-confirmation`: Buyer confirms product received or rejected
  - Sets payout status to pending (if received) or cancelled (if rejected)
  - Updates delivery status accordingly

### 4. Frontend Components

#### Verification Components
**Location**: `client/src/components/verification/`

##### IdScanCapture Component
- Captures government-issued ID documents
- Supports both camera capture and file upload
- Real-time preview with validation
- Max file size: 5MB
- Supported formats: JPEG, PNG, WebP

##### FacialCapture Component
- Captures selfie for facial verification
- Optimized for front-facing camera
- Real-time preview
- Guidelines for optimal capture (lighting, positioning, etc.)

#### Pages

##### Seller Authentication Page
**File**: `client/src/pages/seller-auth.tsx`

Complete seller onboarding flow:
1. WhatsApp number entry and OTP request
2. OTP verification
3. User information collection (name, email, university, etc.)
4. ID document upload
5. Selfie/face scan upload
6. Account creation and automatic verification document submission

##### Updated Checkout Page
**File**: `client/src/pages/checkout.tsx`

Enhanced checkout with buyer verification:
1. Check if buyer already verified (skip if yes)
2. ID document scan upload
3. Facial/selfie capture
4. Verification document submission
5. Proceed to payment

##### Mode Selection Updates
**File**: `client/src/pages/mode-selection.tsx`

Updated messaging to clarify:
- Buyers: ID verification at checkout only
- Sellers: WhatsApp OTP verification required

### 5. User Flows

#### Buyer Flow
```
Browse Products (No Auth) → Add to Cart → Checkout → 
ID & Face Verification → Payment → Order Placed →
Receive Product → Confirm Receipt/Rejection
```

#### Seller Flow
```
Select Seller Mode → WhatsApp OTP → Personal Info →
ID & Face Verification → Account Created → Create Store →
List Products → Receive Orders → Deliver Product →
Await Buyer Confirmation → Receive Payout
```

#### Admin Flow
```
Admin Registration Link → Email/Password → Dashboard Access
```

### 6. Security Measures

✅ **Rate Limiting**: Applied to all sensitive endpoints
- Authentication routes: 5 requests per 15 minutes
- API routes: 100 requests per 15 minutes
- Upload and verification routes: Protected with rate limiting

✅ **Authentication**: JWT-based with 7-day expiry

✅ **Input Validation**: Zod schemas for all user inputs

✅ **File Upload Security**:
- File type validation (images only)
- File size limits (5MB max)
- Secure filename generation

✅ **CodeQL Security Scan**: Passed with 0 alerts

## Configuration

### Environment Variables Required

```env
# WhatsApp OTP (Production)
# Option 1: Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Option 2: Green API
GREEN_API_INSTANCE_ID=your_instance_id
GREEN_API_TOKEN=your_token
```

### Database Migration

Run database migration to apply schema changes:
```bash
npm run db:push
```

## Production Deployment Checklist

- [ ] Replace mock WhatsApp OTP service with actual provider
  - Update `server/whatsapp.ts` to use production service
  - Configure provider credentials in environment variables
- [ ] Run database migrations
- [ ] Test WhatsApp OTP delivery
- [ ] Test buyer verification flow
- [ ] Test seller registration flow
- [ ] Verify payout workflow with buyer confirmations

## API Documentation

### Send WhatsApp OTP
```http
POST /api/auth/send-whatsapp-otp
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}
```

### Seller Registration
```http
POST /api/auth/seller/register
Content-Type: application/json

{
  "whatsappNumber": "+1234567890",
  "whatsappOtpCode": "123456",
  "email": "seller@example.com",
  "username": "sellerusername",
  "firstName": "John",
  "lastName": "Doe",
  "university": "University Name",
  "city": "City Name"
}
```

### Upload Buyer Verification
```http
POST /api/upload/buyer-verification
Authorization: Bearer {token}
Content-Type: multipart/form-data

buyerIdScan: (file)
buyerFaceScan: (file)
```

### Buyer Confirmation
```http
PUT /api/orders/:id/buyer-confirmation
Authorization: Bearer {token}
Content-Type: application/json

{
  "confirmation": "received" | "rejected"
}
```

## Testing Notes

### Manual Testing Scenarios

1. **Buyer Registration & Checkout**
   - Browse products without authentication ✓
   - Add items to cart
   - Proceed to checkout
   - Upload ID document
   - Take selfie
   - Complete payment

2. **Seller Registration**
   - Select seller mode
   - Enter WhatsApp number
   - Receive OTP (check console in dev mode)
   - Enter OTP
   - Fill personal information
   - Upload ID document
   - Take selfie
   - Account created

3. **Order Confirmation**
   - Place order as buyer
   - Seller marks as shipped
   - Buyer receives product
   - Buyer confirms receipt
   - Verify payout status updates

## Known Limitations & Future Enhancements

### Current Implementation
- WhatsApp OTP uses mock service in development
- Store creation form doesn't yet include shipping mode selection UI
- Delivery tracking dashboard UI not implemented

### Recommended Enhancements
1. Add shipping mode selection to store creation form
2. Build delivery tracking dashboard for buyers
3. Build order management dashboard for sellers with payout tracking
4. Add email notifications for order status changes
5. Implement admin panel for reviewing verification documents

## Support & Troubleshooting

### WhatsApp OTP Not Sending
- Verify provider credentials are correctly configured
- Check provider account status and quota
- Review server logs for error messages

### Verification Documents Not Uploading
- Check file size (max 5MB)
- Verify file format (JPEG, PNG, WebP only)
- Ensure uploads directory is writable

### TypeScript Errors
```bash
npm run check
```

### Database Issues
```bash
npm run db:push
```

## Files Modified/Created

### Backend
- `shared/schema.ts` - Database schema updates
- `server/storage.ts` - WhatsApp OTP storage methods
- `server/whatsapp.ts` - WhatsApp OTP service (new)
- `server/routes.ts` - New authentication and verification endpoints

### Frontend
- `client/src/components/verification/id-scan-capture.tsx` (new)
- `client/src/components/verification/facial-capture.tsx` (new)
- `client/src/components/verification/index.tsx` (new)
- `client/src/pages/seller-auth.tsx` (new)
- `client/src/pages/checkout.tsx` - Added verification step
- `client/src/pages/mode-selection.tsx` - Updated messaging
- `client/src/App.tsx` - Added seller-auth route

## Conclusion

This implementation provides a robust foundation for secure buyer/seller differentiation with appropriate verification at each step of the user journey. The system is production-ready pending WhatsApp OTP provider configuration.
