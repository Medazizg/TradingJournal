import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { storage, db } from '../firebase';
import { 
  Trade, 
  Stock, 
  FileAttachment, 
  TradingReport, 
  StockAnalysis,
  STORAGE_PATHS,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS
} from '../types/trading';

export class TradingStorageService {
  
  // File Upload Methods
  
  /**
   * Upload a file for a trade
   */
  async uploadTradeFile(
    userId: string, 
    tradeId: string, 
    file: File, 
    description?: string
  ): Promise<FileAttachment> {
    this.validateFile(file, 'trade');
    
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${STORAGE_PATHS.TRADES(userId, tradeId)}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    const attachment: FileAttachment = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
      downloadUrl,
      uploadedAt: new Date(),
      description
    };
    
    return attachment;
  }
  
  /**
   * Upload a stock analysis file
   */
  async uploadStockAnalysisFile(
    userId: string, 
    stockSymbol: string, 
    file: File, 
    description?: string
  ): Promise<FileAttachment> {
    this.validateFile(file, 'document');
    
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${STORAGE_PATHS.STOCKS(userId, stockSymbol)}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    const attachment: FileAttachment = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
      downloadUrl,
      uploadedAt: new Date(),
      description
    };
    
    return attachment;
  }
  
  /**
   * Upload a trading report file
   */
  async uploadReportFile(
    userId: string, 
    reportId: string, 
    file: File, 
    description?: string
  ): Promise<FileAttachment> {
    this.validateFile(file, 'report');
    
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${STORAGE_PATHS.REPORTS(userId, reportId)}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    const attachment: FileAttachment = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
      downloadUrl,
      uploadedAt: new Date(),
      description
    };
    
    return attachment;
  }
  
  /**
   * Upload user profile picture
   */
  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    if (!ALLOWED_FILE_TYPES.IMAGES.includes(file.type)) {
      throw new Error('Invalid file type. Only images are allowed for profile pictures.');
    }
    
    if (file.size > FILE_SIZE_LIMITS.PROFILE_IMAGE) {
      throw new Error('File size too large. Maximum size is 2MB for profile pictures.');
    }
    
    const fileName = `profile_${Date.now()}_${file.name}`;
    const storagePath = `${STORAGE_PATHS.PROFILE(userId)}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    const uploadResult = await uploadBytes(storageRef, file);
    return await getDownloadURL(uploadResult.ref);
  }
  
  // File Management Methods
  
  /**
   * Delete a file from storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  }
  
  /**
   * Get file metadata
   */
  async getFileMetadata(storagePath: string) {
    const storageRef = ref(storage, storagePath);
    return await getMetadata(storageRef);
  }
  
  /**
   * List all files in a directory
   */
  async listFiles(directoryPath: string): Promise<FileAttachment[]> {
    const storageRef = ref(storage, directoryPath);
    const listResult = await listAll(storageRef);
    
    const files: FileAttachment[] = [];
    
    for (const itemRef of listResult.items) {
      const metadata = await getMetadata(itemRef);
      const downloadUrl = await getDownloadURL(itemRef);
      
      files.push({
        id: crypto.randomUUID(),
        fileName: itemRef.name,
        fileType: metadata.contentType || 'unknown',
        fileSize: metadata.size || 0,
        storagePath: itemRef.fullPath,
        downloadUrl,
        uploadedAt: metadata.timeCreated ? new Date(metadata.timeCreated) : new Date(),
      });
    }
    
    return files;
  }
  
  // Firestore Data Methods
  
  /**
   * Save trade to Firestore
   */
  async saveTrade(trade: Trade): Promise<void> {
    const tradeData = {
      ...trade,
      date: Timestamp.fromDate(trade.date),
      createdAt: Timestamp.fromDate(trade.createdAt),
      updatedAt: Timestamp.fromDate(trade.updatedAt),
    };
    
    await setDoc(doc(db, 'trades', trade.id), tradeData);
  }
  
  /**
   * Get trade from Firestore
   */
  async getTrade(tradeId: string): Promise<Trade | null> {
    const tradeDoc = await getDoc(doc(db, 'trades', tradeId));
    
    if (!tradeDoc.exists()) {
      return null;
    }
    
    const data = tradeDoc.data();
    return {
      ...data,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Trade;
  }
  
  /**
   * Get all trades for a user
   */
  async getUserTrades(userId: string, limitCount?: number): Promise<Trade[]> {
    const tradesRef = collection(db, 'trades');
    let q = query(
      tradesRef, 
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        date: data.date.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Trade;
    });
  }
  
  /**
   * Save stock analysis
   */
  async saveStockAnalysis(analysis: StockAnalysis): Promise<void> {
    const analysisData = {
      ...analysis,
      createdAt: Timestamp.fromDate(analysis.createdAt),
      updatedAt: Timestamp.fromDate(analysis.updatedAt),
    };
    
    await setDoc(doc(db, 'stockAnalyses', analysis.id), analysisData);
  }
  
  /**
   * Save trading report
   */
  async saveTradingReport(report: TradingReport): Promise<void> {
    const reportData = {
      ...report,
      startDate: Timestamp.fromDate(report.startDate),
      endDate: Timestamp.fromDate(report.endDate),
      createdAt: Timestamp.fromDate(report.createdAt),
      updatedAt: Timestamp.fromDate(report.updatedAt),
    };
    
    await setDoc(doc(db, 'tradingReports', report.id), reportData);
  }
  
  // Backup Methods
  
  /**
   * Create a backup of user's trading data
   */
  async createBackup(userId: string): Promise<string> {
    const trades = await this.getUserTrades(userId);
    const backupData = {
      userId,
      trades,
      createdAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const backupJson = JSON.stringify(backupData, null, 2);
    const backupFile = new Blob([backupJson], { type: 'application/json' });
    
    const backupId = crypto.randomUUID();
    const fileName = `backup_${Date.now()}.json`;
    const storagePath = `${STORAGE_PATHS.BACKUPS(userId, backupId)}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    await uploadBytes(storageRef, backupFile);
    return await getDownloadURL(storageRef);
  }
  
  // Utility Methods
  
  /**
   * Validate file before upload
   */
  private validateFile(file: File, context: 'trade' | 'document' | 'report' | 'profile'): void {
    let allowedTypes: string[];
    let maxSize: number;
    
    switch (context) {
      case 'trade':
        allowedTypes = [...ALLOWED_FILE_TYPES.IMAGES, ...ALLOWED_FILE_TYPES.DOCUMENTS];
        maxSize = FILE_SIZE_LIMITS.TRADE_IMAGE;
        break;
      case 'document':
        allowedTypes = ALLOWED_FILE_TYPES.DOCUMENTS;
        maxSize = FILE_SIZE_LIMITS.DOCUMENT;
        break;
      case 'report':
        allowedTypes = ALLOWED_FILE_TYPES.DOCUMENTS;
        maxSize = FILE_SIZE_LIMITS.REPORT;
        break;
      case 'profile':
        allowedTypes = ALLOWED_FILE_TYPES.IMAGES;
        maxSize = FILE_SIZE_LIMITS.PROFILE_IMAGE;
        break;
      default:
        throw new Error('Invalid context');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new Error(`File size too large. Maximum size is ${maxSizeMB}MB.`);
    }
  }
  
  /**
   * Generate unique filename
   */
  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${random}.${extension}`;
  }
}

// Export singleton instance
export const tradingStorageService = new TradingStorageService();
