// scratch/test_api_scrape.js
const url = 'http://localhost:3000/api/admin/scrape';
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'venkateshvelamuri5@gmail.com',
    password: 'admin123'
  })
})
.then(async res => {
  console.log('Response status:', res.status);
  const data = await res.json();
  console.log('Response data:', JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
