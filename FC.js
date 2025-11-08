// filepath: FC.js
require('dotenv').config(); // Load environment variables
const axios = require('axios');
const nodemailer = require('nodemailer');

// Environment variables (move secrets here)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fskpfvwlzustkomufdqx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN_FC; // Note: different for FC
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID_FC || '17841474389371860'; // Note: different for FC
const TABLE_NAME = process.env.TABLE_NAME_FC || 'maharashtra_pune_fc'; // Note: different for FC
const EMAIL_USER = process.env.EMAIL_USER; // e.g., your Gmail
const EMAIL_PASS = process.env.EMAIL_PASS; // App password for Gmail


/**
 * Safely parse JSON text. Returns defaultValue on parse failure.
 * @param {string} text
 * @param {*} defaultValue
 */
function safeJsonParse(text, defaultValue) {
  try {
    if (!text || typeof text !== 'string') return defaultValue;
    return JSON.parse(text);
  } catch (e) {
    console.log(`safeJsonParse failed: ${e} - input: ${String(text).slice(0,200)}`);
    return defaultValue;
  }
}

/**
 * Fetch confessions from Supabase table
 * @param {string} tableName - Name of the Supabase table
 * @returns {Array} Array of confession objects
 */
async function fetchConfessionsFromSupabase(tableName) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=sr_no,confession,timestamp,post_number,accept,reject,imagekit_url,is_posted&order=sr_no.asc`;
    const response = await axios.get(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.status !== 200) {
      console.log(`Error fetching from Supabase: ${response.status} - ${response.data}`);
      return [];
    }
    return response.data;
  } catch (e) {
    console.log(`Error in fetchConfessionsFromSupabase: ${e}`);
    return [];
  }
}

/**
 * Update confession posted status in Supabase
 * @param {string} tableName - Name of the Supabase table
 * @param {number} srNo - Serial number (primary key) of the confession
 * @param {boolean} isPosted - Whether to mark as posted (true) or unposted (false)
 * @returns {boolean} Success status
 */
async function updatePostedStatusInSupabase(tableName, srNo, isPosted) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?sr_no=eq.${srNo}`;
    const updateData = {
      is_posted: isPosted ? '✓' : null
    };

    const response = await axios.patch(url, updateData, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });
    const success = response.status >= 200 && response.status < 300;
    
    if (success) {
      console.log(`Successfully updated posted status for sr_no ${srNo} in ${tableName}`);
    } else {
      console.log(`Failed to update posted status for sr_no ${srNo}: ${response.status} - ${response.data}`);
    }
    
    return success;
  } catch (e) {
    console.log(`Error in updatePostedStatusInSupabase: ${e}`);
    return false;
  }
}


/**
 * Main function to be triggered every hour at minute 0 for Ferguson College
 */
