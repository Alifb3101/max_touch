/**
 * Fix MT-2022 product images by uploading to Supabase Storage
 * and updating database paths
 * 
 * Run: npx tsx scripts/fix-mt-2022-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes('PUT_YOUR')) {
  console.error('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
  console.error('Get it from: https://supabase.com/dashboard/project/nvnboyxhuqskjbjxyzwb/settings/api');
  console.error('Look for "service_role" key and add it to .env.local as:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=eyJ...\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function uploadImages() {
  console.log('🚀 Uploading MT-2022 images...\n');
  
  // 1. Upload hero image from /public/big/
  const bigDir = join(process.cwd(), 'public', 'big');
  const bigFile = 'MT-2022.png';
  const bigPath = join(bigDir, bigFile);
  
  try {
    const buffer = await readFile(bigPath);
    const { error } = await supabase.storage
      .from('products')
      .upload(`kits/big/mt-2022.png`, buffer, {
        contentType: 'image/png',
        upsert: true,
      });
    
    if (error) {
      console.error(`❌ Failed to upload hero image: ${error.message}`);
      return false;
    }
    console.log('✅ Uploaded kits/big/mt-2022.png');
  } catch (err: any) {
    console.error(`❌ Cannot read ${bigPath}: ${err.message}`);
    return false;
  }
  
  // 2. Upload detail frames from /public/MT-2022/
  const framesDir = join(process.cwd(), 'public', 'MT-2022');
  let uploaded = 0;
  
  try {
    const files = await readdir(framesDir);
    const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    
    console.log(`\n📸 Uploading ${imageFiles.length} detail frames...`);
    
    for (const file of imageFiles) {
      const localPath = join(framesDir, file);
      const storagePath = `kits/mt-2022/${file.toLowerCase()}`;
      
      try {
        const buffer = await readFile(localPath);
        const contentType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        const { error } = await supabase.storage
          .from('products')
          .upload(storagePath, buffer, {
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
  } catch (err: any) {
    console.error(`❌ Cannot read ${framesDir}: ${err.message}`);
    return false;
  }
  
  return uploaded > 0;
}

async function updateDatabase() {
  console.log('\n📝 Updating database...\n');
  
  // Get product ID
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('sku', 'MT-2022')
    .single();
  
  if (!product) {
    console.error('❌ Product MT-2022 not found');
    return false;
  }
  
  // Update main product images
  const { error: prodError } = await supabase
    .from('products')
    .update({
      image_url: 'kits/big/mt-2022.png',
      thumbnail_url: 'kits/big/mt-2022.png',
    })
    .eq('id', product.id);
  
  if (prodError) {
    console.error(`❌ Failed to update product: ${prodError.message}`);
    return false;
  }
  console.log('✅ Updated product hero image');
  
  // Get existing frame images
  const { data: frames } = await supabase
    .from('product_images')
    .select('id, url')
    .eq('product_id', product.id)
    .eq('kind', 'frame')
    .order('sort_order');
  
  if (!frames || frames.length === 0) {
    console.log('ℹ️  No frame images to update');
    return true;
  }
  
  // Update each frame URL
  for (const frame of frames) {
    const oldUrl = frame.url;
    // Convert /MT-2022/01.png -> kits/mt-2022/01.png
    const newUrl = oldUrl.replace('/MT-2022/', 'kits/mt-2022/').toLowerCase();
    
    const { error } = await supabase
      .from('product_images')
      .update({ url: newUrl })
      .eq('id', frame.id);
    
    if (error) {
      console.error(`   ❌ Failed to update ${oldUrl}: ${error.message}`);
    } else {
      console.log(`   ✅ ${oldUrl} → ${newUrl}`);
    }
  }
  
  return true;
}

async function main() {
  const uploaded = await uploadImages();
  
  if (!uploaded) {
    console.error('\n❌ Upload failed\n');
    process.exit(1);
  }
  
  const updated = await updateDatabase();
  
  if (!updated) {
    console.error('\n❌ Database update failed\n');
    process.exit(1);
  }
  
  console.log('\n✨ All done! MT-2022 images are now on Supabase Storage');
  console.log('🚀 Redeploy to Vercel to see the changes\n');
}

main().catch(console.error);
