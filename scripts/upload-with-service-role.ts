/**
 * Upload images using Supabase Service Role key (bypasses RLS)
 * 
 * Add to .env.local temporarily:
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 
 * Find it at: https://supabase.com/dashboard/project/nvnboyxhuqskjbjxyzwb/settings/api
 * Under "Project API keys" → "service_role" → Click "Reveal" and copy
 * 
 * Run: npx tsx scripts/upload-with-service-role.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing credentials!');
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env.local');
  console.error('Find it at: https://supabase.com/dashboard/project/nvnboyxhuqskjbjxyzwb/settings/api');
  process.exit(1);
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function uploadDirectory(localDir: string, bucketPath: string) {
  const publicDir = join(process.cwd(), 'public', localDir);
  
  try {
    const files = await readdir(publicDir);
    const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp|avif)$/i.test(f));
    
    console.log(`\n📁 ${localDir}/ (${imageFiles.length} images)`);
    
    let uploaded = 0;
    for (const file of imageFiles) {
      const localPath = join(publicDir, file);
      const storagePath = `${bucketPath}/${file}`;
      
      try {
        const fileBuffer = await readFile(localPath);
        const contentType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        const { error } = await supabase.storage
          .from('products')
          .upload(storagePath, fileBuffer, {
            contentType,
            upsert: true,
          });
        
        if (error) {
          console.error(`   ❌ ${file}: ${error.message}`);
        } else {
          console.log(`   ✅ ${file}`);
          uploaded++;
        }
      } catch (err: any) {
        console.error(`   ❌ ${file}: ${err.message}`);
      }
    }
    
    return { total: imageFiles.length, uploaded };
  } catch (err: any) {
    console.error(`❌ Cannot read ${publicDir}: ${err.message}`);
    return { total: 0, uploaded: 0 };
  }
}

async function main() {
  console.log('🚀 Uploading images with Service Role key...');
  
  const results = {
    big: await uploadDirectory('big', 'big'),
    mt2022: await uploadDirectory('MT-2022', 'MT-2022'),
  };
  
  const totalUploaded = results.big.uploaded + results.mt2022.uploaded;
  const totalFiles = results.big.total + results.mt2022.total;
  
  console.log(`\n✨ Done! Uploaded ${totalUploaded}/${totalFiles} images\n`);
  
  if (totalUploaded > 0) {
    console.log('📝 Next: Update database paths by running this SQL:\n');
    console.log(`-- Update hero images
UPDATE products 
SET hero_image = substring(hero_image from 2)
WHERE hero_image LIKE '/%';

-- Update detail images  
UPDATE products 
SET detail_images = (
  SELECT json_agg(substring(value::text from 2, length(value::text)-2))::jsonb
  FROM jsonb_array_elements_text(detail_images) AS value
)
WHERE detail_images IS NOT NULL;
`);
    console.log('\n🔗 SQL Editor: https://supabase.com/dashboard/project/nvnboyxhuqskjbjxyzwb/sql/new');
  }
}

main().catch(console.error);
