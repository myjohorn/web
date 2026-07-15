import os
import json
import requests
from datetime import datetime

# Profile to sync
MAX_POSTS = 4
OUTPUT_JSON = "data/instagram_posts.json"
IMAGE_DIR = "assets/instagram"

def clean_old_images(active_shortcodes):
    """Delete any images in the directory that are no longer in the active list."""
    if not os.path.exists(IMAGE_DIR):
        return
    for filename in os.listdir(IMAGE_DIR):
        if filename.endswith(".jpg"):
            shortcode = filename[:-4]
            if shortcode not in active_shortcodes:
                try:
                    os.remove(os.path.join(IMAGE_DIR, filename))
                    print(f"Removed old instagram image: {filename}")
                except Exception as e:
                    print(f"Failed to remove {filename}: {e}")

def main():
    # Make sure output directories exist
    os.makedirs(IMAGE_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)

    feed_url = os.environ.get("BEHOLD_FEED_URL")
    if not feed_url:
        print("Error: BEHOLD_FEED_URL environment variable is missing.")
        return

    print(f"Fetching Instagram posts from Behold API: {feed_url}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(feed_url, headers=headers, timeout=20)
        if not (200 <= response.status_code < 300):
            print(f"Failed to fetch Behold feed: HTTP {response.status_code}")
            return
        
        data = response.json()
    except Exception as e:
        print(f"Error fetching/parsing Behold JSON: {e}")
        return

    # Behold feed response could be an array of posts or an object containing a 'posts' array
    posts = []
    if isinstance(data, list):
        posts = data
    elif isinstance(data, dict):
        posts = data.get('posts', [])
        
    print(f"Found {len(posts)} posts in Behold feed.")

    posts_data = []
    active_shortcodes = []

    count = 0
    for post in posts:
        if count >= MAX_POSTS:
            break
        
        media_type = post.get('mediaType') or post.get('media_type', 'IMAGE')
        # Skip videos if they don't have a static image preview
        if media_type == 'VIDEO' and not (post.get('thumbnailUrl') or post.get('thumbnail_url')):
            continue

        # Get image URL (standard image or thumbnail)
        image_url = post.get('mediaUrl') or post.get('media_url') or post.get('thumbnailUrl') or post.get('thumbnail_url')
        if not image_url:
            continue

        permalink = post.get('permalink')
        if not permalink:
            continue

        # Extract shortcode from permalink
        shortcode = ""
        parts = permalink.strip('/').split('/')
        if 'p' in parts:
            idx = parts.index('p')
            if idx + 1 < len(parts):
                shortcode = parts[idx + 1]
        elif 'reel' in parts:
            idx = parts.index('reel')
            if idx + 1 < len(parts):
                shortcode = parts[idx + 1]

        if not shortcode:
            shortcode = post.get('id', f"post_{count}")

        caption = post.get('caption', '')
        likes = post.get('likes') or post.get('likeCount') or post.get('like_count') or 0

        # Parse timestamp
        timestamp_str = post.get('timestamp')
        date_str = ""
        if timestamp_str:
            try:
                t_str = timestamp_str.split('+')[0].replace('Z', '')
                dt = datetime.fromisoformat(t_str)
                date_str = dt.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                date_str = timestamp_str[:19].replace('T', ' ')
        else:
            date_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        image_filename = f"{shortcode}.jpg"
        image_path = os.path.join(IMAGE_DIR, image_filename)

        # Download image if it doesn't exist
        if not os.path.exists(image_path):
            try:
                img_resp = requests.get(image_url, headers=headers, stream=True, timeout=15)
                if img_resp.status_code == 200:
                    with open(image_path, 'wb') as f:
                        for chunk in img_resp.iter_content(1024):
                            f.write(chunk)
                    print(f"Downloaded image: {image_filename}")
                else:
                    print(f"Failed to download image: HTTP {img_resp.status_code}")
                    continue
            except Exception as e:
                print(f"Error downloading image for {shortcode}: {e}")
                continue
        else:
            print(f"Image already exists: {image_filename}")

        active_shortcodes.append(shortcode)
        
        posts_data.append({
            "shortcode": shortcode,
            "url": permalink,
            "image_local": f"assets/instagram/{image_filename}",
            "caption": caption,
            "date": date_str,
            "likes": likes
        })
        count += 1

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(posts_data, f, ensure_ascii=False, indent=2)
    print(f"Successfully wrote {len(posts_data)} posts to {OUTPUT_JSON}")

    clean_old_images(active_shortcodes)

if __name__ == "__main__":
    main()
