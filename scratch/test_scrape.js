// scratch/test_scrape.js
const fs = require('fs');
const html = fs.readFileSync('scratch/ddg_output.html', 'utf8');

const blocks = html.split('class="result results_links results_links_deep web-result ');
const results = [];

// Skip the first block because it's the header
for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  
  // Extract Title and URL
  const titleMatch = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
  // Extract Snippet
  const snippetMatch = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
  
  if (titleMatch) {
    let url = titleMatch[1];
    // Clean duckduckgo redirection URL if present:
    // e.g. //duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.pearsonvue.com...
    if (url.includes('uddg=')) {
      const parts = url.split('uddg=');
      if (parts[1]) {
        const rawUrl = parts[1].split('&')[0];
        url = decodeURIComponent(rawUrl);
      }
    }
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    
    const title = titleMatch[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
    const snippet = snippetMatch 
      ? snippetMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() 
      : '';
      
    results.push({ title, url, snippet });
  }
}

console.log('Parsed Results Count:', results.length);
console.log('First 5 Parsed Results:', JSON.stringify(results.slice(0, 5), null, 2));