async function postImagesToInstagramFC_Supabase() {
  // Restrict posting to 8am-1am only
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // No minute-of-hour restriction: posting allowed any minute within the allowed hours.
  // Allow posting between 8:00 (hour >= 8) and 01:59 (hour < 1) — wraps past midnight.
  if (!(hour >= 8 || hour < 1)) {
    console.log('Posting is allowed only between 8am and 1am. Current hour: ' + hour);
    return;
  }

  // Check Instagram content publishing limit before posting
  const limitUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/content_publishing_limit?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
  try {
    const limitRes = await axios.get(limitUrl);
    const limitJson = safeJsonParse(JSON.stringify(limitRes.data), null);
    if (
      !limitJson ||
      !limitJson.data ||
      !limitJson.data[0] ||
      typeof limitJson.data[0].quota_usage !== 'number'
    ) {
      console.log('Could not retrieve content publishing limit. Aborting posting.');
      return;
    }
    
    const quotaUsage = limitJson.data[0].quota_usage;
    const quota = (typeof limitJson.data[0].quota === 'number') ? limitJson.data[0].quota : 100;
    if (quotaUsage >= quota) {
      console.log(`Quota reached: ${quotaUsage}/${quota}. Skipping posting.`);
      return;
    }
  } catch (e) {
    console.log('Error checking quota:', e);
    return;
  }

  const confessions = await fetchConfessionsFromSupabase(TABLE_NAME);
  if (confessions.length === 0) {
    console.log('No confessions found in Supabase table. Skipping posting.');
    return;
  }

  console.log('Script started at: ' + new Date());
  let postsAttempted = 0;
  let postsSucceeded = 0;
  let lastPostTime = null;

  // Fixed maxPosts per run
  let maxPosts = 3; // fixed cap per run
  console.log(`Max posts this run: ${maxPosts}`);

  // Get eligible confessions and sort by priority
  const eligibleConfessions = [];
  for (let i = 0; i < confessions.length; i++) {
    const confession = confessions[i];
    if (confession.accept === '✓' && 
        confession.is_posted !== '✓' && 
        confession.imagekit_url && 
        confession.imagekit_url.trim() !== '') {
      eligibleConfessions.push({
        index: i,
        confession: confession,
        priority: confession.post_number || 999999 // Use post_number as priority, default to high number if empty
      });
    }
  }

  // Sort by sr_no ascending (oldest first)
  eligibleConfessions.sort((a, b) => a.confession.sr_no - b.confession.sr_no);

  console.log(`Found ${eligibleConfessions.length} eligible confessions, sorted by sr_no ascending`);

  for (let j = 0; j < eligibleConfessions.length; j++) {
    if (postsSucceeded >= maxPosts) {
      console.log(`Max cap of ${maxPosts} posts reached. Stopping further posting.`);
      break;
    }
    
    const eligibleConfession = eligibleConfessions[j];
    const confession = eligibleConfession.confession;
    const imageUrl = confession.imagekit_url;
    const caption = '#confession #confessions #confessionpage #confessionaccount #confessionpost #confessiontime #secretlove #secret #unrequitedlove #iloveyou #collegeromance #collegelife #collegeconfessions #collegecrush #campuslove #heartbreak #heartbroken #brokenheart #breakup #movingon #ferguson #fergussoncollege #fergussonians #fergussoncollegepune #heart #love';

    console.log(`Attempting to post sr_no ${confession.sr_no}: Image URL = ${imageUrl}`);

    // Step 1: Create media object
  const createMediaUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`;
    try {
      const mediaRes = await axios.post(createMediaUrl, {
        image_url: imageUrl,
        caption: caption,
        access_token: INSTAGRAM_ACCESS_TOKEN
      });
      const mediaJson = safeJsonParse(JSON.stringify(mediaRes.data), null);
      
      if (!mediaJson.id) {
        console.log(`Failed to create media for sr_no ${confession.sr_no}. Skipping.`);
        continue;
      }    // Step 2: Publish media
    const publishUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`;
    const publishRes = await axios.post(publishUrl, {
      creation_id: mediaJson.id,
      access_token: INSTAGRAM_ACCESS_TOKEN
    });
    const publishJson = safeJsonParse(JSON.stringify(publishRes.data), null);
    postsAttempted++;
    
    if (publishJson.id) {
      let marked = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          marked = await updatePostedStatusInSupabase(TABLE_NAME, confession.sr_no, true);
          if (marked) {
            console.log(`Successfully posted sr_no ${confession.sr_no}. Marked ✓ in is_posted column.`);
            break;
          }
        } catch (e) {
          console.log(`Failed to mark ✓ for sr_no ${confession.sr_no} (attempt ${attempt}): ${e}`);
          if (attempt < 5) {
            console.log('Waiting 5 seconds before retrying to mark ✓.');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (!marked) {
        console.log(`ALERT: Could not mark ✓ for sr_no ${confession.sr_no} after 5 attempts. Manual intervention needed.`);
        // Send email alert to admin
        try {
          const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
          });
          await transporter.sendMail({
            to: 'nakulgavhane@gmail.com',
            subject: `Confandler Instagram Posting ALERT: Could not mark ✓ for sr_no ${confession.sr_no}`,
            body: `The script failed to mark ✓ in is_posted column for sr_no ${confession.sr_no} (Image URL: ${imageUrl}) after 5 attempts.\nManual intervention is needed.\n\nTimestamp: ${new Date()}\nTable: ${TABLE_NAME}\nSupabase URL: ${SUPABASE_URL}`
          });
          console.log('Alert email sent to nakulgavhane@gmail.com');
        } catch (emailErr) {
          console.log('Failed to send alert email: ' + emailErr);
        }
      }
      postsSucceeded++;

      lastPostTime = new Date().getTime();
      } else {
        console.log(`Failed to publish media for sr_no ${confession.sr_no}.`);
      }      // Add 15 seconds delay after each successful post, except after the last one
      if (publishJson.id && postsSucceeded < maxPosts) {
        console.log('Waiting 3 seconds before next post.');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // After each post, re-check quota to avoid overposting
      try {
        const limitResLoop = await axios.get(limitUrl);
        const limitJsonLoop = safeJsonParse(JSON.stringify(limitResLoop.data), null);
        if (
          !limitJsonLoop ||
          !limitJsonLoop.data ||
          !limitJsonLoop.data[0] ||
          typeof limitJsonLoop.data[0].quota_usage !== 'number'
        ) {
          console.log('Could not retrieve content publishing limit in loop. Aborting further posting.');
          break;
        }
        const quotaUsageLoop = limitJsonLoop.data[0].quota_usage;
        const quotaLoop = (typeof limitJsonLoop.data[0].quota === 'number') ? limitJsonLoop.data[0].quota : 100;
        if (quotaUsageLoop >= quotaLoop) {
          console.log(`Quota reached during loop: ${quotaUsageLoop}/${quotaLoop}. Stopping further posting.`);
          break;
        }
      } catch (e) {
        console.log('Error re-checking quota:', e);
        break;
      }
    } catch (e) {
      console.log(`Error posting sr_no ${confession.sr_no}:`, e);
      continue;
    }
  }
  console.log(`Script finished at: ${new Date()}. Posts attempted: ${postsAttempted}, Posts succeeded: ${postsSucceeded}`);
}


