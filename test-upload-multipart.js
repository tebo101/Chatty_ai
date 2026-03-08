const FormData = require('form-data');
const fetch = require('node-fetch'); // Using dynamic import or older node-fetch if available. We'll use the built in fetch if Node 18+

async function testUpload() {
    const form = new FormData();
    form.append('name', 'MultipartTest');
    form.append('personality', 'Testing multipart');

    try {
        const response = await fetch('http://localhost:3000/api/characters', {
            method: 'POST',
            body: form
        });
        const data = await response.json();
        console.log('Response:', response.status, data);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testUpload();
