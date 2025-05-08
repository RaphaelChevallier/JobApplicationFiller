// src/types/global.d.ts

// Define the shape of the Radar SDK object expected on the window
interface RadarSDK {
  initialize(publishableKey: string): void;
  // Use a more specific type for addresses if possible, otherwise any[] is okay
  autocomplete(options: { query: string; layers?: string[]; limit?: number }): Promise<{ addresses: any[] }>; 
  isInitialized(): boolean;
  // Add other Radar functions as needed
}

declare global {
  interface Window {
    Radar?: RadarSDK; // Make Radar optional on the window object
  }
} 