/**
 * Count confessions ready to be posted for Ferguson College (accept=✓, is_posted!=✓, has imagekit_url)
 */
async function countReadyConfessionsFC_Supabase() {
  const confessions = await fetchConfessionsFromSupabase(TABLE_NAME);
  let readyCount = 0;
  
  for (let i = 0; i < confessions.length; i++) {
    const confession = confessions[i];
    if (confession.accept === '✓' && 
        confession.is_posted !== '✓' && 
        confession.imagekit_url && 
        confession.imagekit_url.trim() !== '') {
      readyCount++;
      const priority = confession.post_number || 999999;
      console.log(`Ready: sr_no ${confession.sr_no}, Priority: ${priority}, Image URL: ${confession.imagekit_url}`);
    }
  }
  console.log(`Total confessions ready to be posted for ${TABLE_NAME}: ${readyCount}`);
  return readyCount;
}


/**
 * Test function to get Instagram account's current rate limit usage for Ferguson College.
 */
async function testInstagramContentPublishingLimitFC_Supabase() {
  const limitUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/content_publishing_limit?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
  try {
    const limitRes = await axios.get(limitUrl);
    const limitJson = safeJsonParse(JSON.stringify(limitRes.data), null);
    console.log('Content publishing limit response: ' + JSON.stringify(limitJson));
    
    if (
      !limitJson ||
      !limitJson.data ||
      !limitJson.data[0] ||
      typeof limitJson.data[0].quota_usage !== 'number'
    ) {
      console.log('Could not retrieve content publishing limit.');
      return;
    }
    const quota = (typeof limitJson.data[0].quota === 'number') ? limitJson.data[0].quota : 100;
    console.log(`Quota usage: ${limitJson.data[0].quota_usage} / ${quota}`);
  } catch (e) {
    console.log('Error in test function:', e);
  }
}

// Export functions for use in other files
module.exports = {
  postImagesToInstagramFC_Supabase,
  countReadyConfessionsFC_Supabase,
  testInstagramContentPublishingLimitFC_Supabase
};
