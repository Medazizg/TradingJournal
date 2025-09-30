# Firebase Setup Guide for Trading Journal

This guide will help you set up Firebase Storage, Firestore, and security rules for your trading journal application.

## Prerequisites

1. Firebase CLI installed globally: `npm install -g firebase-tools`
2. Firebase project created at [Firebase Console](https://console.firebase.google.com)
3. Your project ID: `trading-journal-cb874`

## Firebase Services Configuration

### 1. Authentication
- Email/Password authentication is already configured
- Users can sign up and sign in to access their trading data

### 2. Firestore Database
- Document-based NoSQL database for storing:
  - Trades
  - Stock analyses
  - Trading reports
  - Portfolios
  - User settings

### 3. Firebase Storage
- File storage for:
  - Trade attachments (screenshots, documents)
  - Stock analysis charts and reports
  - User profile pictures
  - Backup files
  - Generated reports

## Security Rules

### Storage Rules (`storage.rules`)
The storage rules ensure that:
- Only authenticated users can access files
- Users can only access their own files
- File type and size restrictions are enforced
- Different limits for different file types:
  - Profile pictures: 2MB max
  - Trade images: 5MB max
  - Documents: 10MB max
  - Reports: 20MB max
  - Backups: 50MB max

### Firestore Rules (`firestore.rules`)
The Firestore rules ensure that:
- Only authenticated users can read/write data
- Users can only access their own trading data
- Data validation is enforced for all document types
- Public reports can be read by all authenticated users

## File Storage Structure

```
/users/{userId}/
  ├── trades/{tradeId}/
  │   ├── screenshot_001.png
  │   ├── analysis_report.pdf
  │   └── trade_confirmation.pdf
  ├── stocks/{stockSymbol}/
  │   ├── technical_analysis.png
  │   ├── fundamental_report.pdf
  │   └── news_articles.pdf
  ├── reports/{reportId}/
  │   ├── monthly_report.pdf
  │   ├── performance_chart.png
  │   └── summary.csv
  ├── backups/{backupId}/
  │   └── backup_20241225.json
  └── profile/
      └── profile_picture.jpg

/public/
  └── reports/{reportId}/
      ├── shared_analysis.pdf
      └── market_insights.png
```

## Deployment Instructions

### 1. Login to Firebase
```bash
firebase login
```

### 2. Initialize Firebase in your project
```bash
firebase init
```

Select the following services:
- ✅ Firestore: Configure security rules and indexes files
- ✅ Storage: Configure security rules file
- ✅ Hosting: Configure files for Firebase Hosting

### 3. Deploy Security Rules
```bash
# Deploy storage rules
firebase deploy --only storage

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### 4. Deploy the entire application
```bash
# Build the application
npm run build

# Deploy everything
firebase deploy
```

## Usage Examples

### Uploading Files

```typescript
import { tradingStorageService } from './services/tradingStorageService';

// Upload a trade screenshot
const tradeFile = event.target.files[0];
const attachment = await tradingStorageService.uploadTradeFile(
  userId, 
  tradeId, 
  tradeFile, 
  'Entry point screenshot'
);

// Upload stock analysis chart
const chartFile = event.target.files[0];
const stockAttachment = await tradingStorageService.uploadStockAnalysisFile(
  userId, 
  'AAPL', 
  chartFile, 
  'Technical analysis chart'
);
```

### Saving Trading Data

```typescript
import { tradingStorageService } from './services/tradingStorageService';

// Save a new trade
const trade: Trade = {
  id: crypto.randomUUID(),
  userId: user.uid,
  stockSymbol: 'AAPL',
  stockName: 'Apple Inc.',
  type: 'BUY',
  quantity: 100,
  price: 150.25,
  totalValue: 15025,
  date: new Date(),
  attachments: [attachment], // Files uploaded previously
  createdAt: new Date(),
  updatedAt: new Date()
};

await tradingStorageService.saveTrade(trade);
```

### Creating Backups

```typescript
// Create a complete backup of user's trading data
const backupUrl = await tradingStorageService.createBackup(userId);
console.log('Backup created:', backupUrl);
```

## File Type Support

### Supported Image Types
- JPEG/JPG
- PNG
- GIF
- WebP

### Supported Document Types
- PDF
- CSV
- Excel (.xls, .xlsx)

## Security Features

1. **Authentication Required**: All operations require user authentication
2. **User Isolation**: Users can only access their own data
3. **File Validation**: Files are validated for type and size before upload
4. **Secure URLs**: Download URLs are generated securely by Firebase
5. **Automatic Cleanup**: Failed uploads are automatically cleaned up

## Monitoring and Analytics

### Enable Firebase Analytics
1. Go to Firebase Console → Analytics
2. Enable Google Analytics for your project
3. Track file upload events and user engagement

### Storage Usage Monitoring
1. Monitor storage usage in Firebase Console
2. Set up billing alerts for storage costs
3. Implement cleanup policies for old files

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check if user is authenticated
   - Verify security rules are deployed
   - Ensure user has proper permissions

2. **File Upload Failed**
   - Check file size limits
   - Verify file type is supported
   - Ensure stable internet connection

3. **Storage Rules Not Working**
   - Deploy rules: `firebase deploy --only storage`
   - Check rules syntax in Firebase Console
   - Test rules in Firebase Console simulator

### Debug Commands

```bash
# Test security rules locally
firebase emulators:start

# Deploy specific services
firebase deploy --only storage
firebase deploy --only firestore:rules

# View logs
firebase functions:log
```

## Performance Optimization

1. **Image Compression**: Compress images before upload
2. **Lazy Loading**: Load files only when needed
3. **Caching**: Implement client-side caching for frequently accessed files
4. **CDN**: Firebase Storage automatically provides CDN distribution

## Backup and Recovery

1. **Automated Backups**: Implement regular backup creation
2. **Export Data**: Use Cloud Firestore export functionality
3. **Version Control**: Keep security rules in version control
4. **Disaster Recovery**: Have a plan for data recovery

## Cost Optimization

1. **Storage Classes**: Use appropriate storage classes for different file types
2. **Lifecycle Rules**: Implement automatic deletion of old files
3. **Compression**: Enable compression for large files
4. **Monitoring**: Set up billing alerts and usage monitoring

## Next Steps

1. Set up Firebase Cloud Functions for automated tasks
2. Implement push notifications for price alerts
3. Add real-time stock data integration
4. Create automated report generation
5. Set up data analytics and insights

For more information, visit the [Firebase Documentation](https://firebase.google.com/docs).
