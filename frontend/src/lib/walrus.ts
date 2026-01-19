// frontend/src/lib/walrus.ts

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_EPOCHS = 5; // Store for 5 epochs (~5 days on testnet)

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
    };
  };
  alreadyCertified?: {
    blobId: string;
    event: {
      txDigest: string;
    };
  };
}

/**
 * Upload data to Walrus
 * @param data - The data to upload (Uint8Array)
 * @returns The blob ID (string)
 */
export async function uploadToWalrus(data: Uint8Array): Promise<string> {
  try {
    console.log(`📤 Uploading ${data.length} bytes to Walrus...`);
    
    const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=${WALRUS_EPOCHS}`, {
      method: 'PUT',
      body: data,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walrus upload failed (${response.status}): ${errorText}`);
    }

    const result: WalrusUploadResponse = await response.json();
    
    let blobId: string;
    if (result.newlyCreated?.blobObject?.blobId) {
      blobId = result.newlyCreated.blobObject.blobId;
      console.log(`✅ Uploaded new blob: ${blobId}`);
    } else if (result.alreadyCertified?.blobId) {
      blobId = result.alreadyCertified.blobId;
      console.log(`✅ Blob already exists: ${blobId}`);
    } else {
      console.error('Invalid Walrus response:', result);
      throw new Error('Invalid Walrus response: no blob ID found');
    }

    return blobId;
  } catch (error) {
    console.error('❌ Walrus upload error:', error);
    throw error;
  }
}

/**
 * Download data from Walrus
 * @param blobId - The blob ID to download
 * @returns The data (Uint8Array)
 */
export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  try {
    console.log(`📥 Downloading blob ${blobId} from Walrus...`);
    
    const response = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);
    
    if (!response.ok) {
      throw new Error(`Walrus download failed (${response.status}): ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    console.log(`✅ Downloaded ${data.length} bytes`);
    return data;
  } catch (error) {
    console.error('❌ Walrus download error:', error);
    throw error;
  }
}

/**
 * Check if a blob exists on Walrus
 */
export async function checkBlobExists(blobId: string): Promise<boolean> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
