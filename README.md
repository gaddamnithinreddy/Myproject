# Firebase integration

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/nithins-projects-4468b81d/v0-firebase-integration)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/wEUK7hEIzVf)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Environment Setup

Before running this project, you need to set up your environment variables. Create a `.env.local` file in the root directory with the following variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here

# Email Service (if using external email service)
NEXT_PUBLIC_EMAIL_API_KEY=your_email_api_key_here
NEXT_PUBLIC_FROM_EMAIL=noreply@yourdomain.com
```

**Important Security Notes:**
- Never commit your `.env.local` file to version control
- The `.gitignore` file is configured to exclude all environment files
- Replace all placeholder values with your actual API keys and configuration
- For the Firebase service worker (`public/firebase-messaging-sw.js`), you'll need to replace the placeholder values with your actual Firebase configuration

## Deployment

Your project is live at:

**[https://vercel.com/nithins-projects-4468b81d/v0-firebase-integration](https://vercel.com/nithins-projects-4468b81d/v0-firebase-integration)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/wEUK7hEIzVf](https://v0.dev/chat/projects/wEUK7hEIzVf)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Firestore Composite Indexes Required

Some queries in this project require composite indexes. If you see a Firestore error about a missing index, click the link in the error message or create the following indexes in the Firebase Console:

- Collection: `tournaments`
  - Fields: `type` (asc), `status` (asc), `startDate` (asc)
  - Fields: `ownerId` (asc), `createdAt` (desc)
- Collection: `teams`
  - Fields: `memberIds` (array-contains), `createdAt` (desc)
- Collection: `chatRooms`
  - Fields: `participants` (array-contains), `lastMessage.timestamp` (desc)
- Collection: `messages`
  - Fields: `chatRoomId` (asc), `timestamp` (desc)

To create an index, go to the [Firestore Indexes page](https://console.firebase.google.com/project/_/firestore/indexes) and click "Add Index". Use the fields above as shown in the error message.

# KeyConnect Documentation

## Onboarding
- Welcome modal for new users (see /components/OnboardingModal.tsx)
- Tooltips for key features (see /components/Tooltip.tsx)
- Getting started guide in dashboard

## Admin Documentation
- Managing users, teams, tournaments
- Sending broadcast notifications
- Payment/refund management
- Bracket editing (see /tournaments/[id]/bracket/page.tsx)

## User Documentation
- Registration, profile, referrals
- Joining teams, tournaments
- Making payments
- Viewing brackets and schedules
- Uploading and watching videos (see /schedule/page.tsx)

## QA Checklist
- [ ] Registration and login flows
- [ ] Team and tournament management
- [ ] Schedule creation and RSVP
- [ ] Chat and notifications
- [ ] Payments and invoices
- [ ] Bracket management (see bracket page)
- [ ] Video upload/playback (see schedule page)
- [ ] Mobile and accessibility

## Bracket Management
- Visual bracket editor (admin, see bracket page)
- Real-time updates (Firestore listener)
- User bracket view

## Video Features
- Upload/record video for events (see schedule page)
- Video playback in schedule/tournament

## Polish & Optimization
- All new features have loading/skeleton states
- Mobile responsive and accessible
- Real-time updates for brackets

---

*For detailed setup and customization, see the code comments and TODOs in each feature file.*