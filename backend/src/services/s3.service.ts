/**
 * S3 Service for handling file uploads using Bun's built-in S3 client
 */
import { S3Client } from 'bun';


// Configuration for the S3 client
type S3Config = {
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  sessionToken?: string;
};


// Typed ACL values according to Bun documentation
type S3ACL = 
  | 'private'
  | 'public-read'
  | 'public-read-write'
  | 'aws-exec-read'
  | 'authenticated-read'
  | 'bucket-owner-read'
  | 'bucket-owner-full-control'
  | 'log-delivery-write';


export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private endpointUrl: string;


  constructor(config: S3Config) {
    console.log(config, "config")
    
    // Configure S3 client
    this.s3Client = new S3Client({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
    });
    
    this.bucket = config.bucket;
    
    // Configure endpoint URL for generating public URLs
    // If an endpoint is provided, use it
    if (config.endpoint) {
      this.endpointUrl = config.endpoint.startsWith('http') ? config.endpoint : `https://${config.endpoint}`;
    }
    // If no endpoint provided but region exists, use the regional S3 URL
    else if (config.region) {
      this.endpointUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
    }
    // Fallback warning if neither is provided
    else {
      console.warn('S3 endpoint URL could not be determined. URL construction might fail.');
      this.endpointUrl = '';
    }
  }


  public getBucketName(): string {
    return this.bucket;
  }


  /**
   * Upload a file to S3
   * @param file The file to upload
   * @param key The S3 object key (path/filename)
   * @param contentType Optional MIME type
   */
  async uploadFile(file: File | Blob, key: string, contentType?: string): Promise<string> {
    try {
      // Upload the file to S3
      await this.s3Client.write(key, file, {
        type: contentType || file.type
      });


      // Return the URL to the uploaded file
      const baseUrl = this.endpointUrl.endsWith('/') ? this.endpointUrl : `${this.endpointUrl}/`;
      return `${baseUrl}${this.bucket}/${key}`;
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to upload file to S3");
    }
  }


  /**
   * Delete a file from S3
   * @param keyOrUrl The S3 object key (path/filename) or full URL
   */
  async deleteFile(keyOrUrl: string): Promise<boolean> {
    try {
      let cleanKey = keyOrUrl;
      // Check if it's a full URL and try to extract the key
      if (keyOrUrl.startsWith('http')) {
        const urlParts = keyOrUrl.split('/');
        // Heuristic: find bucket name in URL and take content after it
        // This might need to be more robust depending on URL structures
        const bucketIndex = urlParts.findIndex(part => part === this.bucket);
        if (bucketIndex !== -1 && bucketIndex < urlParts.length -1) {
          cleanKey = urlParts.slice(bucketIndex + 1).join('/');
        } else {
          // If bucket not found or it's the last part, this might be an unparseable URL for key extraction
          // Or, it could be a key that coincidentally starts with http
          console.warn(`Could not reliably extract key from URL: ${keyOrUrl}. Attempting to delete as is.`);
        }
      }
      
      // Delete the file from S3
      await this.s3Client.delete(cleanKey);
      return true;
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to delete file from S3");
    }
  }


  /**
   * Get a presigned URL for downloading a file from S3
   * @param key The S3 object key (path/filename)
   * @param expiresIn Expiration time in seconds
   * @param acl Optional access control list value
   */
  getPresignedUrl(key: string, expiresIn = 3600, acl?: S3ACL): string {
    try {
      // Presign is synchronous, no need for await
      return this.s3Client.presign(key, {
        expiresIn, // in seconds
        acl
      });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to generate presigned URL");
    }
  }


  /**
   * Get a presigned URL for uploading a file to S3
   * @param key The S3 object key (path/filename)
   * @param expiresIn Expiration time in seconds
   * @param contentType MIME type of the file being uploaded
   */
  getPresignedUploadUrl(key: string, expiresIn = 3600, contentType = 'application/octet-stream'): string {
    try {
      // For uploads, we need to specify the HTTP method as PUT
      return this.s3Client.presign(key, {
        expiresIn, // in seconds
        method: 'PUT',
        type: contentType
      });
    } catch (error) {
      console.error("Error generating presigned upload URL:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to generate presigned upload URL");
    }
  }
}


// Create and export a singleton instance with environment variables
export const s3Service = new S3Service({
  region: process.env.AWS_DEFAULT_REGION || "eu-west-1",
  endpoint: process.env.AWS_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  sessionToken: process.env.AWS_SESSION_TOKEN,
  bucket: process.env.AWS_BUCKET_NAME || ""
});
