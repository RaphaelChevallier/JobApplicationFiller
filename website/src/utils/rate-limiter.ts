// Rate limiter for API operations
// Enforces:
// - Maximum 2 operations per second
// - Maximum 60 operations per minute

type RateLimiterConfig = {
  maxPerSecond: number;
  maxPerMinute: number;
  name: string;
};

type RateLimiterStatus = {
  allowed: boolean;
  reason?: string;
  nextAllowedTime?: Date;
};

class RateLimiter {
  private operationTimestamps: Date[] = [];
  private readonly config: RateLimiterConfig;
  
  constructor(config: RateLimiterConfig = { maxPerSecond: 2, maxPerMinute: 60, name: 'operation' }) {
    this.config = config;
  }
  
  canOperate(): RateLimiterStatus {
    const now = new Date();
    
    // Clean up old timestamps (older than 1 minute)
    this.operationTimestamps = this.operationTimestamps.filter(
      timestamp => now.getTime() - timestamp.getTime() <= 60000
    );
    
    // Check per-second limit
    const oneSecondAgo = new Date(now.getTime() - 1000);
    const operationsInLastSecond = this.operationTimestamps.filter(
      timestamp => timestamp >= oneSecondAgo
    ).length;
    
    if (operationsInLastSecond >= this.config.maxPerSecond) {
      // Calculate when the next operation will be allowed
      const oldestInSecond = this.operationTimestamps
        .filter(timestamp => timestamp >= oneSecondAgo)
        .sort((a, b) => a.getTime() - b.getTime())[0];
        
      const nextAllowedTime = new Date(oldestInSecond.getTime() + 1000);
      
      return {
        allowed: false,
        reason: `Too many ${this.config.name}s. Please wait a moment before trying again.`,
        nextAllowedTime
      };
    }
    
    // Check per-minute limit
    if (this.operationTimestamps.length >= this.config.maxPerMinute) {
      // Calculate when the next operation will be allowed
      const oldestTimestamp = this.operationTimestamps
        .sort((a, b) => a.getTime() - b.getTime())[0];
      
      const nextAllowedTime = new Date(oldestTimestamp.getTime() + 60000);
      
      return {
        allowed: false,
        reason: `You've reached the maximum number of ${this.config.name}s per minute. Please try again later.`,
        nextAllowedTime
      };
    }
    
    return { allowed: true };
  }
  
  recordOperation() {
    this.operationTimestamps.push(new Date());
  }
  
  /**
   * Helper method that combines checking and recording in one call
   * @returns Status object with allowed flag and reason if not allowed
   */
  checkAndRecord(): RateLimiterStatus {
    const status = this.canOperate();
    if (status.allowed) {
      this.recordOperation();
    }
    return status;
  }
}

// Create singleton instances for different operations
export const profileSaveRateLimiter = new RateLimiter({ 
  maxPerSecond: 2, 
  maxPerMinute: 60, 
  name: 'save' 
});

export const educationRateLimiter = new RateLimiter({
  maxPerSecond: 2,
  maxPerMinute: 60,
  name: 'education update'
});

export const fileUploadRateLimiter = new RateLimiter({
  maxPerSecond: 2,
  maxPerMinute: 60,
  name: 'file upload'
});

// Generic rate limiter for other operations
export const createRateLimiter = (name: string): RateLimiter => {
  return new RateLimiter({
    maxPerSecond: 2,
    maxPerMinute: 60,
    name
  });
};

export default RateLimiter; 