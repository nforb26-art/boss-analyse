const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

(async () => {
  try {
    const snapshotPage = 'https://www.tradingview.com/x/kgS0kk6c';

    console.log('Fetching snapshot page...');
    const pageResp = await axios.get(snapshotPage, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = pageResp.data;

    const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (!m) {
      console.error('Could not find og:image on snapshot page.');
      process.exit(1);
    }

    const imageUrl = m[1];
    console.log('Found image URL:', imageUrl);

    console.log('Downloading image...');
    const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const outPath = path.join(__dirname, 'tmp_snapshot.png');
    fs.writeFileSync(outPath, Buffer.from(imgResp.data));
    console.log('Saved image to', outPath);

    console.log('Sending image to local analyzer...');
    const form = new FormData();
    form.append('chart', fs.createReadStream(outPath));

    const resp = await axios.post('http://localhost:3000/api/analyze-chart', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Analysis response:');
    console.log(JSON.stringify(resp.data, null, 2));

    fs.writeFileSync(path.join(__dirname, 'last_analysis.json'), JSON.stringify(resp.data, null, 2));
    console.log('Saved analysis to last_analysis.json');

    process.exit(0);
  } catch (err) {
    if (err.response) {
      console.error('Server response error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
})();
