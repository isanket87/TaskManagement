require('dotenv').config();
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

async function test() {
    console.log("Testing R2 Connection...");
    console.log("Bucket:", process.env.R2_BUCKET_NAME);

    try {
        console.log("1. Testing ListObjects...");
        const list = await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME }));
        console.log("List SUCCESS. Items found:", list.Contents?.length || 0);
    } catch (err) {
        console.error("ListObjects FAILED:", err.name, err.message);
    }

    try {
        console.log("2. Testing PutObject...");
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: 'test/test-file.txt',
            Body: 'hello world',
            ContentType: 'text/plain'
        }));
        console.log("PutObject SUCCESS.");
    } catch (err) {
        console.error("PutObject FAILED:", err.name, err.message);
    }
}
test();
