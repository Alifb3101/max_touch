/**
 * Upload local product images to Supabase Storage
 * 
 * Usage:
 *   npx tsx scripts/upload-images-to-supabase.ts
 * 
 * This script:
 * 1. Reads all images from public/big and public/MT-2022
 * 2. Uploads them to Supabase Storage products bucket
 * 3. Generates SQL to update the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadDirectory(localDir: string, bucketPath: string) {
  const publicDir = join(process.cwd(), 'public', localDir);
  
  try {
    const files = await readdir(publicDir);
    console.log(`\n📁 Uploading from ${localDir}/ (${files.length} files)...`);
    
    for (const file of files) {
      if (!file.match(/\.(png|jpg|jpeg|webp|avif)$/i)) continue;
      
      const localPath = join(publicDir, file);
      const storagePath = `${bucketPath}/${file}`;
      
      try {
        const fileBuffer = await readFile(localPath);
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('products')
          .upload(storagePath, fileBuffer, {
            contentType: file.endsWith('.png') ? 'image/png' : 'image/jpeg',
            upsert: true, // Replace if exists
          });
        
        if (error) {
          console.error(`❌ Failed to upload ${storagePath}:`, error.message);
        } else {
          console.log(`✅ Uploaded ${storagePath}`);
        }
      } catch (err) {
        console.error(`❌ Error reading ${localPath}:`, err);
      }
    }
  } catch (err) {
    console.error(`❌ Cannot read directory ${publicDir}:`, err);
  }
}

async function main() {
  console.log('🚀 Starting image upload to Supabase Storage...\n');
  
  // Upload images
  await uploadDirectory('big', 'big');
  await uploadDirectory('MT-2022', 'MT-2022');
  
  console.log('\n✨ Upload complete!\n');
  console.log('📝 Next steps:');
  console.log('1. Run the following SQL in your Supabase SQL Editor to update the database:\n');
  console.log(`-- Update hero images (remove leading slash)
UPDATE products 
SET hero_image = substring(hero_image from 2)
WHERE hero_image LIKE '/%';

-- Update detail images (remove leading slash from JSON array)
UPDATE products 
SET detail_images = (
  SELECT json_agg(substring(value::text from 2))::jsonb
  FROM jsonb_array_elements_text(detail_images) AS value
  WHERE value::text LIKE '"%/%"'
)
WHERE detail_images::text LIKE '%"/%';
`);
  
  console.log('\n2. Verify in Supabase Dashboard:');
  console.log(`   ${supabaseUrl.replace('/v1', '')}/project/_/storage/buckets/products`);
}

main().catch(console.error);
