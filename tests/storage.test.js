const test = require('node:test');
const assert = require('node:assert/strict');
const { uploadImage } = require('../src/services/storage');

test('stores uploaded images as data URLs outside production when cloud storage is absent', async () => {
  const originalCloudinaryUrl = process.env.CLOUDINARY_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  delete process.env.CLOUDINARY_URL;
  process.env.NODE_ENV = 'test';

  try {
    const file = { mimetype: 'image/jpeg', buffer: Buffer.from('test image') };
    const image = await uploadImage(file);
    assert.equal(image.url, `data:image/jpeg;base64,${file.buffer.toString('base64')}`);
  } finally {
    if (originalCloudinaryUrl === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = originalCloudinaryUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('rejects image uploads in production when cloud storage is absent', async () => {
  const originalCloudinaryUrl = process.env.CLOUDINARY_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  delete process.env.CLOUDINARY_URL;
  process.env.NODE_ENV = 'production';

  try {
    await assert.rejects(uploadImage({
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test image')
    }), {
      message: 'Secure image storage is not configured.',
      status: 503
    });
  } finally {
    if (originalCloudinaryUrl === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = originalCloudinaryUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
